// SEC S8: a requester's create/edit contract is an explicit allowlist. Marketplace
// moderation (approval status, approver, timestamps, rejection reason, reference
// number) and listing attributes are server-controlled; requesting publication
// (marketplace submission) and approving it (admin review) stay separate paths.
//
// The real server/routes.ts handlers and server/lib/launch-tender.ts run; storage
// is an in-memory stub and plan checks pass through, so "reaches storage" means
// "is the argument handed to storage". Nothing here touches a database.

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createTenderSchema } from "../shared/schema";

const m = vi.hoisted(() => ({
  tender: null as any,
  created: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  approvals: [] as { id: string; adminId: string }[],
}));

const SELF_APPROVAL = {
  isMarketplace: true,
  marketplaceStatus: "approved",
  marketplaceApprovedBy: "owner-co-user",
  marketplaceApprovedAt: "2026-10-21T00:00:00.000Z",
  marketplaceRejectionReason: null,
  referenceNumber: "BID-FORGED",
  documentFee: 0,
  tenderType: "direct_purchase",
  inquiryDeadline: "2099-01-01",
};
const SERVER_CONTROLLED = [
  "companyId", "createdBy", "requesterId", "status", "invitationToken", "allowConditionalSubmission",
  "isMarketplace", "marketplaceStatus", "marketplaceApprovedBy", "marketplaceApprovedAt", "marketplaceRejectionReason",
  "referenceNumber", "documentFee", "tenderType", "inquiryDeadline", "translatedContent", "rfpRequirements", "rfpRequirementsAr",
];

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
vi.mock("../server/storage", () => {
  const known: Record<string, (...a: any[]) => unknown> = {
    getUser: async (id: string) => ({ id, email: `${id}@example.test`, otpVerified: true, isAdmin: id === "admin-user", lastLoginAt: new Date() }),
    getUserRoleInCompany: async () => "owner",
    getCompany: async (id: string) => ({ id, name: id, accountType: "company", verificationStatus: "verified", isActive: true }),
    getTender: async () => (m.tender ? { ...m.tender } : undefined),
    getOffersByTender: async () => [], // no offers yet, so the P8 specification lock does not apply
    createTender: async (t: Record<string, unknown>) => { m.created.push(t); return { id: "t-new", ...t }; },
    updateTender: async (_id: string, u: Record<string, unknown>) => { m.updates.push(u); return { ...m.tender, ...u }; },
    approveMarketplaceTender: async (id: string, adminId: string) => { m.approvals.push({ id, adminId }); },
    getPurchaseOrdersByTender: async () => [{ id: "po1", status: "verified" }],
    getCompanyMembers: async () => [],
    filterRecipientsByPreference: async (r: unknown[]) => r,
  };
  return { storage: new Proxy(known, { get: (t, k: string) => t[k] ?? (async () => undefined) }) };
});

let app: express.Express;

let server: TestServer;

afterAll(() => stopTestServer(server));
const as = (companyId: string, userId = `${companyId}-user`) => ({
  Authorization: `Bearer ${jwt.sign({ userId, activeCompanyId: companyId, roleInCompany: "owner" }, process.env.JWT_SECRET!)}`,
});

beforeAll(async () => {
  const { registerRoutes } = await import("../server/routes");
  app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 60_000);

beforeEach(() => {
  m.tender = { id: "t1", companyId: "owner-co", createdBy: "owner-co-user", title: "RFP", description: "d", deadline: "2099-12-31",
    status: "published", isMarketplace: false, marketplaceStatus: null, invitationToken: "tok-t1" };
  m.created = [];
  m.updates = [];
  m.approvals = [];
});

const expectNoServerControlled = (written: Record<string, unknown>) => {
  for (const key of SERVER_CONTROLLED) expect([key, key in written]).toEqual([key, false]);
};

describe("S8 edit (PATCH /api/tenders/:id)", () => {
  it("CHAIN: the owner cannot self-approve or forge moderation metadata; the legitimate edit in the same request still applies", async () => {
    const r = await request(server).patch("/api/tenders/t1").set(as("owner-co"))
      .send({ title: "Updated RFP", deliverables: [{ id: "d1", name: "Cement", description: "", unit: "bag", quantity: 10 }], ...SELF_APPROVAL });
    expect(r.status).toBe(200);
    expect(m.updates).toHaveLength(1);
    expectNoServerControlled(m.updates[0]);
    expect(m.updates[0]).toMatchObject({ title: "Updated RFP" });
    expect(r.body.marketplaceStatus).toBeNull();
    expect(r.body.isMarketplace).toBe(false);
  });

  it("ownership, lifecycle, token and AI caches cannot be written either", async () => {
    const r = await request(server).patch("/api/tenders/t1").set(as("owner-co")).send({
      companyId: "other-co", createdBy: "someone", requesterId: "x", status: "cancelled", invitationToken: "mine",
      allowConditionalSubmission: true, translatedContent: { en: { title: "x" } }, rfpRequirements: ["x"], rfpRequirementsAr: ["x"], description: "ok",
    });
    expect(r.status).toBe(200);
    expectNoServerControlled(m.updates[0]);
    expect(m.updates[0]).toEqual({ description: "ok" });
  });

  it("legitimate edits of every editable kind still succeed unchanged", async () => {
    const edit = {
      title: "T", description: "D", deadline: "2099-12-30", startDate: "2099-01-01", endDate: "2099-06-01", duration: "3 months",
      budget: "1000", showPriceToVendors: false, submissionType: "tech_fin_proposal", videoRequired: false,
      inquiryType: "email_whatsapp", emailContact: "rfp@example.test", whatsappContact: null,
      vendorRequirements: [{ id: "v1", text: "ISO", type: "mandatory" }], formCards: null, attachments: null,
    };
    const r = await request(server).patch("/api/tenders/t1").set(as("owner-co")).send(edit);
    expect(r.status).toBe(200);
    expect(m.updates[0]).toEqual(edit);
  });

  it("malformed input is rejected with the documented 400 and nothing is written", async () => {
    const r = await request(server).patch("/api/tenders/t1").set(as("owner-co")).send({ title: 42, ...SELF_APPROVAL });
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ message: "Invalid tender data" });
    expect(m.updates).toHaveLength(0);
  });

  it("another company still cannot edit (unchanged)", async () => {
    const r = await request(server).patch("/api/tenders/t1").set(as("other-co")).send({ title: "x" });
    expect(r.status).toBe(403);
    expect(m.updates).toHaveLength(0);
  });
});

describe("S8 create (POST /api/tenders → launchTenderFromPayload)", () => {
  const create = (body: Record<string, unknown>) => request(server).post("/api/tenders").set(as("owner-co")).send(body);
  const base = { title: "New RFP", description: "d", deadline: "2099-12-31", targetAudienceTypes: ["company"] };

  it("CHAIN: a request cannot be created already approved for the marketplace", async () => {
    const r = await create({ ...base, ...SELF_APPROVAL, publishToMarketplace: false });
    expect(r.status).toBe(200);
    expect(m.created).toHaveLength(1);
    // The launch sets these five itself; nothing else server-controlled may come from the payload.
    const { companyId, createdBy, status, invitationToken, allowConditionalSubmission, ...fromPayload } = m.created[0];
    expect({ companyId, createdBy, status, allowConditionalSubmission }).toEqual({ companyId: "owner-co", createdBy: "owner-co-user", status: "published", allowConditionalSubmission: false });
    expect(invitationToken).not.toBe("mine");
    expectNoServerControlled(fromPayload);
    expect(m.updates.some((u) => "marketplaceStatus" in u)).toBe(false);
  });

  it("requesting marketplace publication at creation records a PENDING request, never an approval", async () => {
    const r = await create({ ...base, ...SELF_APPROVAL, publishToMarketplace: true, marketplaceTenderType: "open_tender" });
    expect(r.status).toBe(200);
    const moderation = m.updates.find((u) => "marketplaceStatus" in u)!;
    expect(moderation).toMatchObject({ isMarketplace: true, marketplaceStatus: "pending", tenderType: "open_tender" });
    expect(moderation).not.toHaveProperty("marketplaceApprovedBy");
    expect(moderation.referenceNumber).not.toBe("BID-FORGED");
  });
});

describe("S8 publication paths keep their behaviour", () => {
  it("owner marketplace submission (POST /api/tenders/:id/marketplace-submit) still records a pending request", async () => {
    const r = await request(server).post("/api/tenders/t1/marketplace-submit").set(as("owner-co"))
      .send({ tenderType: "framework_agreement", marketplaceStatus: "approved", marketplaceApprovedBy: "owner-co-user" });
    expect(r.status).toBe(200);
    const u = m.updates.find((x) => "marketplaceStatus" in x)!;
    expect(u).toMatchObject({ isMarketplace: true, marketplaceStatus: "pending", tenderType: "framework_agreement" });
    expect(u).not.toHaveProperty("marketplaceApprovedBy");
  });

  it("only a platform admin approves (POST /api/admin/marketplace/:id/approve), recorded with the admin's identity", async () => {
    m.tender = { ...m.tender, isMarketplace: true, marketplaceStatus: "pending" };
    const owner = await request(server).post("/api/admin/marketplace/t1/approve").set(as("owner-co")).send({});
    expect(owner.status).toBe(403);
    expect(m.approvals).toHaveLength(0);
    const admin = await request(server).post("/api/admin/marketplace/t1/approve").set(as("admin-co", "admin-user")).send({});
    expect(admin.status).toBe(200);
    expect(m.approvals).toEqual([{ id: "t1", adminId: "admin-user" }]);
  });
});

describe("createTenderSchema contract", () => {
  it("strips every server-controlled field and keeps editable ones", () => {
    const all = Object.fromEntries(SERVER_CONTROLLED.map((k) => [k, k.endsWith("At") ? new Date() : "x"]));
    const parsed = createTenderSchema.partial().parse({ ...all, title: "kept" });
    expect(parsed).toEqual({ title: "kept" });
  });
});
