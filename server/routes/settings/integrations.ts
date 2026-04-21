// Admin CRUD for API keys + integrations, backing the Settings → Integrations
// page. Everything here is JWT-only and admin-gated: customers use these
// endpoints from the logged-in web UI to manage their own integration config.
// The actual usage of those keys/integrations happens on the public /api/v1,
// /integrations/webhook/*, and /mcp surfaces.

import type { Express, Response, RequestHandler } from "express";
import { Router } from "express";
import { db } from "../../db";
import { apiKeys, integrations, integrationLogs, type Integration } from "@shared/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
import { generateApiKey, ALL_SCOPES } from "../../lib/api-keys";
import type { AuthRequest } from "../../middleware/auth-types";

interface MiddlewareDeps {
  authenticateToken: RequestHandler;
  requireCompanyContext: RequestHandler;
  requireCompanyRole: (minRole: "owner" | "admin" | "member" | "viewer") => RequestHandler;
}

export function registerIntegrationsAdminRoutes(app: Express, deps: MiddlewareDeps): void {
  const { authenticateToken, requireCompanyContext, requireCompanyRole } = deps;
  const adminGate = [authenticateToken, requireCompanyContext, requireCompanyRole("admin")];

  const r = Router();

  // ---- API keys -----------------------------------------------------------

  // GET /api/api-keys — list current company's keys (never returns the raw key)
  r.get("/api-keys", ...adminGate, async (req: AuthRequest, res: Response) => {
    try {
      const rows = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.companyId, req.auth!.activeCompanyId!), isNull(apiKeys.revokedAt)))
        .orderBy(desc(apiKeys.createdAt));
      res.json(
        rows.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          scopes: k.scopes,
          createdBy: k.createdBy,
          createdAt: k.createdAt,
          lastUsedAt: k.lastUsedAt,
        })),
      );
    } catch (err) {
      console.error("[admin/integrations] list keys error:", err);
      res.status(500).json({ message: "Failed to list API keys" });
    }
  });

  // POST /api/api-keys — create a new key (returns the raw key EXACTLY ONCE)
  r.post("/api-keys", ...adminGate, async (req: AuthRequest, res: Response) => {
    try {
      const { name, scopes } = req.body ?? {};
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "`name` is required" });
      }
      const requestedScopes = Array.isArray(scopes)
        ? scopes.filter((s: unknown): s is string => typeof s === "string" && ALL_SCOPES.includes(s as any))
        : [];
      if (requestedScopes.length === 0) {
        return res.status(400).json({ message: "At least one scope is required" });
      }

      const generated = await generateApiKey();
      const [row] = await db
        .insert(apiKeys)
        .values({
          companyId: req.auth!.activeCompanyId!,
          name: name.trim(),
          prefix: generated.prefix,
          hashedKey: generated.hashedKey,
          scopes: requestedScopes,
          createdBy: req.auth!.userId,
        })
        .returning();

      res.status(201).json({
        id: row.id,
        name: row.name,
        prefix: row.prefix,
        scopes: row.scopes,
        createdAt: row.createdAt,
        // Raw key is returned ONCE, here, and never stored in plaintext.
        rawKey: generated.raw,
      });
    } catch (err) {
      console.error("[admin/integrations] create key error:", err);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  // DELETE /api/api-keys/:id — revoke a key (soft delete)
  r.delete("/api-keys/:id", ...adminGate, async (req: AuthRequest, res: Response) => {
    try {
      const result = await db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.id, req.params.id), eq(apiKeys.companyId, req.auth!.activeCompanyId!), isNull(apiKeys.revokedAt)))
        .returning();
      if (result.length === 0) return res.status(404).json({ message: "API key not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/integrations] revoke key error:", err);
      res.status(500).json({ message: "Failed to revoke API key" });
    }
  });

  // ---- Integrations -------------------------------------------------------

  function serializeIntegration(row: Integration) {
    return {
      id: row.id,
      channel: row.channel,
      name: row.name,
      config: row.config,
      externalIdentifier: row.externalIdentifier,
      enabled: row.enabled,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  // GET /api/integrations
  r.get("/integrations", ...adminGate, async (req: AuthRequest, res: Response) => {
    try {
      const rows = await db
        .select()
        .from(integrations)
        .where(eq(integrations.companyId, req.auth!.activeCompanyId!))
        .orderBy(desc(integrations.createdAt));
      res.json(rows.map(serializeIntegration));
    } catch (err) {
      console.error("[admin/integrations] list error:", err);
      res.status(500).json({ message: "Failed to list integrations" });
    }
  });

  // POST /api/integrations
  r.post("/integrations", ...adminGate, async (req: AuthRequest, res: Response) => {
    try {
      const { channel, name, config, externalIdentifier } = req.body ?? {};
      const ALLOWED_CHANNELS = new Set(["webhook", "mcp"]);
      if (typeof channel !== "string" || !ALLOWED_CHANNELS.has(channel)) {
        return res.status(400).json({ message: "`channel` must be 'webhook' or 'mcp'" });
      }
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "`name` is required" });
      }

      const [row] = await db
        .insert(integrations)
        .values({
          companyId: req.auth!.activeCompanyId!,
          channel,
          name: name.trim(),
          config: config && typeof config === "object" ? config : {},
          externalIdentifier: typeof externalIdentifier === "string" && externalIdentifier.trim()
            ? externalIdentifier.trim()
            : null,
          createdBy: req.auth!.userId,
        })
        .returning();

      res.status(201).json(serializeIntegration(row));
    } catch (err) {
      console.error("[admin/integrations] create error:", err);
      res.status(500).json({ message: "Failed to create integration" });
    }
  });

  // PATCH /api/integrations/:id
  r.patch("/integrations/:id", ...adminGate, async (req: AuthRequest, res: Response) => {
    try {
      const { name, config, enabled, externalIdentifier } = req.body ?? {};
      const updates: Partial<Integration> = { updatedAt: new Date() };
      if (typeof name === "string" && name.trim()) updates.name = name.trim();
      if (config && typeof config === "object") updates.config = config;
      if (typeof enabled === "boolean") updates.enabled = enabled;
      if (typeof externalIdentifier === "string") {
        updates.externalIdentifier = externalIdentifier.trim() || null;
      } else if (externalIdentifier === null) {
        updates.externalIdentifier = null;
      }

      const result = await db
        .update(integrations)
        .set(updates)
        .where(and(eq(integrations.id, req.params.id), eq(integrations.companyId, req.auth!.activeCompanyId!)))
        .returning();
      if (result.length === 0) return res.status(404).json({ message: "Integration not found" });
      res.json(serializeIntegration(result[0]));
    } catch (err) {
      console.error("[admin/integrations] update error:", err);
      res.status(500).json({ message: "Failed to update integration" });
    }
  });

  // GET /api/integrations/:id/logs — recent activity for this integration
  r.get("/integrations/:id/logs", ...adminGate, async (req: AuthRequest, res: Response) => {
    try {
      // Ownership check via the integration row.
      const [integration] = await db
        .select()
        .from(integrations)
        .where(and(eq(integrations.id, req.params.id), eq(integrations.companyId, req.auth!.activeCompanyId!)))
        .limit(1);
      if (!integration) return res.status(404).json({ message: "Integration not found" });

      const rows = await db
        .select()
        .from(integrationLogs)
        .where(eq(integrationLogs.integrationId, req.params.id))
        .orderBy(desc(integrationLogs.createdAt))
        .limit(50);
      res.json(rows);
    } catch (err) {
      console.error("[admin/integrations] list logs error:", err);
      res.status(500).json({ message: "Failed to list logs" });
    }
  });

  // DELETE /api/integrations/:id
  r.delete("/integrations/:id", ...adminGate, async (req: AuthRequest, res: Response) => {
    try {
      const result = await db
        .delete(integrations)
        .where(and(eq(integrations.id, req.params.id), eq(integrations.companyId, req.auth!.activeCompanyId!)))
        .returning();
      if (result.length === 0) return res.status(404).json({ message: "Integration not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/integrations] delete error:", err);
      res.status(500).json({ message: "Failed to delete integration" });
    }
  });

  app.use("/api", r);
}
