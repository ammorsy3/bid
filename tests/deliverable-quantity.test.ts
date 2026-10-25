// BID-UX-BUGFIX item 2a + product decision P6: quantities are > 0, ≤ 1e9 and
// ≤ 4 decimal places, entered in ASCII or Arabic digits, and NEVER rounded —
// in the shared parser, the tender write contract (create and edit) and the
// copilot mapping. The real routes run with in-memory storage (no database).

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import { parseQuantity, normalizeDigits, quantityErrorMessage } from "../shared/quantity";
import { createTenderSchema } from "../shared/schema";
import { draftToTenderPayload } from "../shared/tender-mapping";

const m = vi.hoisted(() => ({ tender: null as any, created: [] as any[], updates: [] as any[] }));

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
    getOffersByTender: async () => [], // no offers yet, so the P8 specification lock does not apply
    createTender: async (t: any) => { m.created.push(t); return { id: "t-new", ...t }; },
    updateTender: async (_id: string, u: any) => { m.updates.push(u); return { ...m.tender, ...u }; },
    getCompanyMembers: async () => [],
    filterRecipientsByPreference: async (r: unknown[]) => r,
  };
  return { storage: new Proxy(known, { get: (t, k: string) => t[k] ?? (async () => undefined) }) };
});

let server: TestServer;
const owner = { Authorization: `Bearer ${jwt.sign({ userId: "owner-co-user", activeCompanyId: "owner-co", roleInCompany: "owner" }, process.env.JWT_SECRET!)}` };
const deliverable = (quantity: unknown) => ({ id: "d1", name: "Cement", description: "", unit: "bag", quantity });

beforeAll(async () => {
  const { registerRoutes } = await import("../server/routes");
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 60_000);
afterAll(() => stopTestServer(server));
beforeEach(() => {
  m.tender = { id: "t1", companyId: "owner-co", createdBy: "owner-co-user", title: "RFP", description: "d", deadline: "2099-12-31", status: "published", invitationToken: "tok" };
  m.created = [];
  m.updates = [];
});

describe("parseQuantity", () => {
  it.each([
    ["1", 1, "1"], ["2.5", 2.5, "2.5"], ["0.0001", 0.0001, "0.0001"], ["1000000000", 1e9, "1000000000"],
    ["12.3400", 12.34, "12.34"], ["007", 7, "7"], [" 3 ", 3, "3"], [3, 3, "3"], [2.25, 2.25, "2.25"],
    ["١٢٫٥", 12.5, "12.5"], ["۳", 3, "3"],
  ])("accepts %j", (input, value, text) => {
    expect(parseQuantity(input)).toEqual({ ok: true, value, text });
  });

  it.each([
    ["", "empty"], ["   ", "empty"], [null, "empty"], [undefined, "empty"],
    ["0", "nonPositive"], ["0.0000", "nonPositive"], [0, "nonPositive"], ["-1", "nonPositive"],
    ["1.23456", "precision"], [1.23456, "precision"],
    ["1000000000.0001", "range"], [1e9 + 1, "range"],
    ["1e3", "invalid"], [1e-7, "invalid"], ["1,000", "invalid"], ["1 000", "invalid"], ["+1", "invalid"], [".5", "invalid"],
    ["5.", "invalid"], ["abc", "invalid"], [NaN, "invalid"], [Infinity, "invalid"], [{}, "invalid"], [true, "invalid"],
  ])("rejects %j as %s — never rounds", (input, error) => {
    expect(parseQuantity(input)).toEqual({ ok: false, error });
  });

  it("normalises Arabic digits and the Arabic decimal separator only", () => {
    expect(normalizeDigits("٠١٢٣٤٥٦٧٨٩٫۴")).toBe("0123456789.4");
  });

  it("maps errors to the supplied copy keys", () => {
    expect(quantityErrorMessage("precision").key).toBe("validation.quantityPrecision");
    expect(quantityErrorMessage("range")).toEqual({ key: "validation.valueOutOfRange", vars: { min: "0.0001", max: "1,000,000,000" } });
    expect(quantityErrorMessage("empty").key).toBe("boq.quantityInvalid");
    expect(quantityErrorMessage("nonPositive").key).toBe("boq.quantityInvalid");
  });
});

describe("tender write contract", () => {
  it("createTenderSchema keeps fractional quantities exactly and rejects too many decimals", () => {
    expect(createTenderSchema.parse({ title: "t", description: "d", deadline: "2099-01-01", deliverables: [deliverable("2.5")] }).deliverables?.[0].quantity).toBe(2.5);
    expect(() => createTenderSchema.parse({ title: "t", description: "d", deadline: "2099-01-01", deliverables: [deliverable(2.12345)] })).toThrow();
  });

  it("PATCH stores 1.5, 0.0001 and Arabic-digit quantities as exact numbers", async () => {
    for (const [input, stored] of [["1.5", 1.5], [0.0001, 0.0001], ["١٫٢٥", 1.25], [12, 12]] as const) {
      m.updates = [];
      const r = await request(server).patch("/api/tenders/t1").set(owner).send({ deliverables: [deliverable(input)] });
      expect([input, r.status]).toEqual([input, 200]);
      expect(m.updates[0].deliverables[0].quantity).toBe(stored);
    }
  });

  it.each([["2.55555", "precision"], [0, "nonPositive"], ["", "empty"], ["1e2", "invalid"], ["2000000000", "range"]])(
    "PATCH rejects %j (%s) with a structured 400 and writes nothing",
    async (input, reason) => {
      const r = await request(server).patch("/api/tenders/t1").set(owner).send({ title: "x", deliverables: [{ ...deliverable(1), id: "d0" }, deliverable(input)] });
      expect([r.status, r.body.code, r.body.reason, r.body.field]).toEqual([400, "INVALID_QUANTITY", reason, "deliverables.1.quantity"]);
      expect(m.updates).toHaveLength(0);
    },
  );

  it("create (POST /api/tenders) applies the same rule", async () => {
    const base = { title: "New RFP", description: "d", deadline: "2099-12-31", targetAudienceTypes: ["company"] };
    const ok = await request(server).post("/api/tenders").set(owner).send({ ...base, deliverables: [deliverable("3.75")] });
    expect(ok.status).toBe(200);
    expect(m.created[0].deliverables[0].quantity).toBe(3.75);
    const bad = await request(server).post("/api/tenders").set(owner).send({ ...base, deliverables: [deliverable("3.75001")] });
    expect([bad.status, bad.body.code, bad.body.reason]).toEqual([400, "INVALID_QUANTITY", "precision"]);
    expect(m.created).toHaveLength(1);
  });
});

describe("copilot mapping (shared/tender-mapping.ts)", () => {
  it("keeps a valid fractional quantity exactly instead of rounding it", () => {
    const out = draftToTenderPayload({ deliverables: [{ name: "Steel", unit: "ton", quantity: 2.5 }, { name: "Paint", unit: "L", quantity: "0.75" }] });
    expect(out.deliverables.map((d: any) => d.quantity)).toEqual([2.5, 0.75]);
  });

  it("falls back to 1 only for a missing or invalid quantity (as before)", () => {
    const out = draftToTenderPayload({ deliverables: [{ name: "A", quantity: 0 }, { name: "B" }, { name: "C", quantity: 1.123456 }] });
    expect(out.deliverables.map((d: any) => d.quantity)).toEqual([1, 1, 1]);
  });
});
