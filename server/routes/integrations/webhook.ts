// Generic webhook adapter. The one HTTP endpoint that n8n, Make.com, custom
// chatbots — anything that can POST JSON — can drive a Copilot conversation
// through. Under the hood it delegates to the same engine + launch helpers
// that the public REST API uses; the adapter just handles conversation↔session
// mapping, per-integration persona, and an optional autoLaunch shortcut.

import type { Express, Response } from "express";
import { Router } from "express";
import crypto from "crypto";
import { db } from "../../db";
import { integrations, aiChatSessions } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { storage } from "../../storage";
import { runCopilotTurn } from "../../replit_integrations/copilot/engine";
import {
  launchTenderFromDraft,
  CompanyNotVerifiedError,
  MarketplaceValidationError,
} from "../../lib/launch-tender";
import { authenticateApiKey, requireScope } from "../../middleware/api-key";
import type { AuthRequest } from "../../middleware/auth-types";
import { takeToken } from "../../lib/rate-limit";
import { lookupIdempotent, storeIdempotent } from "../../lib/idempotency";
import { getTenantSecret, TenantSecretKey } from "../../lib/tenant-env";
import { logIntegrationEvent } from "../../lib/integration-logs";

const MAX_MESSAGE_BYTES = 8 * 1024;
const RATE_LIMIT_CAPACITY = 30;
const RATE_LIMIT_PER_MINUTE = 30;
const SESSION_TITLE_PREFIX = "WEBHOOK";

function sessionTitle(integrationId: string, conversationId: string): string {
  return `${SESSION_TITLE_PREFIX}:${integrationId}:${conversationId}`;
}

async function findOrCreateConversationSession(opts: {
  companyId: string;
  userId: string;
  integrationId: string;
  conversationId: string;
}) {
  const title = sessionTitle(opts.integrationId, opts.conversationId);
  const existing = await db
    .select()
    .from(aiChatSessions)
    .where(and(eq(aiChatSessions.companyId, opts.companyId), eq(aiChatSessions.title, title)))
    .limit(1);
  if (existing.length > 0) return existing[0];

  return await storage.createAiChatSession({
    userId: opts.userId,
    companyId: opts.companyId,
    title,
    tenderData: {},
  });
}

function enforceRateLimit(req: AuthRequest, res: Response): boolean {
  if (!req.auth?.apiKeyId) return true;
  const result = takeToken(`apiKey:${req.auth.apiKeyId}`, {
    capacity: RATE_LIMIT_CAPACITY,
    refillPerMinute: RATE_LIMIT_PER_MINUTE,
  });
  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSeconds));
    res.status(429).json({
      message: "Rate limit exceeded for this API key",
      retryAfterSeconds: result.retryAfterSeconds,
    });
    return false;
  }
  return true;
}

async function loadEnabledWebhookIntegration(integrationId: string, companyId: string) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, integrationId), eq(integrations.companyId, companyId)))
    .limit(1);
  if (!integration) return { integration: null, error: { status: 404, message: "Integration not found" } as const };
  if (integration.channel !== "webhook") {
    return { integration: null, error: { status: 404, message: "Integration not found" } as const };
  }
  if (!integration.enabled) {
    return { integration: null, error: { status: 403, message: "Integration disabled" } as const };
  }
  return { integration, error: null };
}

function signResponse(companyId: string, body: unknown): string | null {
  const secret = getTenantSecret(companyId, TenantSecretKey.WebhookHmacSecret);
  if (!secret) return null;
  return `sha256=${crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex")}`;
}

export function registerWebhookAdapter(app: Express): void {
  const r = Router();

  // POST /integrations/webhook/:integrationId — send a message, get a reply
  r.post(
    "/webhook/:integrationId",
    authenticateApiKey,
    requireScope("copilot:chat"),
    async (req: AuthRequest, res: Response) => {
      const startedAt = Date.now();
      try {
        if (!enforceRateLimit(req, res)) {
          logIntegrationEvent({
            companyId: req.auth!.activeCompanyId!,
            integrationId: req.params.integrationId,
            apiKeyId: req.auth?.apiKeyId,
            action: "message",
            status: "rate_limited",
            latencyMs: Date.now() - startedAt,
          });
          return;
        }

        const companyId = req.auth?.activeCompanyId;
        if (!companyId) return res.status(400).json({ message: "No active company" });

        const { integration, error } = await loadEnabledWebhookIntegration(
          req.params.integrationId,
          companyId,
        );
        if (error) {
          logIntegrationEvent({
            companyId,
            integrationId: req.params.integrationId,
            apiKeyId: req.auth?.apiKeyId,
            action: "message",
            status: "4xx",
            errorCode: error.message,
            latencyMs: Date.now() - startedAt,
          });
          return res.status(error.status).json({ message: error.message });
        }

        const { conversationId, message, idempotencyKey } = req.body ?? {};
        if (typeof conversationId !== "string" || !conversationId.trim()) {
          return res.status(400).json({ message: "`conversationId` is required" });
        }
        if (typeof message !== "string" || !message.trim()) {
          return res.status(400).json({ message: "`message` is required" });
        }
        if (Buffer.byteLength(message, "utf8") > MAX_MESSAGE_BYTES) {
          logIntegrationEvent({
            companyId,
            integrationId: integration!.id,
            apiKeyId: req.auth?.apiKeyId,
            action: "message",
            status: "4xx",
            errorCode: "MESSAGE_TOO_LARGE",
            requestBytes: Buffer.byteLength(message, "utf8"),
            latencyMs: Date.now() - startedAt,
          });
          return res.status(413).json({ message: `Message too large (max ${MAX_MESSAGE_BYTES} bytes)` });
        }

        const cached = lookupIdempotent("webhook:message", conversationId.trim(), idempotencyKey);
        if (cached) {
          const sig = signResponse(companyId, cached);
          if (sig) res.setHeader("X-BidCore-Signature", sig);
          res.setHeader("X-Idempotent-Replay", "true");
          logIntegrationEvent({
            companyId,
            integrationId: integration!.id,
            apiKeyId: req.auth?.apiKeyId,
            action: "message",
            status: "idempotent_replay",
            latencyMs: Date.now() - startedAt,
          });
          return res.json(cached);
        }

        const session = await findOrCreateConversationSession({
          companyId,
          userId: req.auth!.userId,
          integrationId: integration!.id,
          conversationId: conversationId.trim(),
        });

        const company = await storage.getCompany(companyId);
        const companyData = company
          ? { name: company.name, category: (company as any).category, city: (company as any).city, bio: (company as any).bio }
          : undefined;

        const priorMessages = await storage.getAiChatMessages(session.id);
        const chatHistory = priorMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const config = integration!.config || {};
        const persona = typeof config.persona === "string" ? config.persona : undefined;
        const language = config.defaultLanguage === "ar" ? "ar" : "en";

        const result = await runCopilotTurn({
          message,
          companyData,
          chatHistory,
          tenderDraft: session.tenderData ?? {},
          language,
          persona,
        });

        await storage.createAiChatMessage({
          sessionId: session.id,
          role: "user",
          content: message,
        });
        await storage.createAiChatMessage({
          sessionId: session.id,
          role: "assistant",
          content: result.message,
          suggestions: result.suggestions,
          tenderData: result.tenderData,
        });
        await storage.updateAiChatSession(session.id, { tenderData: result.mergedDraft });

        let tenderUrl: string | null = null;
        let validationErrors: string[] | null = null;

        // Caller may also need tender:create scope if autoLaunch is on. Fail
        // cleanly if scope missing instead of creating a half-baked tender.
        if (result.readyToLaunch && config.autoLaunch && company) {
          const scopes = req.auth?.scopes || [];
          if (!scopes.includes("tender:create")) {
            validationErrors = ["missing_scope:tender:create"];
          } else {
            try {
              const launchResult = await launchTenderFromDraft(
                result.mergedDraft,
                {
                  company: { id: company.id, verificationStatus: company.verificationStatus },
                  user: { id: req.auth!.userId },
                  source: "webhook",
                  integrationId: integration!.id,
                  apiKeyId: req.auth?.apiKeyId,
                  sessionId: session.id,
                },
                { language },
              );
              tenderUrl = launchResult.tenderUrl;
              await storage.updateAiChatSession(session.id, { tenderId: launchResult.tender.id });
            } catch (launchErr) {
              if (launchErr instanceof CompanyNotVerifiedError) {
                validationErrors = ["company_not_verified"];
              } else if (launchErr instanceof MarketplaceValidationError) {
                validationErrors = [`marketplace_invalid:${launchErr.message}`];
              } else {
                console.error("[webhook] auto-launch failed:", launchErr);
                validationErrors = ["launch_failed"];
              }
            }
          }
        } else if (result.validation?.failures?.length) {
          validationErrors = result.validation.failures;
        }

        const responseBody = {
          reply: result.message,
          suggestions: result.suggestions,
          ready: result.readyToLaunch,
          tenderUrl,
          validationErrors,
        };

        const sig = signResponse(companyId, responseBody);
        if (sig) res.setHeader("X-BidCore-Signature", sig);

        storeIdempotent("webhook:message", conversationId.trim(), idempotencyKey, responseBody);
        res.json(responseBody);

        logIntegrationEvent({
          companyId,
          integrationId: integration!.id,
          apiKeyId: req.auth?.apiKeyId,
          sessionId: session.id,
          action: "message",
          status: "ok",
          requestBytes: Buffer.byteLength(message, "utf8"),
          responseBytes: Buffer.byteLength(JSON.stringify(responseBody), "utf8"),
          latencyMs: Date.now() - startedAt,
          requestPreview: message,
          responsePreview: result.message,
        });
      } catch (err) {
        console.error("[webhook] error:", err);
        res.status(500).json({ message: "Internal error" });
        logIntegrationEvent({
          companyId: req.auth?.activeCompanyId || "",
          integrationId: req.params.integrationId,
          apiKeyId: req.auth?.apiKeyId,
          action: "error",
          status: "5xx",
          errorCode: err instanceof Error ? err.message.slice(0, 64) : "unknown",
          latencyMs: Date.now() - startedAt,
        });
      }
    },
  );

  // POST /integrations/webhook/:integrationId/launch — explicitly launch the tender
  // for a given conversation. Used when autoLaunch is off (caller controls timing).
  r.post(
    "/webhook/:integrationId/launch",
    authenticateApiKey,
    requireScope("tender:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!enforceRateLimit(req, res)) return;

        const companyId = req.auth?.activeCompanyId;
        if (!companyId) return res.status(400).json({ message: "No active company" });

        const { integration, error } = await loadEnabledWebhookIntegration(
          req.params.integrationId,
          companyId,
        );
        if (error) return res.status(error.status).json({ message: error.message });

        const { conversationId, idempotencyKey } = req.body ?? {};
        if (typeof conversationId !== "string" || !conversationId.trim()) {
          return res.status(400).json({ message: "`conversationId` is required" });
        }

        const cached = lookupIdempotent("webhook:launch", conversationId.trim(), idempotencyKey);
        if (cached) {
          res.setHeader("X-Idempotent-Replay", "true");
          return res.status(201).json(cached);
        }

        const title = sessionTitle(integration!.id, conversationId.trim());
        const [session] = await db
          .select()
          .from(aiChatSessions)
          .where(and(eq(aiChatSessions.companyId, companyId), eq(aiChatSessions.title, title)))
          .limit(1);

        if (!session) {
          return res.status(404).json({ message: "Conversation not found — send at least one message first" });
        }

        const draft = (session.tenderData ?? {}) as Record<string, any>;
        if (!draft || Object.keys(draft).length === 0) {
          return res
            .status(409)
            .json({ message: "Conversation has no tender draft to launch", validationErrors: ["empty_draft"] });
        }

        const company = await storage.getCompany(companyId);
        if (!company) return res.status(404).json({ message: "Company not found" });

        const config = integration!.config || {};
        const language = config.defaultLanguage === "ar" ? "ar" : "en";

        try {
          const launchResult = await launchTenderFromDraft(
            draft,
            {
              company: { id: company.id, verificationStatus: company.verificationStatus },
              user: { id: req.auth!.userId },
              source: "webhook",
              integrationId: integration!.id,
              apiKeyId: req.auth?.apiKeyId,
              sessionId: session.id,
            },
            { language },
          );
          await storage.updateAiChatSession(session.id, { tenderId: launchResult.tender.id });

          const responseBody = {
            tenderId: launchResult.tender.id,
            tenderUrl: launchResult.tenderUrl,
            invitationToken: launchResult.invitationToken,
          };
          storeIdempotent("webhook:launch", conversationId.trim(), idempotencyKey, responseBody);
          res.status(201).json(responseBody);
          logIntegrationEvent({
            companyId,
            integrationId: integration!.id,
            apiKeyId: req.auth?.apiKeyId,
            sessionId: session.id,
            action: "launch",
            status: "ok",
            responseBytes: Buffer.byteLength(JSON.stringify(responseBody), "utf8"),
            responsePreview: launchResult.tenderUrl,
          });
        } catch (launchErr) {
          if (launchErr instanceof CompanyNotVerifiedError) {
            return res.status(403).json({ message: launchErr.message, requiresVerification: true });
          }
          if (launchErr instanceof MarketplaceValidationError) {
            return res.status(400).json({ message: launchErr.message });
          }
          if (launchErr && typeof launchErr === "object" && (launchErr as any).name === "ZodError") {
            return res.status(409).json({
              message: "Tender draft is not ready to launch",
              validationErrors: (launchErr as any).errors ?? [],
            });
          }
          throw launchErr;
        }
      } catch (err) {
        console.error("[webhook] launch error:", err);
        res.status(500).json({ message: "Internal error" });
      }
    },
  );

  app.use("/integrations", r);
}
