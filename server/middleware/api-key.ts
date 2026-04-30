// Authenticate a request using an API key, attaching the same req.auth shape
// that the JWT middleware produces. Also exposes a small `requireScope`
// helper so individual routes can gate on specific scopes (e.g. 'copilot:chat').

import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { apiKeys, companies, users } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { storage } from "../storage";
import { extractKeyPrefix, verifyApiKey, type ApiKeyScope } from "../lib/api-keys";
import type { AuthRequest, JWTPayload } from "./auth-types";

// Hard-fail at startup if JWT_SECRET is missing — a literal default would let
// anyone forge JWTs in any environment where the env var was forgotten.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  throw new Error(
    "JWT_SECRET env var is required and must be at least 16 characters",
  );
}
const JWT_SECRET = process.env.JWT_SECRET;

function readApiKeyHeader(req: AuthRequest): string | null {
  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey.trim()) return xApiKey.trim();
  if (Array.isArray(xApiKey) && xApiKey[0]) return xApiKey[0].trim();

  const authHeader = req.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("ApiKey ")) {
    return authHeader.slice("ApiKey ".length).trim();
  }
  return null;
}

export async function authenticateApiKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = readApiKeyHeader(req);
  if (!raw) {
    res.status(401).json({ message: "API key required" });
    return;
  }

  const prefix = extractKeyPrefix(raw);
  if (!prefix) {
    res.status(401).json({ message: "Malformed API key" });
    return;
  }

  const candidates = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt)));

  let matched: typeof apiKeys.$inferSelect | undefined;
  for (const candidate of candidates) {
    if (await verifyApiKey(raw, candidate.hashedKey)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    res.status(401).json({ message: "Invalid API key" });
    return;
  }

  // Resolve the creator user + company — needed for audit writes and company
  // role gates downstream.
  const [creator] = await db.select().from(users).where(eq(users.id, matched.createdBy));
  const [company] = await db.select().from(companies).where(eq(companies.id, matched.companyId));

  if (!creator || !company) {
    res.status(401).json({ message: "API key references a missing user or company" });
    return;
  }

  req.auth = {
    userId: creator.id,
    activeCompanyId: company.id,
    roleInCompany: "admin", // API keys are issued by company admins and inherit admin-equivalent access
    isAdmin: creator.isAdmin,
    authMethod: "api_key",
    apiKeyId: matched.id,
    scopes: matched.scopes,
  };

  // Fire-and-forget lastUsedAt update. Don't await — the caller should not
  // pay for a write round-trip on every authenticated request.
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, matched.id))
    .catch((err) => console.error("[api-key] failed to update lastUsedAt:", err));

  next();
}

/**
 * Combined auth: accepts either an API key (X-Api-Key or Authorization: ApiKey)
 * or a JWT (Authorization: Bearer). Produces the same req.auth shape either way.
 * Used by public v1 routes so a logged-in user and an external integration can
 * hit the same endpoints.
 */
export async function authenticateApiKeyOrJwt(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (readApiKeyHeader(req)) {
    return authenticateApiKey(req, res, next);
  }

  const authHeader = req.headers["authorization"];
  const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    res.status(401).json({ message: "Authentication required (API key or JWT)" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const user = await storage.getUser(payload.userId);
    if (!user) {
      res.status(403).json({ message: "User not found" });
      return;
    }
    req.auth = {
      userId: payload.userId,
      activeCompanyId: payload.activeCompanyId,
      roleInCompany: payload.roleInCompany,
      isAdmin: user.isAdmin,
      authMethod: "jwt",
    };
    next();
  } catch {
    res.status(403).json({ message: "Invalid token" });
  }
}

/**
 * Route guard: fail the request if the authenticated caller's scopes don't
 * include the required one. For JWT callers (no scopes), this passes through
 * because JWT users are treated as full-access — the `authMethod !== 'api_key'`
 * branch short-circuits. For API-key callers, the key must explicitly carry
 * the required scope.
 */
export function requireScope(scope: ApiKeyScope) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    if (req.auth.authMethod !== "api_key") {
      next();
      return;
    }
    const scopes = req.auth.scopes || [];
    if (!scopes.includes(scope)) {
      res.status(403).json({ message: `Missing required scope: ${scope}` });
      return;
    }
    next();
  };
}
