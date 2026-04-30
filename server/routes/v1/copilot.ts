// Public Copilot REST API. Accepts either a user JWT or a per-tenant API key.
// Internally shares the same engine, tender-mapping, and launch helpers as the
// in-app SSE route — the difference is that responses are non-streaming JSON
// and session state is held server-side (so external callers don't need to
// manage chat history).

import type { Express, Response } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { db } from "../../db";
import { aiChatMessages, aiChatSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { runCopilotTurn } from "../../replit_integrations/copilot/engine";
import {
  launchTenderFromDraft,
  CompanyNotVerifiedError,
  MarketplaceValidationError,
} from "../../lib/launch-tender";
import { authenticateApiKeyOrJwt, requireScope } from "../../middleware/api-key";
import type { AuthRequest } from "../../middleware/auth-types";
import { takeToken } from "../../lib/rate-limit";
import { lookupIdempotent, storeIdempotent } from "../../lib/idempotency";
import { getTenantSecret, TenantSecretKey } from "../../lib/tenant-env";

const MAX_MESSAGE_BYTES = 8 * 1024;
const RATE_LIMIT_CAPACITY = 30;
const RATE_LIMIT_PER_MINUTE = 30;

function enforceRateLimit(req: AuthRequest, res: Response): boolean {
  // Only throttle API-key callers; JWT users hit the normal app quotas.
  if (req.auth?.authMethod !== "api_key" || !req.auth.apiKeyId) return true;
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
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  return true;
}

async function loadSessionForTenant(sessionId: string, companyId: string) {
  const session = await storage.getAiChatSession(sessionId);
  if (!session) return null;
  if (session.companyId !== companyId) return null;
  return session;
}

export function registerCopilotV1Routes(app: Express): void {
  const r = Router();

  // POST /api/v1/copilot/sessions — create a new session
  r.post("/sessions", authenticateApiKeyOrJwt, async (req: AuthRequest, res: Response) => {
    try {
      const companyId = req.auth?.activeCompanyId;
      if (!companyId) {
        return res.status(400).json({ message: "No active company on this auth context" });
      }

      const MAX_SESSIONS_PER_USER = 100;
      const existing = await storage.getAiChatSessions(req.auth!.userId, companyId);
      if (existing.length >= MAX_SESSIONS_PER_USER) {
        return res.status(409).json({
          message: `Session limit (${MAX_SESSIONS_PER_USER}) reached. Delete old sessions before creating new ones.`,
          limit: MAX_SESSIONS_PER_USER,
        });
      }

      const { name, tenderData, metadata } = req.body ?? {};
      const session = await storage.createAiChatSession({
        userId: req.auth!.userId,
        companyId,
        title: typeof name === "string" && name.trim() ? name.trim() : "External Copilot session",
        tenderData: tenderData ?? {},
      });

      res.status(201).json({
        sessionId: session.id,
        createdAt: session.createdAt,
        metadata: metadata ?? null,
      });
    } catch (err) {
      console.error("[v1/copilot] create session error:", err);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // GET /api/v1/copilot/sessions/:id — session state (debugging)
  r.get("/sessions/:id", authenticateApiKeyOrJwt, async (req: AuthRequest, res: Response) => {
    const companyId = req.auth?.activeCompanyId;
    if (!companyId) {
      return res.status(400).json({ message: "No active company on this auth context" });
    }
    const session = await loadSessionForTenant(req.params.id, companyId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const messages = await storage.getAiChatMessages(session.id);
    res.json({
      sessionId: session.id,
      tenderDraft: session.tenderData ?? {},
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        suggestions: m.suggestions,
        tenderData: m.tenderData,
        createdAt: m.createdAt,
      })),
    });
  });

  // POST /api/v1/copilot/sessions/:id/messages — send a user message, get the agent's reply
  r.post(
    "/sessions/:id/messages",
    authenticateApiKeyOrJwt,
    requireScope("copilot:chat"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!enforceRateLimit(req, res)) return;

        const companyId = req.auth?.activeCompanyId;
        if (!companyId) {
          return res.status(400).json({ message: "No active company on this auth context" });
        }

        const session = await loadSessionForTenant(req.params.id, companyId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        const message = typeof req.body?.message === "string" ? req.body.message : "";
        if (!message.trim()) {
          return res.status(400).json({ message: "`message` is required" });
        }
        if (Buffer.byteLength(message, "utf8") > MAX_MESSAGE_BYTES) {
          return res
            .status(413)
            .json({ message: `Message too large (max ${MAX_MESSAGE_BYTES} bytes)` });
        }

        const idempotencyKey = typeof req.body?.idempotencyKey === "string" ? req.body.idempotencyKey : undefined;
        const cached = lookupIdempotent("message", session.id, idempotencyKey);
        if (cached) {
          res.setHeader("X-Idempotent-Replay", "true");
          return res.json(cached);
        }

        const company = await storage.getCompany(companyId);
        const companyData = company
          ? { name: company.name, category: (company as any).category, city: (company as any).city, bio: (company as any).bio }
          : undefined;

        const priorMessages = await storage.getAiChatMessages(session.id);
        const chatHistory = priorMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const tenantKey = getTenantSecret(companyId, TenantSecretKey.OpenAIApiKey);
        const result = await runCopilotTurn({
          message,
          companyData,
          chatHistory,
          tenderDraft: session.tenderData ?? {},
          apiKey: tenantKey,
        });

        // Persist turn + draft atomically so a mid-sequence failure doesn't
        // leave an orphaned user message with no assistant reply.
        await db.transaction(async (tx) => {
          await tx.insert(aiChatMessages).values({
            sessionId: session.id,
            role: "user",
            content: message,
          });
          await tx.insert(aiChatMessages).values({
            sessionId: session.id,
            role: "assistant",
            content: result.message,
            suggestions: result.suggestions,
            tenderData: result.tenderData,
          });
          await tx
            .update(aiChatSessions)
            .set({ tenderData: result.mergedDraft, updatedAt: new Date() })
            .where(eq(aiChatSessions.id, session.id));
        });

        const responseBody = {
          reply: result.message,
          suggestions: result.suggestions,
          tenderDraft: result.mergedDraft,
          readyToLaunch: result.readyToLaunch,
          ...(result.validation ? { validation: result.validation } : {}),
        };
        storeIdempotent("message", session.id, idempotencyKey, responseBody);
        res.json(responseBody);
      } catch (err) {
        console.error("[v1/copilot] message error:", err);
        res.status(500).json({ message: "Failed to process message" });
      }
    },
  );

  // POST /api/v1/copilot/sessions/:id/launch — create the tender from the session draft
  r.post(
    "/sessions/:id/launch",
    authenticateApiKeyOrJwt,
    requireScope("tender:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!enforceRateLimit(req, res)) return;

        const companyId = req.auth?.activeCompanyId;
        if (!companyId) {
          return res.status(400).json({ message: "No active company on this auth context" });
        }

        const session = await loadSessionForTenant(req.params.id, companyId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        const idempotencyKey = typeof req.body?.idempotencyKey === "string" ? req.body.idempotencyKey : undefined;
        const cached = lookupIdempotent("launch", session.id, idempotencyKey);
        if (cached) {
          res.setHeader("X-Idempotent-Replay", "true");
          return res.status(201).json(cached);
        }

        const draft = (session.tenderData ?? {}) as Record<string, any>;
        if (!draft || Object.keys(draft).length === 0) {
          return res.status(409).json({
            message: "Session has no tender draft to launch",
            validationErrors: ["empty_draft"],
          });
        }

        const company = await storage.getCompany(companyId);
        if (!company) return res.status(404).json({ message: "Company not found" });

        // Revalidate company role against the DB for both JWT and API-key
        // callers. If a key's creator is demoted from admin after issuance,
        // the key should stop being able to create tenders.
        const currentRole = await storage.getUserRoleInCompany(req.auth!.userId, companyId);
        if (currentRole !== "admin" && currentRole !== "owner") {
          return res.status(403).json({ message: "Admin role required to launch tenders" });
        }

        const source: "api_key" | "webhook" | "mcp" | "web" =
          req.auth?.authMethod === "api_key" ? "api_key" : "web";

        const result = await launchTenderFromDraft(
          draft,
          {
            company: { id: company.id, verificationStatus: company.verificationStatus },
            user: { id: req.auth!.userId },
            source,
            apiKeyId: req.auth?.apiKeyId,
            sessionId: session.id,
          },
          {
            language: (draft.language === "ar" || draft.language === "en") ? draft.language : undefined,
          },
        );

        // Link the session to the created tender for traceability.
        await storage.updateAiChatSession(session.id, {
          tenderId: result.tender.id,
        });

        const responseBody = {
          tenderId: result.tender.id,
          tenderUrl: result.tenderUrl,
          invitationToken: result.invitationToken,
        };
        storeIdempotent("launch", session.id, idempotencyKey, responseBody);
        res.status(201).json(responseBody);
      } catch (err) {
        if (err instanceof CompanyNotVerifiedError) {
          return res.status(403).json({ message: err.message, requiresVerification: true });
        }
        if (err instanceof MarketplaceValidationError) {
          return res.status(400).json({ message: err.message });
        }
        if (err && typeof err === "object" && (err as any).name === "ZodError") {
          return res.status(409).json({
            message: "Tender draft is not ready to launch",
            validationErrors: (err as any).errors ?? [],
          });
        }
        console.error("[v1/copilot] launch error:", err);
        res.status(500).json({ message: "Failed to launch tender" });
      }
    },
  );

  app.use("/api/v1/copilot", r);
}
