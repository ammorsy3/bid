// /api/companies/:companyId/offerings (BID-OFFERING-CLASSIFICATION): who may
// read and change an organization's offerings, what the server trusts, and how
// failures are answered. The store is a recording fake here; its decision logic
// is tests/offering-selection.test.ts (planSave) and its transactions are
// tests/offerings.integration.test.ts (real Postgres).

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";

const m = vi.hoisted(() => ({
  roles: {} as Record<string, string>, // `${user}:${company}` -> role
  saves: [] as any[],
  requesterOnly: [] as any[],
  events: [] as any[],
  fail: null as null | Error,
}));

vi.mock("../server/db", () => ({ db: {} }));
vi.mock("../server/storage", () => ({
  storage: {
    getUserRoleInCompany: async (u: string, c: string) => m.roles[`${u}:${c}`] ?? null,
    logProductEvent: async (e: any) => { m.events.push(e); return e; },
  },
}));

import { registerOfferingRoutes } from "../server/routes/offerings";
import { OfferingError } from "../server/lib/offering-store";

const PRIVATE = { groupId: "BID-D01-F01-G03", itemIds: [], declared: true };
const state = (over: Record<string, unknown> = {}) => ({
  status: "registered", revision: 3, catalogueVersion: "registration-1.0-draft", registeredAt: null, updatedAt: null,
  selection: { groups: [PRIVATE] }, ...over,
});
const fakeStore = {
  read: async () => state(),
  status: async () => "registered",
  save: async (args: any) => {
    m.saves.push(args);
    if (m.fail) throw m.fail;
    return { state: state({ revision: args.expectedRevision + 1, selection: args.selection }), changed: true, completedRegistration: true };
  },
  declareRequesterOnly: async (args: any) => { m.requesterOnly.push(args); return state({ status: "requester_only", selection: { groups: [] } }); },
};

const app = express();
app.use(express.json());
const authenticateToken = (req: any, _res: any, next: any) => {
  req.auth = { userId: req.get("x-user"), activeCompanyId: req.get("x-company") ?? null, roleInCompany: "owner", isAdmin: req.get("x-admin") === "1" };
  next();
};
registerOfferingRoutes(app, { authenticateToken, requireCompanyContext: (_q, _s, n) => n(), store: () => fakeStore as any });

let server: TestServer;
beforeAll(async () => { server = await startTestServer(app); });
afterAll(async () => { await stopTestServer(server); });
beforeEach(() => {
  m.roles = { "owner-u:org-a": "owner", "admin-u:org-a": "admin", "bd-u:org-a": "business_developer", "member-u:org-a": "member", "viewer-u:org-a": "viewer", "owner-b:org-b": "owner" };
  m.saves = []; m.requesterOnly = []; m.events = []; m.fail = null;
});

const as = (user: string, company: string | null = "org-a", admin = false) =>
  ({ "x-user": user, ...(company ? { "x-company": company } : {}), ...(admin ? { "x-admin": "1" } : {}) });
const body = (over: Record<string, unknown> = {}) => ({ expectedRevision: 3, groups: [PRIVATE], ...over });

describe("reading offerings", () => {
  it.each(["owner-u", "admin-u", "bd-u", "member-u", "viewer-u"])("%s (a member) reads them; only owner/admin may edit", async (user) => {
    const r = await request(server).get("/api/companies/org-a/offerings").set(as(user));
    expect(r.status).toBe(200);
    expect(r.body.groups).toEqual([PRIVATE]);
    expect(r.body.canEdit).toBe(user === "owner-u" || user === "admin-u");
    expect(r.headers["cache-control"]).toBe("private, no-store");
  });

  it("another organization, a stale JWT workspace, a removed member and a platform admin's JWT get nothing", async () => {
    const cases = [
      ["owner-b", "org-b", "/api/companies/org-a/offerings", 403, "WRONG_WORKSPACE"], // switching never reuses another org's data
      ["owner-b", "org-a", "/api/companies/org-a/offerings", 403, "NOT_A_MEMBER"],    // JWT says org-a, membership says no
      ["gone-u", "org-a", "/api/companies/org-a/offerings", 403, "NOT_A_MEMBER"],
    ] as const;
    for (const [user, company, url, status, code] of cases) {
      const r = await request(server).get(url).set(as(user, company));
      expect([user, r.status, r.body.code]).toEqual([user, status, code]);
      expect(JSON.stringify(r.body)).not.toContain("BID-");
    }
    const admin = await request(server).get("/api/companies/org-a/offerings").set(as("platform-admin", "org-a", true));
    expect([admin.status, admin.body.code]).toEqual([403, "NOT_A_MEMBER"]); // no implicit admin bypass
  });
});

describe("saving offerings", () => {
  it("owner and admin save; the company comes from the URL and active workspace, never the body", async () => {
    for (const user of ["owner-u", "admin-u"]) {
      const r = await request(server).put("/api/companies/org-a/offerings").set(as(user)).send(body());
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ status: "registered", revision: 4, changed: true, completedRegistration: true });
    }
    expect(m.saves.map((s) => [s.companyId, s.actorId])).toEqual([["org-a", "owner-u"], ["org-a", "admin-u"]]);
    expect(m.events).toEqual([
      expect.objectContaining({ eventType: "vendor_registration_completed", companyId: "org-a", metadata: {} }),
      expect.objectContaining({ eventType: "vendor_registration_completed", companyId: "org-a", metadata: {} }),
    ]);
  });

  it.each(["bd-u", "member-u", "viewer-u"])("%s cannot change them", async (user) => {
    const r = await request(server).put("/api/companies/org-a/offerings").set(as(user)).send(body());
    expect([r.status, r.body.code]).toEqual([403, "ROLE_REQUIRED"]);
    expect(m.saves).toHaveLength(0);
  });

  it("a different organization's offerings cannot be written, even by its own owner from another workspace", async () => {
    const r = await request(server).put("/api/companies/org-a/offerings").set(as("owner-b", "org-b")).send(body());
    expect(r.status).toBe(403);
    expect(m.saves).toHaveLength(0);
  });

  it("mass assignment: status, company, role and unknown fields are refused, not ignored", async () => {
    for (const extra of [{ status: "registered" }, { companyId: "org-b" }, { role: "owner" }, { revision: 99 }, { completed: true }]) {
      const r = await request(server).put("/api/companies/org-a/offerings").set(as("owner-u")).send(body(extra));
      expect([JSON.stringify(extra), r.status, r.body.code]).toEqual([JSON.stringify(extra), 400, "INVALID_REQUEST"]);
    }
    for (const bad of [{ groups: [{ groupId: "BID-D01", itemIds: [], declared: true }] }, { expectedRevision: "3" }, { groups: "all" }]) {
      expect((await request(server).put("/api/companies/org-a/offerings").set(as("owner-u")).send(body(bad))).status).toBe(400);
    }
    expect(m.saves).toHaveLength(0);
  });

  it("store refusals pass through with their code and no selections; unexpected failures say nothing was saved", async () => {
    m.fail = new OfferingError(409, "OFFERINGS_CONFLICT", "changed elsewhere", { currentRevision: 7 });
    let r = await request(server).put("/api/companies/org-a/offerings").set(as("owner-u")).send(body());
    expect([r.status, r.body.code, r.body.currentRevision]).toEqual([409, "OFFERINGS_CONFLICT", 7]);
    expect(JSON.stringify(r.body)).not.toContain("BID-");
    m.fail = new OfferingError(422, "LAST_OFFERING_REQUIRED", "keep one");
    r = await request(server).put("/api/companies/org-a/offerings").set(as("owner-u")).send(body({ groups: [] }));
    expect([r.status, r.body.code]).toEqual([422, "LAST_OFFERING_REQUIRED"]);
    m.fail = new Error("connection reset");
    r = await request(server).put("/api/companies/org-a/offerings").set(as("owner-u")).send(body());
    expect([r.status, r.body.code]).toEqual([500, "SAVE_FAILED"]);
    expect(m.events).toHaveLength(0); // no completion event without a commit
  });

  it("activation of vendor capabilities is passed only when explicitly requested", async () => {
    await request(server).put("/api/companies/org-a/offerings").set(as("owner-u")).send(body());
    await request(server).put("/api/companies/org-a/offerings").set(as("owner-u")).send(body({ activateVendor: true }));
    expect(m.saves.map((s) => s.activateVendor)).toEqual([false, true]);
  });
});

describe("requester-only declaration", () => {
  it("owner/admin only, with the revision they saw", async () => {
    expect((await request(server).post("/api/companies/org-a/vendor-registration/requester-only").set(as("member-u")).send({ expectedRevision: 0 })).status).toBe(403);
    const r = await request(server).post("/api/companies/org-a/vendor-registration/requester-only").set(as("admin-u")).send({ expectedRevision: 0 });
    expect([r.status, r.body.status]).toEqual([200, "requester_only"]);
    expect(m.requesterOnly).toEqual([{ companyId: "org-a", actorId: "admin-u", expectedRevision: 0 }]);
    expect((await request(server).post("/api/companies/org-a/vendor-registration/requester-only").set(as("admin-u")).send({ expectedRevision: 0, status: "registered" })).status).toBe(400);
  });
});
