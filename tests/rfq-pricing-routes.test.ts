// RFQ-D1/D2/D5: who may price, read-only states, draft rules and the checks the
// route makes before the submission transaction (documents, file provenance,
// flag, role). The stores are replaced by models of their contracts; the
// transaction itself is exercised on Postgres by tests/rfq-offers.integration.test.ts.

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";

const m = vi.hoisted(() => ({
  tender: null as any,
  items: [] as any[],
  invited: [] as string[],
  offers: {} as Record<string, any>,
  draft: null as any,
  submits: [] as any[],
  owners: {} as Record<string, { company: string; user: string }>,
  companies: {} as Record<string, any>,
  notices: [] as any[],
  noticeFails: false,
  replay: false,
  conflict: false,
  fail: new Set<string>(),
}));
vi.mock("../server/lib/proposal-notifications", () => ({
  notifyRequesterOfProposal: async (n: any) => { m.notices.push(n); if (m.noticeFails) throw new Error("smtp down"); return "sent"; },
}));

vi.mock("../server/db", () => ({ db: {}, pool: { on: () => undefined, query: async () => ({ rows: [] }) } }));
vi.mock("../server/objectAcl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/objectAcl")>()),
  getObjectProvenance: async (p: string) => (m.owners[p] ? { ownerId: m.owners[p].user, ownerCompanyId: m.owners[p].company, provenance: "company", visibility: "private" } : null),
}));
vi.mock("../server/storage", () => ({
  storage: new Proxy({
    getTender: async (id: string) => (m.tender && m.tender.id === id ? { ...m.tender } : undefined),
    getCompany: async (id: string) => {
      // The pre-commit checks read the company too; only the post-commit lookup is made to fail.
      if (m.fail.has("company") && m.submits.length > 0) throw new Error("companies down");
      return m.companies[id] ?? { id, name: `${id} name`, accountType: "company", verificationStatus: "verified" };
    },
    getInvitationsByTender: async () => m.invited.map((companyId) => ({ companyId })),
    getInvitationLinkByTenderAndEmail: async () => undefined,
    getOfferByTenderAndCompany: async (_t: string, c: string) => m.offers[c],
    getUser: async (id: string) => ({ id, email: `${id}@example.test` }),
    getOffer: async (id: string) => Object.values(m.offers).find((o: any) => o.id === id),
    logMemberActivity: async () => { if (m.fail.has("activity")) throw new Error("activity log down"); },
    logProductEvent: async () => { if (m.fail.has("event")) throw new Error("events down"); },
  } as Record<string, any>, { get: (t, k: string) => t[k] ?? (async () => undefined) }),
}));

import { registerRfqPricingRoutes } from "../server/routes/rfq-pricing";
import { RfqOfferError } from "../server/lib/rfq-offer-store";

const itemsStore = { getItems: async () => m.items } as any;
const offerStore = {
  getDraft: async () => m.draft,
  async saveDraft(input: any) {
    if ((m.draft?.version ?? null) !== input.baseVersion) throw new RfqOfferError(409, "DRAFT_CONFLICT", "x", { latest: m.draft });
    m.draft = { version: (m.draft?.version ?? 0) + 1, itemsRevision: input.itemsRevision, payload: input.payload, updatedBy: input.userId };
    return m.draft;
  },
  async submit(input: any) {
    m.submits.push(input);
    if (m.conflict) throw new RfqOfferError(409, "DRAFT_CONFLICT", "x", { latest: { version: 3 } });
    return { offer: { id: "o-new", status: "pending", pricingTotal: "10511.00", submittedAt: new Date() }, replayed: m.replay, pricing: null };
  },
} as any;

let server: TestServer;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  const authenticateToken = (req: any, _res: any, next: any) => {
    req.auth = { userId: `${req.header("x-company")}-user`, activeCompanyId: req.header("x-company"), roleInCompany: req.header("x-role") ?? "member", isAdmin: false };
    next();
  };
  registerRfqPricingRoutes(app, { authenticateToken, requireCompanyContext: (_q, _s, n) => n(), itemsStore, offerStore });
  server = await startTestServer(app);
});
afterAll(() => stopTestServer(server));
beforeEach(() => {
  m.tender = { id: "t1", companyId: "buyer", title: "Steel", status: "published", deadline: "2099-12-31", itemizedPricing: true, requestType: "rfq",
    submissionType: "itemized_only", videoRequired: false, itemsRevision: 1, showReferencePrices: false, itemColumns: [], invitationToken: "tok" };
  m.items = [
    { id: "i1", position: 0, name: "Cement", description: null, unit: "bag", quantity: "100", referenceUnitPrice: "18.00", imageUrl: null, customValues: null },
    { id: "i2", position: 1, name: "Rebar", description: null, unit: "ton", quantity: "2.5", referenceUnitPrice: null, imageUrl: null, customValues: null },
  ];
  m.invited = ["vendor"]; m.offers = {}; m.draft = null; m.submits = []; m.owners = {}; m.companies = {};
  m.notices = []; m.noticeFails = false; m.replay = false; m.conflict = false; m.fail = new Set();
});

const as = (company: string, role = "member") => ({ "x-company": company, "x-role": role });
const get = (company: string, role?: string) => request(server).get("/api/tenders/t1/pricing").set(as(company, role));
const payload = (over: Record<string, unknown> = {}) => ({
  responses: [{ itemId: "i1", state: "priced", unitPrice: "18.50" }, { itemId: "i2", state: "priced", unitPrice: "2400.00" }],
  tax: { applyVat: true, mixedTreatment: false }, notes: null, documents: null, ...over,
});
const submit = (company: string, body: Record<string, unknown>, role?: string) =>
  request(server).post("/api/tenders/t1/itemized-offers").set(as(company, role)).send({ submissionKey: "key-12345678", itemsRevision: 1, draftVersion: null, ...payload(), ...body });

describe("who may open the pricing page", () => {
  it("an invited member gets the vendor view: no hidden reference price, editable", async () => {
    const r = await get("vendor");
    expect(r.status).toBe(200);
    expect(r.body.readOnlyReason).toBeNull();
    expect(JSON.stringify(r.body)).not.toContain("18.00");
  });
  it.each([
    ["the requester's own company", "buyer", 403, "SELF_SUBMISSION"],
    ["an uninvited company", "stranger", 403, "NOT_INVITED"],
  ])("%s is refused", async (_l, company, status, code) => {
    const r = await get(company);
    expect([r.status, r.body.code]).toEqual([status, code]);
  });
  it("the invitation link token counts as an invitation", async () => {
    m.invited = [];
    expect((await request(server).get("/api/tenders/t1/pricing").set({ ...as("linkholder"), "x-invitation-token": "tok" })).status).toBe(200);
  });
  it.each([
    ["viewer", () => undefined, "VIEWER"],
    ["cancelled request, offer holder", () => { m.tender.status = "cancelled"; m.invited = []; m.offers.vendor = { id: "o1", companyId: "vendor", status: "pending" }; }, "REQUEST_CANCELLED"],
    ["deadline passed", () => { m.tender.deadline = "2000-01-01"; }, "DEADLINE_PASSED"],
    ["unverified company", () => { m.companies.vendor = { id: "vendor", accountType: "company", verificationStatus: "under_review" }; }, "VERIFICATION_REQUIRED"],
    ["already submitted", () => { m.offers.vendor = { id: "o1", companyId: "vendor", status: "pending", resubmissionAllowed: false }; }, "ALREADY_SUBMITTED"],
  ])("read-only: %s", async (label, setup, reason) => {
    setup();
    const r = await get("vendor", label === "viewer" ? "viewer" : "member");
    expect([r.status, r.body.readOnlyReason]).toEqual([200, reason]);
  });
  it("a non-itemized request has no pricing page", async () => {
    m.tender.itemizedPricing = false;
    expect((await get("vendor")).body.code).toBe("NOT_ITEMIZED");
  });
});

describe("shared draft", () => {
  const save = (body: Record<string, unknown>, role?: string) => request(server).put("/api/tenders/t1/pricing-draft").set(as("vendor", role)).send({ baseVersion: null, itemsRevision: 1, payload: payload(), ...body });
  it("members save; the version moves on; a stale version is a conflict carrying the latest draft", async () => {
    expect((await save({})).body.draft.version).toBe(1);
    expect((await save({ baseVersion: 1 })).body.draft.version).toBe(2);
    const stale = await save({ baseVersion: 1 });
    expect([stale.status, stale.body.code, stale.body.latest.version]).toEqual([409, "DRAFT_CONFLICT", 2]);
  });
  it("a draft may be incomplete but not malformed", async () => {
    expect((await save({ payload: payload({ responses: [{ itemId: "i1", state: "priced", unitPrice: "" }] }) })).status).toBe(200);
    m.draft = null;
    for (const responses of [
      [{ itemId: "foreign-item", state: "priced", unitPrice: "1.00" }],
      [{ itemId: "i1", state: "priced", unitPrice: "1.00" }, { itemId: "i1", state: "priced", unitPrice: "2.00" }],
      [{ itemId: "i1", state: "priced", unitPrice: "1.001" }],
    ]) {
      const r = await save({ payload: payload({ responses }) });
      expect([r.status, r.body.code]).toEqual([400, "INVALID_RESPONSES"]);
    }
  });
  it("viewers cannot save; a changed item revision is refused; unknown keys are rejected", async () => {
    expect((await save({}, "viewer")).status).toBe(403);
    expect((await save({ itemsRevision: 2 })).body.code).toBe("STALE_REVISION");
    expect((await save({ payload: { ...payload(), total: "1.00" } })).status).toBe(400);
  });
});

describe("submission checks before the transaction", () => {
  it("a complete itemized_only offer reaches the store with no documents", async () => {
    const r = await submit("vendor", {});
    expect(r.status).toBe(200);
    expect(m.submits[0]).toMatchObject({ companyId: "vendor", userId: "vendor-user", documents: { technicalFileUrl: null, combinedFileUrl: null } });
  });
  it("client-sent totals are not accepted (strict body)", async () => {
    expect((await submit("vendor", { total: "1.00" })).status).toBe(400);
    expect(m.submits).toHaveLength(0);
  });
  it("documents the submission method requires are enforced on the server", async () => {
    m.tender.submissionType = "tech_fin_proposal";
    const r = await submit("vendor", {});
    expect([r.status, r.body.code]).toEqual([422, "DOCUMENTS_REQUIRED"]);
    m.owners["/objects/uploads/own"] = { company: "vendor", user: "vendor-user" };
    expect((await submit("vendor", { documents: { combinedFileUrl: "/objects/uploads/own" } })).status).toBe(200);
  });
  it("another company's file (offer document or alternative image) is refused", async () => {
    m.tender.submissionType = "tech_fin_proposal";
    m.owners["/objects/uploads/rival"] = { company: "rival", user: "rival-user" };
    expect((await submit("vendor", { documents: { combinedFileUrl: "/objects/uploads/rival" } })).body.code).toBe("FILE_NOT_OWNED");
    m.tender.submissionType = "itemized_only";
    const alt = { name: "x", unit: "u", quantity: "1", unitPrice: "1.00", reason: "r", imageUrl: "/objects/uploads/rival" };
    const r = await submit("vendor", { responses: [{ itemId: "i1", state: "priced", unitPrice: "1.00", alternative: alt }, { itemId: "i2", state: "priced", unitPrice: "1.00" }] });
    expect([r.status, r.body.code, r.body.itemId]).toEqual([400, "FILE_NOT_OWNED", "i1"]);
    expect(m.submits).toHaveLength(0);
  });
  it.each([["viewer", 403], ["member of an uninvited company", 403]])("%s cannot submit", async (label, status) => {
    const r = label === "viewer" ? await submit("vendor", {}, "viewer") : await submit("stranger", {});
    expect(r.status).toBe(status);
    expect(m.submits).toHaveLength(0);
  });
  it("a bad submission key is rejected", async () => {
    expect((await submit("vendor", { submissionKey: "short" })).status).toBe(400);
  });
});

describe("reading a submitted offer's pricing (sealed bid)", () => {
  beforeEach(() => { m.offers.vendor = { id: "o1", tenderId: "t1", companyId: "vendor", status: "pending", pricingSnapshot: { items: [], responses: [{ alternative: {} }, null], totals: {} }, pricingTotal: "1.00" }; });
  it.each([["buyer", 200], ["vendor", 200], ["stranger", 403]])("%s → %s", async (company, status) => {
    const r = await request(server).get("/api/offers/o1/pricing").set(as(company));
    expect(r.status).toBe(status);
    if (status === 200) expect(r.body.alternativesCount).toBe(1);
  });
});

const settle = () => new Promise((r) => setTimeout(r, 30));

describe("PB-2: submission is tied to the shared draft version", () => {
  it("the draft version reaches the transaction; a moved draft is a 409 with nothing written", async () => {
    await submit("vendor", { draftVersion: 2 });
    expect(m.submits[0].body.draftVersion).toBe(2);
    m.conflict = true;
    const r = await submit("vendor", { draftVersion: 2 });
    expect([r.status, r.body.code, r.body.latest.version]).toEqual([409, "DRAFT_CONFLICT", 3]);
    expect((await submit("vendor", { draftVersion: undefined })).status).toBe(400); // required
  });
});

describe("PB-5: requester email after commit", () => {
  it("one notice per committed submission, with the tender and vendor", async () => {
    expect((await submit("vendor", {})).status).toBe(200);
    await settle();
    expect(m.notices).toHaveLength(1);
    expect(m.notices[0]).toMatchObject({ tender: { id: "t1" }, vendorCompanyId: "vendor" });
  });
  it("a replayed submission sends nothing; a refused one sends nothing", async () => {
    m.replay = true;
    await submit("vendor", {}); await settle();
    m.replay = false; m.conflict = true;
    await submit("vendor", {}); await settle();
    expect(m.notices).toHaveLength(0);
  });
  it("an email failure does not change the submission's answer", async () => {
    m.noticeFails = true;
    expect((await submit("vendor", {})).status).toBe(200);
    await settle();
    expect(m.notices).toHaveLength(1);
  });
});

describe("PB-6: a reopened offer starts from what was submitted", () => {
  const snapshotOffer = (over: Record<string, unknown> = {}) => ({
    id: "o1", companyId: "vendor", status: "pending", resubmissionAllowed: true, notes: "old notes",
    combinedFileUrl: "/objects/uploads/mine", technicalFileUrl: "/objects/uploads/colleague", financialFileUrl: null, videoUrl: null,
    pricingSnapshot: { tax: { applyVat: false, mixedTreatment: false }, responses: [
      { itemId: "i1", state: "priced", unitPrice: "18.50", alternative: { name: "a", unit: "u", quantity: "1", unitPrice: "1.00", reason: "r", imageUrl: "/objects/uploads/colleague" } },
      null,
    ] },
    ...over,
  });
  beforeEach(() => {
    m.owners["/objects/uploads/mine"] = { company: "vendor", user: "vendor-user" };
    m.owners["/objects/uploads/colleague"] = { company: "vendor", user: "colleague-user" };
  });
  it("no draft + reopened offer: prefill with responses, tax and notes; files the member may not attach are left out", async () => {
    m.offers.vendor = snapshotOffer();
    const r = await get("vendor");
    expect(r.body.readOnlyReason).toBeNull();
    expect(r.body.prefill.tax).toEqual({ applyVat: false, mixedTreatment: false });
    expect(r.body.prefill.responses).toHaveLength(1);
    expect(r.body.prefill.responses[0].unitPrice).toBe("18.50");
    expect(r.body.prefill.responses[0].alternative.imageUrl).toBeNull();
    expect(r.body.prefill.documents).toMatchObject({ combinedFileUrl: "/objects/uploads/mine", technicalFileUrl: null });
    expect(r.body.prefill.notes).toBe("old notes");
  });
  it("a newer shared draft wins: no prefill", async () => {
    m.offers.vendor = snapshotOffer();
    m.draft = { version: 4, itemsRevision: 1, payload: { responses: [], tax: { applyVat: true, mixedTreatment: false } } };
    const r = await get("vendor");
    expect([r.body.prefill, r.body.draft.version]).toEqual([null, 4]);
  });
  it("an offer that is not reopened gives no prefill and stays read-only", async () => {
    m.offers.vendor = snapshotOffer({ resubmissionAllowed: false });
    const r = await get("vendor");
    expect([r.body.prefill, r.body.readOnlyReason]).toEqual([null, "ALREADY_SUBMITTED"]);
  });
});

describe("PB-5-R1: post-commit steps are isolated", () => {
  it.each([["activity"], ["event"], ["company"], ["activity", "event", "company"]])("failing %s: the answer is unchanged and the email is still attempted", async (...failing) => {
    for (const f of failing) m.fail.add(f);
    expect((await submit("vendor", {})).status).toBe(200);
    await settle();
    expect(m.notices).toHaveLength(1);
    expect(m.notices[0].vendorCompanyName).toBe(m.fail.has("company") ? "" : "vendor name");
  });
  it("a failing email after failing logs still leaves the submission answered", async () => {
    m.fail.add("activity"); m.fail.add("event"); m.noticeFails = true;
    expect((await submit("vendor", {})).status).toBe(200);
    await settle();
    expect(m.notices).toHaveLength(1);
  });
  it("still nothing for a replay or before commit (a refused submission)", async () => {
    m.replay = true; await submit("vendor", {}); await settle();
    m.replay = false; m.conflict = true; await submit("vendor", {}); await settle();
    expect(m.notices).toHaveLength(0);
  });
});

