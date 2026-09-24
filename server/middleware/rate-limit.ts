// App-wide rate limiting.
//
// Every limit lives in the TIERS table below, so the whole policy is readable in
// one screen instead of being scattered across forty route definitions. First
// matching rule wins, and the last rule is a catch-all, so a new route is
// covered the day it is added rather than the day someone remembers it.
//
// Keying:
//   'ip'     — for routes reached before login (password guessing, code guessing).
//   'caller' — the user id when the request is authenticated, else the IP.
//
// Limitation worth knowing: the buckets are in memory, and on Vercel each
// function instance has its own. Under load the effective limit is therefore
// (limit x number of warm instances). That still stops a single attacker
// hammering one endpoint, which is the point; a shared counter (Redis/Upstash)
// is the upgrade when traffic justifies it.

import type { Response, NextFunction } from "express";
import crypto from "crypto";
import { takeToken } from "../lib/rate-limit";
import { clientIp } from "../lib/client-ip";
import type { AuthRequest } from "./auth-types";

export interface Tier {
  /** Label used in the bucket key, so tiers don't share a budget. */
  name: string;
  /** Which requests this rule covers. Methods empty = any method. */
  methods?: string[];
  test: (path: string) => boolean;
  by: "ip" | "caller";
  capacity: number;
  refillPerMinute: number;
}

const startsWithAny = (...prefixes: string[]) => (path: string) =>
  prefixes.some((p) => path === p || path.startsWith(p));

const matchesAny = (...patterns: RegExp[]) => (path: string) =>
  patterns.some((re) => re.test(path));

export const TIERS: Tier[] = [
  // 1. Anything that accepts a password, a one-time code, or an email address
  //    that triggers a send. Tight: 5/min sustained, burst of 10.
  {
    name: "auth",
    methods: ["POST"],
    test: startsWithAny(
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
      "/api/auth/clerk-exchange",
      "/api/auth/send-otp",
      "/api/auth/verify-otp",
      "/api/auth/change-email",
    ),
    by: "ip",
    capacity: 10,
    refillPerMinute: 5,
  },

  // 2. Join codes are 8 characters and grant workspace membership instantly,
  //    so this endpoint is a guessing target. Same tight budget as passwords.
  {
    name: "join-code",
    methods: ["POST"],
    test: startsWithAny("/api/companies/join-by-code"),
    by: "ip",
    capacity: 10,
    refillPerMinute: 5,
  },

  // 3. Endpoints that look something up by a secret token in the URL. Legitimate
  //    users hit these once or twice; a scanner would hit them endlessly.
  {
    name: "token-lookup",
    test: matchesAny(
      /^\/api\/team-invitations\/[^/]+$/,
      /^\/api\/tenders\/by-token\/[^/]+$/,
      /^\/api\/invitation-links\/[^/]+\/opened$/,
      /^\/api\/tenders\/[^/]+\/invite$/,
    ),
    by: "ip",
    capacity: 30,
    refillPerMinute: 30,
  },

  // 4. Requests that cost real money (OpenAI) or send email on our behalf.
  //    Per caller, not per IP: one logged-in user shouldn't be able to spend the
  //    AI budget from a dozen addresses.
  {
    name: "costly",
    methods: ["POST", "PATCH"],
    test: (path) =>
      startsWithAny(
        "/api/translate",
        "/api/ai/",
        "/api/copilot/chat",
        "/api/tenders/suggest-description",
      )(path) ||
      matchesAny(
        /^\/api\/tenders\/[^/]+\/(invite-individual|invite-by-email|questions|marketplace-submit)$/,
        /^\/api\/companies\/[^/]+\/(invite-team|membership-requests)$/,
        /^\/api\/r\/[^/]+\/apply$/,
      )(path),
    by: "caller",
    capacity: 20,
    refillPerMinute: 10,
  },

  // 5. Unauthenticated write that anyone can call — the client error reporter.
  {
    name: "public-write",
    methods: ["POST"],
    test: startsWithAny("/api/errors", "/api/track/visit"),
    by: "ip",
    capacity: 30,
    refillPerMinute: 30,
  },

  // 6. Catch-all for everything else the server exposes, including file reads.
  //    Generous on purpose: a busy dashboard fires a lot of requests, and this
  //    is a backstop against a runaway script, not a traffic shaper.
  {
    name: "general",
    test: startsWithAny("/api/", "/objects/", "/mcp", "/integrations/"),
    by: "caller",
    capacity: 300,
    refillPerMinute: 300,
  },
];

/** The first tier covering this request, or null when nothing applies. */
export function matchTier(method: string, path: string): Tier | null {
  for (const tier of TIERS) {
    if (tier.methods && !tier.methods.includes(method.toUpperCase())) continue;
    if (tier.test(path)) return tier;
  }
  return null;
}

// This middleware runs before each route's own authenticateToken, so req.auth is
// normally still empty here. For 'caller' tiers we therefore key on the
// credential itself — a fingerprint of the bearer token or API key, never the
// value. Same token means same bucket, which is what per-user means in practice,
// and a caller cannot escape their bucket without obtaining a different valid
// credential. Requests with no credential fall back to the IP.
function credentialFingerprint(req: AuthRequest): string | null {
  const header = req.headers["authorization"];
  const apiKey = req.headers["x-api-key"];
  const raw =
    (typeof header === "string" && header) ||
    (typeof apiKey === "string" && apiKey) ||
    (Array.isArray(apiKey) && apiKey[0]) ||
    null;
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function bucketKey(tier: Tier, req: AuthRequest): string {
  if (tier.by === "caller") {
    if (req.auth?.userId) return `${tier.name}:user:${req.auth.userId}`;
    const fingerprint = credentialFingerprint(req);
    if (fingerprint) return `${tier.name}:cred:${fingerprint}`;
  }
  return `${tier.name}:ip:${clientIp(req) ?? "unknown"}`;
}

export function rateLimiter(req: AuthRequest, res: Response, next: NextFunction): void {
  const tier = matchTier(req.method, req.path);
  if (!tier) return next();

  const result = takeToken(bucketKey(tier, req), {
    capacity: tier.capacity,
    refillPerMinute: tier.refillPerMinute,
  });

  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSeconds));
    res.status(429).json({
      message: "Too many requests. Please slow down and try again shortly.",
      retryAfterSeconds: result.retryAfterSeconds,
    });
    return;
  }

  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  next();
}
