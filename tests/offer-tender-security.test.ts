// SEC-S1S2: offer submission accepts only vendor fields (S1), and every
// vendor/public read of a tender withholds a hidden price (S2).
//
// The real server/routes.ts is registered; storage is an in-memory stub, so
// "reaches persistence" below means "is the argument handed to storage". No
// database, network or AI service is touched.

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { tenderForAudience } from "../server/lib/tender-audience";

const m = vi.hoisted(() => ({
  tender: null as any,
  invited: [] as string[],
  offerByCompany: {} as Record<string, any>,
  created: [] as any[],
  statusUpdates: [] as any[],
  objectOwners: {} as Record<string, string>,
  notified: [] as string[],
}));

const OWNER = "owner-co";
const PRIVATE_TENDER = {
  id: "t1",
  companyId: OWNER,
  title: "Office fit-out",
  description: "Fit-out of floor 3",
  deadline: "2099-12-31",
  status: "published",
  budget: "500000",
  budgetRange: "450000 - 550000",
  budgetMin: 450000,
  budgetMax: 550000,
  showPriceToVendors: false,
  projectSize: "large",
  milestones: [{ name: "Design", amount: 100000, dueDate: "2099-01-01" }, { name: "Build", amount: 400000 }],
  rfpRequirements: ["SAR 500,000 budget cap"],
  rfpRequirementsAr: ["سقف الميزانية 500,000 ريال"],
  deliverables: [{ id: "d1", name: "Partitions", description: "", unit: "m2", quantity: 120 }],
  invitationToken: "tok-1",
  isMarketplace: false,
  marketplaceStatus: null,
  targetAudienceTypes: ["company"],
};
const MARKETPLACE_TENDER = { ...PRIVATE_TENDER, isMarketplace: true, marketplaceStatus: "approved" };

vi.mock("../server/db", () => ({ db: {}, pool: { on: () => undefined, query: async () => ({ rows: [] }) } }));
// Upload ownership (S5) comes from the ACL table; here a map from object path to owner.
vi.mock("../server/objectAcl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/objectAcl")>()),
  getObjectOwnerByPath: async (p: string) => m.objectOwners[p] ?? null,
  // Provenance as written at issuance: issued for the owner's company ("<company>-user").
  getObjectProvenance: async (p: string) => {
    const ownerId = m.objectOwners[p];
    return ownerId ? { ownerId, ownerCompanyId: ownerId.replace(/-user\d*$/, ""), provenance: "company", visibility: "private" } : null;
  },
}));
// Record offer notifications instead of sending them.
vi.mock("../server/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/email")>()),
  sendNewOfferNotification: async ({ tenderId }: { tenderId: string }) => { m.notified.push(tenderId); },
}));
vi.mock("../server/storage", () => {
  const known: Record<string, (...a: any[]) => unknown> = {
    getUser: async (id: string) => ({ id, email: `${id}@example.test`, otpVerified: true, isAdmin: false, lastLoginAt: new Date() }),
    getUserRoleInCompany: async () => "owner",
    getCompany: async (id: string) => ({ id, name: id, accountType: "company", verificationStatus: "verified", isActive: true }),
    getCompanyProfile: async () => undefined,
    getTender: async () => (m.tender ? { ...m.tender } : undefined),
    getTenderByInvitationToken: async (t: string) =>
      m.tender && t === m.tender.invitationToken ? { ...m.tender, company: { id: OWNER, name: "Owner" }, profile: undefined } : undefined,
    getInvitationsByTender: async () => m.invited.map((companyId) => ({ companyId })),
    getOfferByTenderAndCompany: async (_t: string, companyId: string) => m.offerByCompany[companyId] ?? null,
    getOffersByTender: async () => m.created,
    // The offer notification path (after the response): no admins to email.
    getCompanyMembers: async () => [],
    filterRecipientsByPreference: async (r: unknown[]) => r,
    createOffer: async (o: any) => { m.created.push(o); return { id: "o-new", submittedAt: new Date(), ...o }; },
    updateOfferStatus: async (id: string, status: string) => { m.statusUpdates.push({ id, status }); },
    getOffersByCompany: async (companyId: string) => [{ id: "o1", companyId, tenderId: "t1", status: "pending", tender: { ...m.tender } }],
    getMarketplaceTenders: async () => ({ tenders: [{ ...MARKETPLACE_TENDER, company: { id: OWNER }, profile: undefined }], total: 1 }),
    getInvitationsByCompany: async () => [{
      id: "inv1", status: "pending", invitedAt: new Date(), tender: { ...m.tender }, requester: { id: OWNER, name: "Owner", slug: "owner" },
    }],
  };
  return { storage: new Proxy(known, { get: (t, k: string) => t[k] ?? (async () => undefined) }) };
});

let app: express.Express;

let server: TestServer;

afterAll(() => stopTestServer(server));
const token = (companyId: string) =>
  jwt.sign({ userId: `${companyId}-user`, activeCompanyId: companyId, roleInCompany: "owner" }, process.env.JWT_SECRET!);
const auth = (companyId: string) => ({ Authorization: `Bearer ${token(companyId)}` });

beforeAll(async () => {
  const { registerRoutes } = await import("../server/routes");
  app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 60_000);

beforeEach(() => {
  m.tender = { ...PRIVATE_TENDER };
  m.invited = ["vendor-co"];
  m.offerByCompany = {};
  m.created = [];
  m.statusUpdates = [];
  m.objectOwners = { "/objects/uploads/tech": "vendor-co-user", "/objects/uploads/fin": "vendor-co-user" };
  m.notified = [];
});

function expectPriceWithheld(body: any) {
  expect(body.budget).toBeNull();
  expect(body.budgetRange).toBeNull();
  expect(body.budgetMin).toBeNull();
  expect(body.budgetMax).toBeNull();
  expect(body.milestones.map((x: any) => x.amount)).toEqual([null, null]);
  expect(body.milestones.map((x: any) => x.name)).toEqual(["Design", "Build"]);
  expect(body).not.toHaveProperty("rfpRequirements");
  expect(body).not.toHaveProperty("rfpRequirementsAr");
  expect(JSON.stringify(body)).not.toMatch(/500,?000|450000|550000|400000|100000/);
  // Intentionally public fields stay.
  expect(body.projectSize).toBe("large");
  expect(body.title).toBe("Office fit-out");
}

// ── S1 ─────────────────────────────────────────────────────────────────────────
describe("S1 offer submission: allowlisted vendor fields, server-derived workflow fields", () => {
  const submit = (body: unknown, companyId = "vendor-co") =>
    request(server).post("/api/tenders/t1/offers").set(auth(companyId)).send(body as object);

  it("a legitimate submission succeeds and exactly the intended values reach storage", async () => {
    const r = await submit({
      technicalFileUrl: "/objects/uploads/tech",
      financialFileUrl: "/objects/uploads/fin",
      notes: "Delivery in 6 weeks",
      quotePrice: 480000,
    });
    expect(r.status).toBe(200);
    expect(m.created).toHaveLength(1);
    expect(m.created[0]).toEqual({
      technicalFileUrl: "/objects/uploads/tech",
      financialFileUrl: "/objects/uploads/fin",
      notes: "Delivery in 6 weeks",
      quotePrice: 480000,
      tenderId: "t1",
      companyId: "vendor-co",
      createdBy: "vendor-co-user",
      conditionalSubmission: false,
      status: "pending",
      resubmissionAllowed: false,
      decidedBy: null,
      decidedAt: null,
    });
    // The post-response notification path runs to completion on the stub (no
    // caught error): it is invoked exactly once for the accepted offer.
    await vi.waitFor(() => expect(m.notified).toEqual(["t1"]));
  });

  it("a malicious payload cannot create an accepted offer, grant resubmission, set decision metadata or ownership", async () => {
    const r = await submit({
      quotePrice: 1000,
      status: "accepted",
      resubmissionAllowed: true,
      decidedBy: "vendor-co-user",
      decidedAt: "2026-10-20T00:00:00.000Z",
      conditionalSubmission: true,
      companyId: "victim-co",
      createdBy: "someone-else",
      tenderId: "other-tender",
      id: "chosen-id",
      submittedAt: "2000-01-01",
    });
    expect(r.status).toBe(200);
    const stored = m.created[0];
    expect(stored.status).toBe("pending");
    expect(stored.resubmissionAllowed).toBe(false);
    expect(stored.decidedBy).toBeNull();
    expect(stored.decidedAt).toBeNull();
    expect(stored.conditionalSubmission).toBe(false);
    expect(stored.companyId).toBe("vendor-co");
    expect(stored.createdBy).toBe("vendor-co-user");
    expect(stored.tenderId).toBe("t1");
    expect(stored).not.toHaveProperty("id");
    expect(stored).not.toHaveProperty("submittedAt");
    expect(r.body.status).toBe("pending");
  });

  it("malformed input gets the documented 400 and nothing is written", async () => {
    for (const body of [{ quotePrice: "a lot" }, { notes: 42 }, { technicalFileUrl: ["x"] }]) {
      const r = await submit(body);
      expect(r.status).toBe(400);
      expect(r.body).toEqual({ message: "Invalid offer data" });
    }
    expect(m.created).toHaveLength(0);
    expect(m.notified).toEqual([]);
  });

  it("a malformed resubmission does not supersede the current offer", async () => {
    m.offerByCompany["vendor-co"] = { id: "o-old", resubmissionAllowed: true, status: "pending" };
    const r = await submit({ quotePrice: "not a number" });
    expect(r.status).toBe(400);
    expect(m.statusUpdates).toHaveLength(0);
    expect(m.created).toHaveLength(0);
  });

  it("a valid resubmission still supersedes the old offer and creates a pending one", async () => {
    m.offerByCompany["vendor-co"] = { id: "o-old", resubmissionAllowed: true, status: "pending" };
    const r = await submit({ quotePrice: 470000, status: "accepted" });
    expect(r.status).toBe(200);
    expect(m.statusUpdates).toEqual([{ id: "o-old", status: "superseded" }]);
    expect(m.created[0].status).toBe("pending");
  });

  it("an existing offer without resubmission permission still returns 409", async () => {
    m.offerByCompany["vendor-co"] = { id: "o-old", resubmissionAllowed: false, status: "pending" };
    const r = await submit({ quotePrice: 470000, resubmissionAllowed: true });
    expect(r.status).toBe(409);
    expect(m.created).toHaveLength(0);
  });
});

// ── S2 ─────────────────────────────────────────────────────────────────────────
describe("S2 hidden price withheld on every vendor/public read", () => {
  it("the owning company still reads every field", async () => {
    const r = await request(server).get("/api/tenders/t1").set(auth(OWNER));
    expect(r.status).toBe(200);
    expect(r.body.budget).toBe("500000");
    expect(r.body.budgetMin).toBe(450000);
    expect(r.body.milestones[0].amount).toBe(100000);
    expect(r.body.rfpRequirements).toEqual(["SAR 500,000 budget cap"]);
  });

  it("invitation-only branch: an invited vendor gets the request without the price", async () => {
    const r = await request(server).get("/api/tenders/t1").set(auth("vendor-co"));
    expect(r.status).toBe(200);
    expectPriceWithheld(r.body);
    expect(r.body.deliverables).toEqual(PRIVATE_TENDER.deliverables);
  });

  it("marketplace branch: an uninvited company gets the request without the price", async () => {
    m.tender = { ...MARKETPLACE_TENDER };
    m.invited = [];
    const r = await request(server).get("/api/tenders/t1").set(auth("market-co"));
    expect(r.status).toBe(200);
    expectPriceWithheld(r.body);
  });

  it("offer-holder branch: a company with an offer gets the request without the price", async () => {
    m.invited = [];
    m.offerByCompany["bidder-co"] = { id: "o-b", status: "pending" };
    const r = await request(server).get("/api/tenders/t1").set(auth("bidder-co"));
    expect(r.status).toBe(200);
    expectPriceWithheld(r.body);
  });

  it("existing denial preserved: an unrelated company on a private request gets 403 and no tender data", async () => {
    const r = await request(server).get("/api/tenders/t1").set(auth("stranger-co"));
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ message: "Access denied" });
  });

  it("a visible price stays visible to vendors; the requester-only AI cache never is", async () => {
    m.tender = { ...PRIVATE_TENDER, showPriceToVendors: true };
    const r = await request(server).get("/api/tenders/t1").set(auth("vendor-co"));
    expect(r.status).toBe(200);
    expect(r.body.budget).toBe("500000");
    expect(r.body.milestones[0].amount).toBe(100000);
    expect(r.body).not.toHaveProperty("rfpRequirements");
  });

  it("unauthenticated invitation-token read withholds the price and keeps the requester summary", async () => {
    const r = await request(server).get("/api/tenders/by-token/tok-1");
    expect(r.status).toBe(200);
    expectPriceWithheld(r.body);
    expect(r.body.company).toEqual({ id: OWNER, name: "Owner" });
  });

  it("unknown invitation token still 404s", async () => {
    const r = await request(server).get("/api/tenders/by-token/nope");
    expect(r.status).toBe(404);
  });

  it("invite endpoint withholds the price fields and the milestone amounts", async () => {
    const r = await request(server).get("/api/tenders/tok-1/invite");
    expect(r.status).toBe(200);
    expect(r.body.budget).toBeNull();
    expect(r.body.budgetRange).toBeNull();
    expect(r.body.budgetMin).toBeNull();
    expect(r.body.budgetMax).toBeNull();
    expect(r.body.milestones.map((x: any) => x.amount)).toEqual([null, null]);
    expect(JSON.stringify(r.body)).not.toMatch(/500,?000|450000|550000|400000|100000/);
  });

  it("invite endpoint lifecycle preserved: a closed request is still not available", async () => {
    m.tender = { ...PRIVATE_TENDER, status: "closed" };
    const r = await request(server).get("/api/tenders/tok-1/invite");
    expect(r.status).toBe(404);
  });

  it("public marketplace list withholds the price for anonymous and non-owner readers", async () => {
    for (const headers of [{}, auth("market-co")]) {
      const r = await request(server).get("/api/marketplace/tenders").set(headers);
      expect(r.status).toBe(200);
      expect(r.body.total).toBe(1);
      expectPriceWithheld(r.body.tenders[0]);
    }
  });

  it("marketplace list: the owning company still sees its own price", async () => {
    const r = await request(server).get("/api/marketplace/tenders").set(auth(OWNER));
    expect(r.status).toBe(200);
    expect(r.body.tenders[0].budget).toBe("500000");
  });

  it("vendor's own offers: the nested tender withholds the price", async () => {
    const r = await request(server).get("/api/my-offers").set(auth("vendor-co"));
    expect(r.status).toBe(200);
    expect(r.body[0].id).toBe("o1");
    expectPriceWithheld(r.body[0].tender);
  });

  it("control: the vendor's invitation list never carried price fields", async () => {
    const r = await request(server).get("/api/my-invitations").set(auth("vendor-co"));
    expect(r.status).toBe(200);
    const allowed = ["category", "deadline", "id", "invitationToken", "tenderType", "title"];
    expect(Object.keys(r.body[0].tender).every((k) => allowed.includes(k))).toBe(true);
    expect(JSON.stringify(r.body)).not.toMatch(/budget|milestone|rfpRequirements|500,?000/);
  });
});

describe("tenderForAudience", () => {
  it("returns the stored row to the owning company, unchanged", () => {
    const t = { ...PRIVATE_TENDER };
    expect(tenderForAudience(t, OWNER)).toBe(t);
  });

  it("does not mutate its input", () => {
    const t = structuredClone(PRIVATE_TENDER);
    tenderForAudience(t, "vendor-co");
    expect(t).toEqual(PRIVATE_TENDER);
  });

  it("treats a missing owner or viewer as non-owner, and tolerates odd milestones", () => {
    const out: any = tenderForAudience({ ...PRIVATE_TENDER, companyId: null, milestones: "legacy" } as any, null);
    expect(out.budget).toBeNull();
    expect(out.milestones).toBe("legacy");
    const out2: any = tenderForAudience({ ...PRIVATE_TENDER, milestones: [null, { name: "x", amount: 5 }] } as any);
    expect(out2.milestones).toEqual([null, { name: "x", amount: null }]);
  });

  it("only an explicit false hides the price (null/undefined keep the existing 'shown' default)", () => {
    expect((tenderForAudience({ ...PRIVATE_TENDER, showPriceToVendors: null } as any) as any).budget).toBe("500000");
    expect((tenderForAudience({ ...PRIVATE_TENDER, showPriceToVendors: undefined } as any) as any).budget).toBe("500000");
  });
});
