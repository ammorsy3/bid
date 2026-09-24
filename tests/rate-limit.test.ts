// Unit tests for the rate-limit policy table. No database or network: these
// check which tier a request lands in, and that a bucket actually runs out.

import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { matchTier, bucketKey, rateLimiter, TIERS } from "../server/middleware/rate-limit";
import { _resetRateLimitState } from "../server/lib/rate-limit";

beforeEach(() => _resetRateLimitState());

describe("matchTier — which limit covers which route", () => {
  const cases: [string, string, string][] = [
    ["POST", "/api/auth/login", "auth"],
    ["POST", "/api/auth/verify-otp", "auth"],
    ["POST", "/api/auth/forgot-password", "auth"],
    ["POST", "/api/companies/join-by-code", "join-code"],
    ["GET", "/api/team-invitations/abc123", "token-lookup"],
    ["GET", "/api/tenders/by-token/tok_9", "token-lookup"],
    ["GET", "/api/tenders/t1/invite", "token-lookup"],
    ["POST", "/api/ai/analyze-proposals/t1", "costly"],
    ["POST", "/api/translate", "costly"],
    ["POST", "/api/tenders/t1/invite-by-email", "costly"],
    ["POST", "/api/companies/c1/invite-team", "costly"],
    ["POST", "/api/r/acme/apply", "costly"],
    ["POST", "/api/errors", "public-write"],
    ["GET", "/api/tenders", "general"],
    ["GET", "/objects/uploads/x.pdf", "general"],
  ];

  for (const [method, path, expected] of cases) {
    it(`${method} ${path} → ${expected}`, () => {
      expect(matchTier(method, path)?.name).toBe(expected);
    });
  }

  it("leaves non-API paths alone (the React app's own pages)", () => {
    expect(matchTier("GET", "/dashboard")).toBeNull();
    expect(matchTier("GET", "/")).toBeNull();
  });

  it("puts a GET on an auth path in the general tier, not the auth tier", () => {
    // The auth tier is POST-only; a GET must not borrow its tiny budget.
    expect(matchTier("GET", "/api/auth/login")?.name).toBe("general");
  });

  it("ends with a catch-all so new API routes are covered by default", () => {
    expect(TIERS[TIERS.length - 1].name).toBe("general");
    expect(matchTier("POST", "/api/some/route/invented/tomorrow")?.name).toBe("general");
  });
});

describe("bucketKey — who shares a budget", () => {
  const tier = TIERS.find((t) => t.name === "costly")!;
  const req = (headers: Record<string, string>, auth?: any) =>
    ({ headers, auth, socket: {} }) as any;

  it("separates two different credentials", () => {
    const a = bucketKey(tier, req({ authorization: "Bearer token-a" }));
    const b = bucketKey(tier, req({ authorization: "Bearer token-b" }));
    expect(a).not.toBe(b);
  });

  it("gives the same credential the same bucket every time", () => {
    const h = { authorization: "Bearer token-a" };
    expect(bucketKey(tier, req(h))).toBe(bucketKey(tier, req(h)));
  });

  it("never puts the raw token in the key", () => {
    const key = bucketKey(tier, req({ authorization: "Bearer super-secret-token" }));
    expect(key).not.toContain("super-secret-token");
  });

  it("falls back to the IP when there is no credential", () => {
    const key = bucketKey(tier, req({ "x-forwarded-for": "203.0.113.9" }));
    expect(key).toBe("costly:ip:203.0.113.9");
  });
});

describe("the limiter actually refuses traffic", () => {
  const app = express();
  app.use(rateLimiter);
  app.post("/api/auth/login", (_req, res) => res.json({ ok: true }));

  it("allows the burst, then answers 429 with Retry-After", async () => {
    const ip = "198.51.100.7";
    const capacity = TIERS.find((t) => t.name === "auth")!.capacity;

    for (let i = 0; i < capacity; i++) {
      const res = await request(app).post("/api/auth/login").set("x-forwarded-for", ip);
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).post("/api/auth/login").set("x-forwarded-for", ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(blocked.body.message).toMatch(/too many requests/i);
  });

  it("does not punish a different IP for the first one's behaviour", async () => {
    const ip = "198.51.100.8";
    const capacity = TIERS.find((t) => t.name === "auth")!.capacity;
    for (let i = 0; i < capacity + 5; i++) {
      await request(app).post("/api/auth/login").set("x-forwarded-for", ip);
    }
    const other = await request(app).post("/api/auth/login").set("x-forwarded-for", "198.51.100.9");
    expect(other.status).toBe(200);
  });
});
