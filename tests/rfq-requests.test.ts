// RFQ-B2/B3: creating an itemized request, the published-item lock, the legacy
// offer route's refusal, and who reads which items (AC5, AC7, AC10, AC12).
// The real routes run with in-memory storage; the items store is replaced by a
// model of its contract (one write per request: tender + items + mirror).

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import { deliverablesMirror } from "../shared/boq-items";

const m = vi.hoisted(() => ({
  tenders: {} as Record<string, any>,
  items: {} as Record<string, any[]>,
  created: [] as any[],
  updates: [] as any[],
  offersCreated: [] as any[],
  invited: {} as Record<string, string[]>,
  owners: {} as Record<string, string>,
  departed: new Set<string>(),
}));

vi.mock("../server/db", () => ({ db: {}, pool: { on: () => undefined, query: async () => ({ rows: [] }) } }));
vi.mock("../server/lib/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/lib/entitlements")>()),
  requireFeature: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  assertFeature: async () => undefined,
  assertCanCreateTender: async () => undefined,
}));
vi.mock("../server/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/email")>();
  const quiet: Record<string, unknown> = {};
  for (const k of Object.keys(actual)) quiet[k] = typeof (actual as any)[k] === "function" ? async () => undefined : (actual as any)[k];
  return quiet;
});
vi.mock("../server/lib/tender-ai", () => ({ suggestTenderCategory: async () => null, buildTenderTranslation: async () => null }));
vi.mock("../server/objectAcl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/objectAcl")>()),
  getObjectProvenance: async (p: string) => (m.owners[p] ? { ownerId: `${m.owners[p]}-user`, ownerCompanyId: m.owners[p], provenance: "company", visibility: "private" } : null),
}));
vi.mock("../server/lib/tender-items-store", () => ({
  tenderItemsStore: {
    async createItemizedTender(values: any, s: any) {
      const id = `t${Object.keys(m.tenders).length + 1}`;
      const items = s.items.map((it: any, position: number) => ({ id: `${id}-i${position}`, position, ...it }));
      const tender = { id, ...values, submissionType: s.submissionType, requestType: s.requestType, itemizedPricing: true,
        showReferencePrices: s.showReferencePrices, itemColumns: s.itemColumns, itemsRevision: 1, deliverables: deliverablesMirror(items) };
      m.tenders[id] = tender; m.items[id] = items; m.created.push({ values, s });
      return tender;
    },
    getItems: async (tenderId: string) => m.items[tenderId] ?? [],
  },
  createTenderItemsStore: () => ({}),
}));
// Vendor registration (BID-OFFERING-CLASSIFICATION) has its own tests
// (tests/offerings-*.test.ts); here the submitting organization is a registered vendor.
vi.mock("../server/lib/offering-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/lib/offering-store")>()),
  offeringStore: () => ({ status: async () => "registered" }),
}));
vi.mock("../server/storage", () => {
  const known: Record<string, (...a: any[]) => unknown> = {
    getUser: async (id: string) => ({ id, email: `${id}@example.test`, otpVerified: true, isAdmin: false, lastLoginAt: new Date() }),
    // PB-1: a user removed from a company keeps a token naming it, but has no role.
    getUserRoleInCompany: async (userId: string, companyId: string) => (m.departed.has(`${userId}@${companyId}`) ? null : "owner"),
    getCompany: async (id: string) => ({ id, name: id, accountType: "company", verificationStatus: "verified", isActive: true }),
    getTender: async (id: string) => (m.tenders[id] ? { ...m.tenders[id] } : undefined),
    getTenderByInvitationToken: async (tok: string) => Object.values(m.tenders).find((t: any) => t.invitationToken === tok),
    createTender: async (t: any) => { const id = `legacy${m.created.length}`; m.tenders[id] = { id, ...t }; m.created.push({ values: t, s: null }); return m.tenders[id]; },
    updateTender: async (id: string, u: any) => { m.updates.push(u); return { ...m.tenders[id], ...u }; },
    getOffersByTender: async () => [],
    getInvitationsByTender: async (id: string) => (m.invited[id] ?? []).map((companyId) => ({ companyId })),
    getInvitationLinkByTenderAndEmail: async () => undefined,
    getOfferByTenderAndCompany: async () => undefined,
    createOffer: async (o: any) => { m.offersCreated.push(o); return { id: "o1", ...o }; },
    getCompanyMembers: async () => [],
    filterRecipientsByPreference: async (r: unknown[]) => r,
  };
  return { storage: new Proxy(known, { get: (t, k: string) => t[k] ?? (async () => undefined) }) };
});

let server: TestServer;
const as = (company: string) => ({ Authorization: `Bearer ${jwt.sign({ userId: `${company}-user`, activeCompanyId: company, roleInCompany: "owner" }, process.env.JWT_SECRET!)}` });
const base = { title: "Steel RFQ", description: "Supply of steel", deadline: "2099-12-31", targetAudienceTypes: ["company"], inquiryType: "email_whatsapp", emailContact: "rfq@example.test" };
const items = [
  { name: "Cement", unit: "bag", quantity: "100", referenceUnitPrice: "18.50", customValues: { brand: "X" } },
  { name: "Rebar", unit: "ton", quantity: "2.5", description: "Grade 60" },
];
const structured = (over: Record<string, unknown> = {}) => ({ requestType: "rfq", itemizedPricing: true, itemColumns: [{ id: "brand", label: "Brand", type: "text", position: 0 }], items, ...over });
const create = (body: Record<string, unknown>) => request(server).post("/api/tenders").set(as("acme")).send({ ...base, ...body });

beforeAll(async () => {
  const { registerRoutes } = await import("../server/routes");
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 60_000);
afterAll(() => stopTestServer(server));
beforeEach(() => {
  m.tenders = {}; m.items = {}; m.created = []; m.updates = []; m.offersCreated = []; m.invited = {}; m.owners = {}; m.departed = new Set();
});

describe("create an itemized request", () => {
  it("an RFQ is created with its items in one write; prices-only is the default; mirror has no reference prices", async () => {
    const r = await create({ structured: structured() });
    expect(r.status).toBe(200);
    expect(m.created).toHaveLength(1);
    expect(m.created[0].s).toMatchObject({ requestType: "rfq", itemizedPricing: true, submissionType: "itemized_only", showReferencePrices: false });
    expect(m.created[0].s.items[1]).toMatchObject({ name: "Rebar", quantity: "2.5", description: "Grade 60", referenceUnitPrice: null });
    expect(JSON.stringify(r.body.deliverables)).not.toContain("18.5");
  });
  it.each([
    ["RFQ without itemized pricing", () => ({ structured: structured({ itemizedPricing: false }) }), 400, "RFQ_REQUIRES_ITEMIZED"],
    ["itemized + quote_only", () => ({ submissionType: "quote_only", structured: structured() }), 400, "SUBMISSION_TYPE_INVALID"],
    ["itemized_only without items", () => ({ submissionType: "itemized_only" }), 400, "ITEMIZED_ONLY_REQUIRES_ITEMS"],
    ["deliverables sent alongside items", () => ({ deliverables: [{ id: "d", name: "x", unit: "u", quantity: 1 }], structured: structured() }), 400, "DELIVERABLES_NOT_ALLOWED"],
    ["no items", () => ({ structured: structured({ items: [] }) }), 400, "ITEMS_INVALID"],
    ["exponent quantity", () => ({ structured: structured({ items: [{ name: "a", unit: "u", quantity: "1e3" }] }) }), 400, "ITEMS_INVALID"],
    ["5-dp quantity", () => ({ structured: structured({ items: [{ name: "a", unit: "u", quantity: "1.00001" }] }) }), 400, "ITEMS_INVALID"],
    ["Arabic digits at the API", () => ({ structured: structured({ items: [{ name: "a", unit: "u", quantity: "١" }] }) }), 400, "ITEMS_INVALID"],
    ["unknown key", () => ({ structured: { ...structured(), itemsRevision: 7 } }), 400, "STRUCTURED_INVALID"],
    ["another company's image", () => { m.owners["/objects/uploads/img1"] = "rival"; return { structured: structured({ items: [{ name: "a", unit: "u", quantity: "1", imageUrl: "/objects/uploads/img1" }] }) }; }, 400, "FILE_NOT_OWNED"],
  ])("refused: %s", async (_label, body, status, code) => {
    const r = await create(body());
    expect([r.status, r.body.code]).toEqual([status, code]);
    expect(m.created).toHaveLength(0);
  });
  it("the company's own image is accepted", async () => {
    m.owners["/objects/uploads/img2"] = "acme";
    expect((await create({ structured: structured({ items: [{ name: "a", unit: "u", quantity: "1", imageUrl: "/objects/uploads/img2" }] }) })).status).toBe(200);
  });
  it("a legacy request is unchanged", async () => {
    const r = await create({ submissionType: "quote_only", deliverables: [{ id: "d", name: "x", unit: "u", quantity: 2.5 }] });
    expect(r.status).toBe(200);
    expect(m.created[0].s).toBeNull();
  });
});

describe("published-item lock and legacy offer route", () => {
  beforeEach(async () => { await create({ structured: structured() }); });
  const patch = (body: Record<string, unknown>) => request(server).patch("/api/tenders/t1").set(as("acme")).send(body);
  it("items (deliverables mirror) and submission method cannot change; other fields can", async () => {
    for (const body of [{ deliverables: [{ id: "d", name: "x", unit: "u", quantity: 5 }] }, { submissionType: "tech_fin_proposal" }]) {
      const r = await patch(body);
      expect([r.status, r.body.code]).toEqual([409, "ITEMS_LOCKED"]);
    }
    expect(m.updates).toHaveLength(0);
    expect((await patch({ title: "Steel RFQ v2", submissionType: "itemized_only" })).status).toBe(200);
  });
  it("structure keys are not writable through PATCH (stripped by the allowlist)", async () => {
    const r = await patch({ itemizedPricing: false, requestType: "rfp", showReferencePrices: true, title: "x x x" });
    expect(r.status).toBe(200);
    expect(m.updates[0]).toEqual({ title: "x x x" });
  });
  it("the legacy offer route refuses an itemized request", async () => {
    m.invited.t1 = ["vendor"];
    const r = await request(server).post("/api/tenders/t1/offers").set(as("vendor")).send({ quotePrice: 100 });
    expect([r.status, r.body.code]).toEqual([409, "ITEMIZED_SUBMISSION_REQUIRED"]);
    expect(m.offersCreated).toHaveLength(0);
  });
});

describe("reading items (AC5, AC10)", () => {
  beforeEach(async () => { await create({ structured: structured() }); m.tenders.t1.invitationToken = "tok"; });
  const get = (company: string) => request(server).get("/api/tenders/t1/items").set(as(company));
  it("the owner reads everything, reference prices included", async () => {
    const r = await get("acme");
    expect(r.body.owner).toBe(true);
    expect(r.body.items[0].referenceUnitPrice).toBe("18.50");
  });
  it("an invited vendor gets no hidden reference price — not even the key", async () => {
    m.invited.t1 = ["vendor"];
    const r = await get("vendor");
    expect(r.status).toBe(200);
    expect(r.body.owner).toBe(false);
    expect(JSON.stringify(r.body)).not.toContain("18.50");
    expect(r.body.items[0]).not.toHaveProperty("referenceUnitPrice");
    expect(r.body.columns.map((c: any) => c.id)).toEqual(["brand"]);
  });
  it("shown reference prices reach vendors", async () => {
    m.tenders.t1.showReferencePrices = true; m.invited.t1 = ["vendor"];
    expect((await get("vendor")).body.items[0].referenceUnitPrice).toBe("18.50");
  });
  it("an unrelated company is refused; a draft is not public", async () => {
    expect((await get("stranger")).status).toBe(403);
    const pub = await request(server).get("/api/tenders/tok/invite/items");
    expect([pub.status, JSON.stringify(pub.body).includes("18.50")]).toEqual([200, false]);
    m.tenders.t1.status = "draft";
    expect((await request(server).get("/api/tenders/tok/invite/items")).status).toBe(404);
    m.invited.t1 = ["vendor"];
    expect((await get("vendor")).status).toBe(403);
  });
});

describe("PB-1: a removed member's stale token grants nothing", () => {
  beforeEach(async () => {
    await create({ structured: structured() });
    m.tenders.t1.invitationToken = "tok";
    m.departed.add("acme-user@acme"); // removed from the owning company after the token was issued
  });
  it("items: no owner view and no hidden reference price — refused", async () => {
    const r = await request(server).get("/api/tenders/t1/items").set(as("acme"));
    expect(r.status).toBe(403);
    expect(JSON.stringify(r.body)).not.toContain("18.50");
  });
  it("tender: no owner view either", async () => {
    expect((await request(server).get("/api/tenders/t1").set(as("acme"))).status).toBe(403);
  });
  it("legitimate non-company access is preserved: marketplace readers get the vendor view, the public link still works", async () => {
    m.tenders.t1.isMarketplace = true; m.tenders.t1.marketplaceStatus = "approved";
    const r = await request(server).get("/api/tenders/t1/items").set(as("acme"));
    expect([r.status, r.body.owner]).toEqual([200, false]);
    expect(JSON.stringify(r.body)).not.toContain("18.50");
    const pub = await request(server).get("/api/tenders/tok/invite/items");
    expect([pub.status, JSON.stringify(pub.body).includes("18.50")]).toEqual([200, false]);
  });
  it("a current member still gets the owner view", async () => {
    m.departed.clear();
    const r = await request(server).get("/api/tenders/t1/items").set(as("acme"));
    expect([r.status, r.body.owner, r.body.items[0].referenceUnitPrice]).toEqual([200, true, "18.50"]);
  });
});

