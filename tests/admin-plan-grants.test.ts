// BID-UX-BUGFIX item 7 (D-PLANS): platform admins give or change a company's
// plan; nobody else can, including by calling the API directly; a request can
// never land on another company; a grant changes real entitlements, never the
// subscription. Routes run against an in-memory grant store — the transaction
// and lock themselves are covered by tests/plan-grants.integration.test.ts
// (real Postgres, opt-in).

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import { effectiveTier, planSource, isGrantActive, grantEndsAt, setPlanGrantSchema } from "../shared/plan-grants";

const m = vi.hoisted(() => ({
  companies: {} as Record<string, any>,
  grants: [] as any[],
  calls: [] as any[],
  sub: null as any,
}));

vi.mock("../server/db", () => ({ db: {}, pool: { on: () => undefined, query: async () => ({ rows: [] }) } }));
vi.mock("../server/storage", () => ({ storage: { getCompany: async (id: string) => m.companies[id] } }));
vi.mock("../server/lib/billing", () => ({
  getCompanySubscription: async () => m.sub,
  isLiveSubscription: (s: any) => !!s && ["active", "trialing"].includes(s.status),
}));

import { PlanGrantError } from "../server/lib/plan-grants";
import { registerAdminPlanRoutes } from "../server/routes/admin-plans";

// In-memory model of the store's contract (one not-revoked grant per company,
// expectedGrantId compare-and-set, workspace check).
const store = {
  current: async (companyId: string) => m.grants.find((g) => g.companyId === companyId && !g.revokedAt) ?? null,
  active: async (companyId: string) => { const g = await store.current(companyId); return isGrantActive(g) ? g : null; },
  history: async (companyId: string) => m.grants.filter((g) => g.companyId === companyId),
  async set(input: any) {
    m.calls.push({ op: "set", ...input });
    const c = m.companies[input.companyId];
    if (!c) throw new PlanGrantError(404, "NOT_FOUND", "Company not found");
    if (c.accountType !== "company") throw new PlanGrantError(400, "NOT_A_COMPANY_WORKSPACE", "x");
    const before = await store.current(input.companyId);
    if ((before?.id ?? null) !== input.expectedGrantId) throw new PlanGrantError(409, "GRANT_CHANGED", "x");
    if (before) before.revokedAt = new Date();
    const now = new Date();
    const g = { id: `g${m.grants.length + 1}`, companyId: input.companyId, plan: input.plan, reason: input.reason, startsAt: now, endsAt: grantEndsAt(input.duration, now), revokedAt: null };
    m.grants.push(g);
    return g;
  },
  async revoke(input: any) {
    m.calls.push({ op: "revoke", ...input });
    const before = await store.current(input.companyId);
    if (!before || before.id !== input.expectedGrantId) throw new PlanGrantError(409, "GRANT_CHANGED", "x");
    before.revokedAt = new Date();
  },
};

let server: TestServer;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  const authenticateToken = (req: any, res: any, next: any) => {
    const who = req.header("x-user");
    if (!who) return res.status(401).json({ message: "unauthenticated" });
    req.auth = { userId: who, activeCompanyId: "acme", isAdmin: who === "platform-admin" };
    next();
  };
  registerAdminPlanRoutes(app, { authenticateToken, store: store as any });
  server = await startTestServer(app);
});
afterAll(() => stopTestServer(server));
beforeEach(() => {
  m.companies = {
    acme: { id: "acme", name: "Acme", accountType: "company", verificationStatus: "verified" },
    beta: { id: "beta", name: "Beta", accountType: "company", verificationStatus: "not_verified" },
    solo: { id: "solo", name: "Solo", accountType: "individual", verificationStatus: "not_verified" },
  };
  m.grants = [];
  m.calls = [];
  m.sub = null;
});

const admin = { "x-user": "platform-admin" };
const grant = (company: string, body: Record<string, unknown>, headers: Record<string, string> = admin) =>
  request(server).put(`/api/admin/companies/${company}/plan-grant`).set(headers).send(body);
const good = (company = "acme") => ({ plan: "pro", duration: "90d", reason: "Pilot partner", expectedGrantId: null, confirmCompanyId: company });

describe("authorization", () => {
  it.each([
    ["company owner (not a platform admin)", { "x-user": "acme-owner" }, 403],
    ["anonymous", {}, 401],
  ])("%s cannot read or change a plan", async (_label, headers, status) => {
    expect((await request(server).get("/api/admin/companies/acme/plan").set(headers)).status).toBe(status);
    expect((await grant("acme", good(), headers as any)).status).toBe(status);
    expect((await request(server).post("/api/admin/companies/acme/plan-grant/revoke").set(headers).send({ reason: "x x x", expectedGrantId: "g1", confirmCompanyId: "acme" })).status).toBe(status);
    expect(m.calls).toHaveLength(0);
  });
});

describe("targeting", () => {
  it("the confirmed company must equal the URL's company, or nothing changes", async () => {
    const r = await grant("beta", good("acme"));
    expect([r.status, r.body.code]).toEqual([400, "TARGET_MISMATCH"]);
    expect(m.calls).toHaveLength(0);
  });
  it("a stale view (another admin changed it) is refused with 409", async () => {
    expect((await grant("acme", good())).status).toBe(200);
    const r = await grant("acme", { ...good(), plan: "business" }); // still expects "no grant"
    expect([r.status, r.body.code]).toEqual([409, "GRANT_CHANGED"]);
  });
  it("team and individual workspaces have no plans", async () => {
    expect((await grant("solo", good("solo"))).body.code).toBe("NOT_A_COMPANY_WORKSPACE");
  });
  it("unknown fields, unknown plans and short reasons are rejected", async () => {
    for (const body of [{ ...good(), plan: "enterprise" }, { ...good(), reason: "x" }, { ...good(), tier: "business" }, { ...good(), duration: "7d" }]) {
      expect((await grant("acme", body)).status).toBe(400);
    }
    expect(m.calls).toHaveLength(0);
  });
});

describe("grant, change, revoke", () => {
  it("a grant shows separately from verification and subscription, and raises the effective plan", async () => {
    const r = await grant("acme", good());
    expect(r.status).toBe(200);
    expect(r.body.company).toMatchObject({ id: "acme", verificationStatus: "verified" });
    expect(r.body.subscription).toBeNull();
    expect(r.body.grant).toMatchObject({ plan: "pro", reason: "Pilot partner", active: true });
    expect([r.body.effectiveTier, r.body.planSource]).toEqual(["pro", "grant"]);
    expect(m.calls[0]).toMatchObject({ actorId: "platform-admin", companyId: "acme" });
  });
  it("changing and revoking go through the grant the admin saw", async () => {
    await grant("acme", good());
    const changed = await grant("acme", { ...good(), plan: "business", duration: "open", expectedGrantId: "g1" });
    expect([changed.status, changed.body.grant.plan, changed.body.grant.endsAt]).toEqual([200, "business", null]);
    expect(m.grants.filter((g) => !g.revokedAt)).toHaveLength(1);
    const revoked = await request(server).post("/api/admin/companies/acme/plan-grant/revoke").set(admin).send({ reason: "Pilot ended", expectedGrantId: "g2", confirmCompanyId: "acme" });
    expect([revoked.status, revoked.body.grant, revoked.body.effectiveTier]).toEqual([200, null, "free"]);
  });
  it("another company's plan is untouched", async () => {
    await grant("acme", good());
    const beta = await request(server).get("/api/admin/companies/beta/plan").set(admin);
    expect([beta.body.grant, beta.body.effectiveTier]).toEqual([null, "free"]);
  });
});

describe("effective plan rules", () => {
  const now = new Date("2026-10-25T12:00:00Z");
  const g = (plan: string, over: Record<string, unknown> = {}) => ({ plan, startsAt: "2026-10-01T00:00:00Z", endsAt: null, revokedAt: null, ...over });
  it("the higher of paid and granted plan; a grant never lowers a paid plan", () => {
    expect(effectiveTier("free", g("pro"), now)).toBe("pro");
    expect(effectiveTier("business", g("pro"), now)).toBe("business");
    expect(planSource("business", g("pro"), now)).toBe("subscription");
    expect(planSource("pro", g("business"), now)).toBe("grant");
  });
  it("expired, revoked and future grants do not count", () => {
    expect(effectiveTier("free", g("pro", { endsAt: "2026-10-20T00:00:00Z" }), now)).toBe("free");
    expect(effectiveTier("free", g("pro", { revokedAt: "2026-10-20T00:00:00Z" }), now)).toBe("free");
    expect(effectiveTier("free", g("pro", { startsAt: "2026-11-01T00:00:00Z" }), now)).toBe("free");
  });
  it("durations end exactly N days later; 'open' has no end", () => {
    expect(grantEndsAt("30d", now)!.toISOString()).toBe("2026-11-24T12:00:00.000Z");
    expect(grantEndsAt("open", now)).toBeNull();
    expect(setPlanGrantSchema.safeParse({ plan: "pro", duration: "open", reason: "  ok  ", expectedGrantId: null, confirmCompanyId: "c" }).success).toBe(false);
  });
});
