// A-R2 / A-R3 through the OTHER write path: PUT /api/companies/:id/profile in
// server/routes.ts. Its legal fields must obey the same verification lock and
// the same "invalidate, don't submit" rule as the verification flow, while the
// rest of the profile stays editable.
//
// The real server/routes.ts is registered; the database is the in-memory fake
// (tests/helpers/fake-verification-db.ts) and every other storage call is a stub.

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { createFakeDb } from "./helpers/fake-verification-db";

const m = vi.hoisted(() => ({
  fake: null as unknown as ReturnType<typeof createFakeDb>,
  profileUpdates: [] as Record<string, unknown>[],
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (col: unknown, val: unknown) => ({ op: "eq", col, val }),
    ne: (col: unknown, val: unknown) => ({ op: "ne", col, val }),
    and: (...parts: unknown[]) => ({ op: "and", parts: parts.filter(Boolean) }),
    inArray: (col: unknown, vals: unknown[]) => ({ op: "inArray", col, vals }),
    desc: (col: unknown) => col,
  };
});
vi.mock("../server/db", async () => {
  const { createFakeDb } = await import("./helpers/fake-verification-db");
  m.fake = createFakeDb();
  return { db: m.fake.db, pool: { on: () => undefined, query: async () => ({ rows: [] }) } };
});
vi.mock("../server/storage", () => {
  const known: Record<string, (...a: any[]) => unknown> = {
    getUser: async (id: string) => ({ id, otpVerified: true, isAdmin: false, lastLoginAt: new Date() }),
    getUserRoleInCompany: async () => "owner",
    getCompany: async (id: string) => m.fake.rows.companies().find((c) => c.id === id),
    getCompanyProfile: async (companyId: string) => ({ companyId, displayName: "Noor", whatsappNumber: null }),
    updateCompanyProfile: async (_id: string, u: Record<string, unknown>) => { m.profileUpdates.push(u); return u; },
    updateCompany: async (id: string, u: Record<string, unknown>) => {
      const c = m.fake.rows.companies().find((x) => x.id === id)!;
      Object.assign(c, u);
      return c;
    },
  };
  // Anything else the router touches at registration or on these requests is a harmless stub.
  const storage = new Proxy(known, { get: (t, k: string) => t[k] ?? (async () => undefined) });
  return { storage };
});

let app: express.Express;

let server: TestServer;

afterAll(() => stopTestServer(server));
const token = () => jwt.sign({ userId: "u1", activeCompanyId: "c1", roleInCompany: "owner" }, process.env.JWT_SECRET!);
const put = (body: Record<string, unknown>) =>
  request(server).put("/api/companies/c1/profile").set("Authorization", `Bearer ${token()}`).send(body);
const company = () => m.fake.rows.companies()[0];

beforeAll(async () => {
  const { registerRoutes } = await import("../server/routes");
  app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 30_000);

beforeEach(() => {
  for (const list of [m.fake.rows.companies(), m.fake.rows.documents(), m.fake.rows.activity(), m.fake.rows.notifications()]) list.length = 0;
  m.profileUpdates = [];
});

function seed(status: string) {
  m.fake.rows.companies().push({
    id: "c1", name: "Noor", slug: "noor", accountType: "company", onboardingState: "completed",
    verificationStatus: status, legalName: "Al Noor Trading", crNumber: "1010123456", vatNumber: null, city: "Riyadh", verifiedAt: null,
  });
}

describe("PUT /api/companies/:id/profile and verification data", () => {
  it("refuses a legal-detail change while under review and writes nothing", async () => {
    seed("under_review");
    const res = await put({ displayName: "Noor Co", crNumber: "1010999999" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("VERIFICATION_LOCKED");
    expect(company().crNumber).toBe("1010123456");
    expect(m.profileUpdates).toHaveLength(0);
  });

  it("refuses a city change while under review (city is part of the request)", async () => {
    seed("under_review");
    expect((await put({ city: "Jeddah" })).status).toBe(409);
    expect(company().city).toBe("Riyadh");
  });

  it("keeps unrelated profile fields editable while under review, including re-sending unchanged legal values", async () => {
    seed("under_review");
    const res = await put({ displayName: "Noor Co", bio: "We build things.", legalName: "Al Noor Trading", crNumber: "1010123456" });
    expect(res.status).toBe(200);
    expect(m.profileUpdates[0]).toMatchObject({ displayName: "Noor Co", bio: "We build things." });
    expect(company().verificationStatus).toBe("under_review");
  });

  it("removes a verified badge on an identity change without submitting anything", async () => {
    seed("verified");
    const res = await put({ legalName: "Al Noor Group" });
    expect(res.status).toBe(200);
    expect(company()).toMatchObject({ legalName: "Al Noor Group", verificationStatus: "not_verified", verifiedAt: null });
    expect(m.fake.rows.notifications()).toHaveLength(0);
  });

  it("rejects a malformed CR number", async () => {
    seed("not_verified");
    expect((await put({ crNumber: "12" })).status).toBe(400);
  });
});
