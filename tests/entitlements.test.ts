// Plan gates: which tier a company is on, what it may do, and that the rules in
// shared/entitlements.ts cover everything the pricing page promises. The
// database and StreamPay are faked: these are rules, not plumbing.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import express from "express";
import request from "supertest";

const state = vi.hoisted(() => ({
  company: null as any,
  subscription: null as any,
  counts: new Map<unknown, number>(),
}));

vi.mock("../server/db", async () => {
  const schema = await import("../shared/schema");
  state.counts.set(schema.tenders, 0);
  state.counts.set(schema.userCompanies, 1);
  state.counts.set(schema.teamInvitations, 0);
  return {
    db: {
      select: () => ({
        from: (table: unknown) => ({ where: async () => [{ n: state.counts.get(table) ?? 0 }] }),
      }),
    },
  };
});
vi.mock("../server/storage", () => ({ storage: { getCompany: vi.fn(async () => state.company) } }));
vi.mock("../server/lib/billing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/lib/billing")>();
  return { ...actual, getCompanySubscription: vi.fn(async () => state.subscription) };
});

import { tenders, teamInvitations, userCompanies } from "../shared/schema";
import {
  PlanRequiredError,
  assertCanCreateTender,
  assertFeature,
  assertSeatAvailable,
  getEntitlements,
  requireFeature,
} from "../server/lib/entitlements";
import {
  FEATURES,
  FEATURE_MIN_PLAN,
  FREE_SEAT_LIMIT,
  FREE_TENDER_LIMIT,
  PRICING_PAGE_FEATURES,
  planAllows,
} from "../shared/entitlements";

const company = (over: Record<string, unknown> = {}) => ({
  id: "c1", accountType: "company", grandfatheredFeatures: [], ...over,
});
const sub = (plan: "pro" | "business", status = "active", cancelAtPeriodEnd = false) => ({
  plan, term: "monthly", status, streampaySubscriptionId: "s1", cancelAtPeriodEnd,
});

beforeEach(() => {
  state.company = company();
  state.subscription = null;
  state.counts.set(tenders, 0);
  state.counts.set(userCompanies, 1);
  state.counts.set(teamInvitations, 0);
});

describe("which tier a company is on", () => {
  it("no subscription → free", async () => {
    expect((await getEntitlements("c1")).tier).toBe("free");
  });

  it("an active plan → that plan", async () => {
    state.subscription = sub("business");
    expect((await getEntitlements("c1")).tier).toBe("business");
  });

  it("a plan cancelled but still inside its paid period keeps working", async () => {
    state.subscription = sub("pro", "active", true);
    expect((await getEntitlements("c1")).tier).toBe("pro");
  });

  it("an ended or failed plan → free", async () => {
    for (const status of ["canceled", "expired", "inactive", "frozen"]) {
      state.subscription = sub("pro", status);
      expect((await getEntitlements("c1")).tier, status).toBe("free");
    }
  });

  it("a trial counts as the plan", async () => {
    state.subscription = sub("pro", "trialing");
    expect((await getEntitlements("c1")).tier).toBe("pro");
  });
});

describe("the free-tender limit", () => {
  it(`allows tenders up to ${FREE_TENDER_LIMIT} and blocks the next`, async () => {
    for (const used of [0, 1, 2]) {
      state.counts.set(tenders, used);
      await expect(assertCanCreateTender("c1")).resolves.toBeUndefined();
      expect((await getEntitlements("c1")).canCreateTender).toBe(true);
    }
    for (const used of [3, 4, 20]) {
      state.counts.set(tenders, used);
      await expect(assertCanCreateTender("c1")).rejects.toMatchObject({ code: "PLAN_REQUIRED", feature: "tenders", requiredPlan: "pro" });
      expect((await getEntitlements("c1")).canCreateTender).toBe(false);
    }
  });

  it("reports usage so the UI can show '2 of 3'", async () => {
    state.counts.set(tenders, 2);
    const e = await getEntitlements("c1");
    expect(e).toMatchObject({ tendersUsed: 2, tenderLimit: 3 });
  });

  it("Pro and Business have no limit", async () => {
    state.counts.set(tenders, 50);
    for (const plan of ["pro", "business"] as const) {
      state.subscription = sub(plan);
      await expect(assertCanCreateTender("c1")).resolves.toBeUndefined();
      expect((await getEntitlements("c1")).tenderLimit).toBeNull();
    }
  });
});

describe("marketplace and in-app Q&A on a new tender", () => {
  it("free: marketplace and inside_bid are refused", async () => {
    await expect(assertCanCreateTender("c1", { marketplace: true })).rejects.toMatchObject({ feature: "marketplace" });
    await expect(assertCanCreateTender("c1", { inquiryType: "inside_bid" })).rejects.toMatchObject({ feature: "qa" });
  });

  it("free: private tenders with email/WhatsApp contact are fine", async () => {
    await expect(assertCanCreateTender("c1", { marketplace: false, inquiryType: "email_whatsapp" })).resolves.toBeUndefined();
  });

  it("Pro includes both", async () => {
    state.subscription = sub("pro");
    await expect(assertCanCreateTender("c1", { marketplace: true, inquiryType: "inside_bid" })).resolves.toBeUndefined();
  });
});

describe("seats", () => {
  it("free is one person: a second needs the plan", async () => {
    await expect(assertSeatAvailable("c1")).rejects.toMatchObject({ feature: "seats" });
    expect((await getEntitlements("c1"))).toMatchObject({ seatsUsed: 1, seatLimit: FREE_SEAT_LIMIT });
  });

  it("a pending invitation holds its seat", async () => {
    state.counts.set(userCompanies, 0);
    state.counts.set(teamInvitations, 1);
    await expect(assertSeatAvailable("c1")).rejects.toBeInstanceOf(PlanRequiredError);
  });

  it("Pro and Business include the whole team", async () => {
    state.counts.set(userCompanies, 12);
    state.subscription = sub("pro");
    await expect(assertSeatAvailable("c1", 5)).resolves.toBeUndefined();
    expect((await getEntitlements("c1")).seatLimit).toBeNull();
  });
});

describe("features by plan", () => {
  it("matches the pricing page: Pro unlocks the Pro list, Business adds AI ranking, comparison and API", async () => {
    const free = (await getEntitlements("c1")).features;
    for (const f of FEATURES) expect(free[f], `free ${f}`).toBe(false);

    state.subscription = sub("pro");
    const pro = (await getEntitlements("c1")).features;
    for (const f of ["marketplace", "aiBuilder", "ownTemplates", "qa", "traction", "seats"] as const) expect(pro[f], `pro ${f}`).toBe(true);
    for (const f of ["aiAnalysis", "comparison", "api"] as const) expect(pro[f], `pro ${f}`).toBe(false);

    state.subscription = sub("business");
    const biz = (await getEntitlements("c1")).features;
    for (const f of FEATURES) expect(biz[f], `business ${f}`).toBe(true);
  });

  it("assertFeature throws a PlanRequiredError naming the plan that unlocks it", async () => {
    await expect(assertFeature("c1", "aiAnalysis")).rejects.toMatchObject({ code: "PLAN_REQUIRED", feature: "aiAnalysis", requiredPlan: "business" });
    state.subscription = sub("pro");
    await expect(assertFeature("c1", "aiAnalysis")).rejects.toMatchObject({ requiredPlan: "business" });
    await expect(assertFeature("c1", "marketplace")).resolves.toBeUndefined();
  });
});

describe("grandfathering: what a free company already used keeps working", () => {
  it("an existing Traction Link, API key or AI draft stays allowed", async () => {
    state.company = company({ grandfatheredFeatures: ["traction", "api", "aiBuilder"] });
    const f = (await getEntitlements("c1")).features;
    expect(f.traction && f.api && f.aiBuilder).toBe(true);
    expect(f.marketplace).toBe(false); // …but nothing else unlocks
    await expect(assertFeature("c1", "api")).resolves.toBeUndefined();
  });
});

describe("only company workspaces are gated", () => {
  it.each(["team", "individual"])("%s workspaces (the vendor side) get everything", async (accountType) => {
    state.company = company({ accountType });
    state.counts.set(tenders, 99);
    const e = await getEntitlements("c1");
    expect(e.gated).toBe(false);
    expect(e.canCreateTender).toBe(true);
    for (const f of FEATURES) expect(e.features[f]).toBe(true);
    await expect(assertCanCreateTender("c1", { marketplace: true, inquiryType: "inside_bid" })).resolves.toBeUndefined();
    await expect(assertSeatAvailable("c1", 10)).resolves.toBeUndefined();
  });

  it("an unknown company fails closed, not open", async () => {
    state.company = undefined;
    await expect(assertFeature("nope", "marketplace")).rejects.toBeInstanceOf(PlanRequiredError);
  });
});

describe("billing permission flag", () => {
  it("only owners and admins can manage billing", async () => {
    expect((await getEntitlements("c1", "owner")).canManageBilling).toBe(true);
    expect((await getEntitlements("c1", "admin")).canManageBilling).toBe(true);
    expect((await getEntitlements("c1", "member")).canManageBilling).toBe(false);
    expect((await getEntitlements("c1")).canManageBilling).toBe(false);
  });
});

describe("requireFeature middleware", () => {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).auth = req.header("x-company") ? { activeCompanyId: req.header("x-company") } : {};
    next();
  });
  app.get("/gated", requireFeature("marketplace"), (_req, res) => res.json({ ok: true }));

  it("403 PLAN_REQUIRED with the feature and plan, for a free company", async () => {
    const res = await request(app).get("/gated").set("x-company", "c1");
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: "PLAN_REQUIRED", feature: "marketplace", requiredPlan: "pro" });
    expect(typeof res.body.message).toBe("string");
  });

  it("passes once the plan includes it", async () => {
    state.subscription = sub("pro");
    expect((await request(app).get("/gated").set("x-company", "c1")).status).toBe(200);
  });

  it("no active company → 400, never an open door", async () => {
    expect((await request(app).get("/gated")).status).toBe(400);
  });
});

describe("the rules cover the pricing page", () => {
  it("every Pro/Business line on /pricing maps to a rule (or is knowingly ungated)", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/Pricing.tsx"), "utf8");
    const block = src.slice(src.indexOf("const FEATURES"), src.indexOf("const FAQ_KEYS"));
    const keys = [...block.matchAll(/key:\s*"(f[A-Za-z]+)"/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(8);
    for (const k of keys) {
      if (k === "fEverythingBiz" || k === "fSso" || k === "fSla" || k === "fOnboarding") continue; // Enterprise: out of scope
      expect(PRICING_PAGE_FEATURES, `Pricing.tsx shows "${k}" but shared/entitlements.ts has no rule for it`).toHaveProperty(k);
    }
  });

  it("every rule points at a real feature and a paid plan", () => {
    for (const mapped of Object.values(PRICING_PAGE_FEATURES)) {
      if (mapped && mapped !== "tenders") expect(FEATURES).toContain(mapped);
    }
    for (const f of FEATURES) {
      expect(["pro", "business"]).toContain(FEATURE_MIN_PLAN[f]);
      expect(planAllows("free", f)).toBe(false);
      expect(planAllows("business", f)).toBe(true);
    }
  });
});

describe("routes.ts: every gate is still wired, vendor routes are not gated", () => {
  const routes = fs.readFileSync(path.resolve(__dirname, "../server/routes.ts"), "utf8");
  const header = (needle: string) => {
    const i = routes.indexOf(needle);
    expect(i, `route not found: ${needle}`).toBeGreaterThan(-1);
    // From the route declaration up to where its handler body starts.
    return routes.slice(i, routes.indexOf("async (", i));
  };

  const gated: [string, string][] = [
    ['app.post("/api/templates"', "ownTemplates"],
    ['app.post("/api/tenders/:id/marketplace-submit"', "marketplace"],
    ['app.patch("/api/company/traction-slug"', "traction"],
    ['app.post("/api/ai-chat-sessions"', "aiBuilder"],
    ['app.post("/api/tenders/suggest-description"', "aiBuilder"],
    ['app.post("/api/ai/estimate-budget"', "aiBuilder"],
    ['app.post("/api/ai/analyze-offer/:offerId"', "aiAnalysis"],
    ['app.post("/api/ai/analyze-proposals/:tenderId"', "aiAnalysis"],
  ];
  it.each(gated)("%s needs %s", (decl, feature) => {
    expect(header(decl)).toContain(`requireFeature('${feature}')`);
  });

  it("the copilot chat endpoint and API-key creation are gated too", () => {
    expect(fs.readFileSync(path.resolve(__dirname, "../server/ai/copilot/index.ts"), "utf8")).toContain('requireFeature("aiBuilder")');
    const integ = fs.readFileSync(path.resolve(__dirname, "../server/routes/settings/integrations.ts"), "utf8");
    expect(integ).toContain('r.post("/api-keys", ...businessGate');
    expect(integ).toContain('r.post("/integrations", ...businessGate');
    const mw = fs.readFileSync(path.resolve(__dirname, "../server/middleware/api-key.ts"), "utf8");
    expect(mw).toContain('assertFeature(company.id, "api")');
  });

  it("all tender-creation paths go through the one gate", () => {
    const launch = fs.readFileSync(path.resolve(__dirname, "../server/lib/launch-tender.ts"), "utf8");
    expect(launch).toContain("assertCanCreateTender(");
    // The routes never call storage.createTender directly, so none can skip it.
    for (const f of ["server/routes.ts", "server/routes/v1/copilot.ts", "server/routes/integrations/webhook.ts", "server/routes/integrations/mcp.ts"]) {
      expect(fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"), f).not.toMatch(/storage\.createTender\(/);
    }
  });

  it("vendors are never gated: asking questions, bidding, and joining a Traction Link", () => {
    for (const decl of ['app.post("/api/tenders/:id/questions"', 'app.post("/api/tenders/:id/offers"', 'app.post("/api/r/:slug/apply"', 'app.get("/api/r/:slug"']) {
      expect(header(decl), decl).not.toContain("requireFeature");
    }
  });
});
