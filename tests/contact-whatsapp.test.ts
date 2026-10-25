// BID-UX-BUGFIX item 5 + decision D3: the requester picks WhatsApp or email.
// A WhatsApp number is any usual spelling of a Saudi mobile, stored as
// "9665XXXXXXXX"; anything else is refused on the client and by the server.
// The real routes run with in-memory storage (no database).

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import { normalizeSaudiMobile, formatSaudiMobile, whatsappLink, contactProblem, isValidContactEmail } from "../shared/whatsapp";
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
    createTender: async (t: any) => { m.created.push(t); return { id: "t-new", ...t }; },
    updateTender: async (_id: string, u: any) => { m.updates.push(u); return { ...m.tender, ...u }; },
    getCompanyMembers: async () => [],
    filterRecipientsByPreference: async (r: unknown[]) => r,
  };
  return { storage: new Proxy(known, { get: (t, k: string) => t[k] ?? (async () => undefined) }) };
});

let server: TestServer;
const owner = { Authorization: `Bearer ${jwt.sign({ userId: "owner-co-user", activeCompanyId: "owner-co", roleInCompany: "owner" }, process.env.JWT_SECRET!)}` };
const base = { title: "New RFP", description: "d", deadline: "2099-12-31", targetAudienceTypes: ["company"] };

beforeAll(async () => {
  const { registerRoutes } = await import("../server/routes");
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 60_000);
afterAll(() => stopTestServer(server));
beforeEach(() => {
  m.tender = { id: "t1", companyId: "owner-co", createdBy: "owner-co-user", title: "RFP", description: "d", deadline: "2099-12-31",
    status: "published", invitationToken: "tok", inquiryType: "email_whatsapp", whatsappContact: "wa.me/966501234567", emailContact: null };
  m.created = [];
  m.updates = [];
});

describe("normalizeSaudiMobile", () => {
  it.each([
    "0501234567", "05 0123 4567", "050-123-4567", "501234567", "966501234567", "+966501234567", "+966 50 123 4567",
    "00966501234567", "00 966 50 123 4567", "+966 0501234567", "٠٥٠١٢٣٤٥٦٧", "+٩٦٦٥٠١٢٣٤٥٦٧", "(050) 123.4567",
  ])("accepts %j → 966501234567", (raw) => {
    expect(normalizeSaudiMobile(raw)).toBe("966501234567");
  });

  it.each([
    "", "05", "050123456", "05012345678", "0112345678", "+971501234567", "971501234567", "00971501234567",
    "wa.me/966501234567", "https://wa.me/966501234567", "05O1234567", "+", "966", "4501234567", null, 501234567,
  ])("rejects %j", (raw) => {
    expect(normalizeSaudiMobile(raw as any)).toBeNull();
  });

  it("formats for display and builds the wa.me link (legacy free text keeps its old link)", () => {
    expect(formatSaudiMobile("966501234567")).toBe("+966 50 123 4567");
    expect(whatsappLink("966501234567")).toBe("https://wa.me/966501234567");
    expect(whatsappLink("0501234567")).toBe("https://wa.me/966501234567");
    expect(whatsappLink("wa.me/966501234567")).toBe("https://wa.me/966501234567");
    expect(whatsappLink("")).toBeNull();
  });

  it("contactProblem: email_whatsapp needs one channel; inside_bid needs none", () => {
    expect(contactProblem({ inquiryType: "email_whatsapp" })).toBe("missing");
    expect(contactProblem({ inquiryType: "email_whatsapp", whatsappContact: "966501234567" })).toBeNull();
    expect(contactProblem({ inquiryType: "email_whatsapp", emailContact: "a@b.co" })).toBeNull();
    expect(contactProblem({ inquiryType: "inside_bid" })).toBeNull();
    expect(isValidContactEmail("a@b.co")).toBe(true);
    expect(isValidContactEmail("a@b")).toBe(false);
  });
});

describe("create (POST /api/tenders)", () => {
  const create = (body: Record<string, unknown>) => request(server).post("/api/tenders").set(owner).send({ ...base, ...body });

  it("stores the normalised number for WhatsApp only", async () => {
    const r = await create({ inquiryType: "email_whatsapp", whatsappContact: "05 0123 4567" });
    expect(r.status).toBe(200);
    expect([m.created[0].whatsappContact, m.created[0].emailContact]).toEqual(["966501234567", undefined]);
  });

  it("email only needs no phone", async () => {
    const r = await create({ inquiryType: "email_whatsapp", emailContact: "rfp@example.test" });
    expect(r.status).toBe(200);
    expect(m.created[0].emailContact).toBe("rfp@example.test");
  });

  it.each([
    [{ inquiryType: "email_whatsapp", whatsappContact: "05" }, "whatsapp", "whatsappContact"],
    [{ inquiryType: "email_whatsapp", whatsappContact: "0501234567890" }, "whatsapp", "whatsappContact"],
    [{ inquiryType: "email_whatsapp", whatsappContact: "+971501234567" }, "whatsapp", "whatsappContact"],
    [{ inquiryType: "email_whatsapp", emailContact: "not-an-email" }, "email", "emailContact"],
    [{ inquiryType: "email_whatsapp" }, "missing", "emailContact"],
    [{ inquiryType: "email_whatsapp", whatsappContact: "", emailContact: "" }, "missing", "emailContact"],
  ])("refuses %j (%s) with a structured 400 and creates nothing", async (body, reason, field) => {
    const r = await create(body);
    expect([r.status, r.body.code, r.body.reason, r.body.field]).toEqual([400, "INVALID_CONTACT", reason, field]);
    expect(m.created).toHaveLength(0);
  });

  it("inside_bid needs no external contact", async () => {
    expect((await create({ inquiryType: "inside_bid" })).status).toBe(200);
  });
});

describe("edit (PATCH /api/tenders/:id)", () => {
  const patch = (body: Record<string, unknown>) => request(server).patch("/api/tenders/t1").set(owner).send(body);

  it("a request saved before the rule stays editable while its contact is unchanged", async () => {
    const r = await patch({ title: "Renamed", whatsappContact: "wa.me/966501234567" });
    expect(r.status).toBe(200);
    expect(m.updates[0]).toEqual({ title: "Renamed" });
  });

  it("a changed number is validated and normalised", async () => {
    expect((await patch({ whatsappContact: "+٩٦٦٥٠١٢٣٤٥٦٧" })).status).toBe(200);
    expect(m.updates[0].whatsappContact).toBe("966501234567");
    m.updates = [];
    const bad = await patch({ whatsappContact: "12345" });
    expect([bad.status, bad.body.code, bad.body.reason]).toEqual([400, "INVALID_CONTACT", "whatsapp"]);
    expect(m.updates).toHaveLength(0);
  });

  it("switching to email clears WhatsApp; clearing both for email_whatsapp is refused", async () => {
    const ok = await patch({ whatsappContact: "", emailContact: "rfp@example.test" });
    expect(ok.status).toBe(200);
    expect(m.updates[0]).toEqual({ whatsappContact: null, emailContact: "rfp@example.test" });
    m.updates = [];
    const bad = await patch({ whatsappContact: "", emailContact: "" });
    expect([bad.status, bad.body.reason]).toEqual([400, "missing"]);
    expect(m.updates).toHaveLength(0);
  });
});

describe("copilot mapping", () => {
  it("normalises a usable number and drops an unusable one (never guesses)", () => {
    expect(draftToTenderPayload({ inquiryType: "email_whatsapp", whatsappContact: "0501234567" }).whatsappContact).toBe("966501234567");
    expect("whatsappContact" in draftToTenderPayload({ inquiryType: "email_whatsapp", whatsappContact: "call me" })).toBe(false);
    expect("emailContact" in draftToTenderPayload({ emailContact: "nope" })).toBe(false);
  });
});
