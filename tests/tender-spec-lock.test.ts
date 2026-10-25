// P8 (closes S3 for legacy requests): once a request has offers, the fields
// vendors priced against cannot change. Unchanged re-sends and the editable
// fields still save. The real PATCH route runs with in-memory storage.

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import { lockedSpecChanges, SPEC_LOCKED_FIELDS } from "../shared/tender-spec-lock";

const m = vi.hoisted(() => ({ tender: null as any, offers: [] as any[], updates: [] as any[] }));

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
    getUser: async (id: string) => ({ id, email: `${id}@example.test`, otpVerified: true, isAdmin: false, lastLoginAt: new Date() }),
    getUserRoleInCompany: async () => "owner",
    getCompany: async (id: string) => ({ id, name: id, accountType: "company", verificationStatus: "verified", isActive: true }),
    getTender: async () => (m.tender ? { ...m.tender } : undefined),
    getOffersByTender: async () => m.offers,
    updateTender: async (_id: string, u: any) => { m.updates.push(u); return { ...m.tender, ...u }; },
    getCompanyMembers: async () => [],
  };
  return { storage: new Proxy(known, { get: (t, k: string) => t[k] ?? (async () => undefined) }) };
});

let server: TestServer;
const owner = { Authorization: `Bearer ${jwt.sign({ userId: "owner-co-user", activeCompanyId: "owner-co", roleInCompany: "owner" }, process.env.JWT_SECRET!)}` };
const DELIVERABLES = [{ id: "d1", name: "Cement", description: "", unit: "Bag", quantity: 100 }];

beforeAll(async () => {
  const { registerRoutes } = await import("../server/routes");
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 60_000);
afterAll(() => stopTestServer(server));
beforeEach(() => {
  m.tender = { id: "t1", companyId: "owner-co", createdBy: "owner-co-user", title: "RFP", description: "Supply cement", deadline: "2099-12-31",
    status: "published", invitationToken: "tok", inquiryType: "email_whatsapp", emailContact: "rfp@example.test",
    submissionType: "quote_only", deliverables: DELIVERABLES.map((d) => ({ ...d, legacyExtra: "kept" })) };
  m.offers = [{ id: "o1", status: "pending" }];
  m.updates = [];
});

const patch = (body: Record<string, unknown>) => request(server).patch("/api/tenders/t1").set(owner).send(body);

describe("PATCH /api/tenders/:id with offers (P8)", () => {
  it("refuses a quantity change (the S3 reproduction: 100 → 5) and writes nothing", async () => {
    const r = await patch({ deliverables: [{ ...DELIVERABLES[0], quantity: 5 }] });
    expect([r.status, r.body.code, r.body.fields]).toEqual([409, "SPEC_LOCKED", ["deliverables"]]);
    expect(m.updates).toHaveLength(0);
  });

  it.each([
    ["description", { description: "Supply steel" }],
    ["submissionType", { submissionType: "tech_fin_proposal" }],
    ["deliverables", { deliverables: [...DELIVERABLES, { id: "d2", name: "Sand", unit: "Ton", quantity: 1 }] }],
    ["deliverables", { deliverables: [] }],
  ])("refuses a change to %s", async (field, body) => {
    const r = await patch(body);
    expect([r.status, r.body.fields]).toEqual([409, [field]]);
  });

  it("accepts a full re-send of the stored specification plus editable changes", async () => {
    const r = await patch({ title: "Renamed", deadline: "2099-12-30", description: "Supply cement", submissionType: "quote_only",
      deliverables: [{ ...DELIVERABLES[0], quantity: "100" }] });
    expect(r.status).toBe(200);
    expect(m.updates[0].title).toBe("Renamed");
  });

  it("without offers the specification stays editable", async () => {
    m.offers = [];
    const r = await patch({ deliverables: [{ ...DELIVERABLES[0], quantity: 5 }] });
    expect(r.status).toBe(200);
    expect(m.updates[0].deliverables[0].quantity).toBe(5);
  });
});

describe("lockedSpecChanges", () => {
  it("treats missing, null and empty as the same value, and numbers by value", () => {
    expect(lockedSpecChanges({ objective: null, deliverables: [{ id: "a", quantity: 2 }] }, { objective: "", deliverables: [{ id: "a", quantity: "2", description: "" }] })).toEqual([]);
  });
  it("ignores fields that are not locked", () => {
    expect(lockedSpecChanges({ title: "a", budget: "1" }, { title: "b", budget: "2" })).toEqual([]);
    expect(SPEC_LOCKED_FIELDS).not.toContain("deadline");
  });
});
