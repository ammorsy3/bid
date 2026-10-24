// Company verification request (BID-UX-BUGFIX-20261020, package A).
//
// The real routes and the real store (server/lib/company-verification-store.ts)
// run against tests/helpers/fake-verification-db.ts, which models row locks and
// rollback and interleaves concurrent requests. Only identity lookups are faked
// in storage. What this cannot prove — Postgres's own FOR UPDATE behaviour — is
// covered by the opt-in tests/company-verification-locking.integration.test.ts.

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import express from "express";
import request from "supertest";
import { isUploadObjectPath, missingVerificationItems } from "../shared/company-verification";
import type { createFakeDb } from "./helpers/fake-verification-db";

const m = vi.hoisted(() => ({
  fake: null as unknown as ReturnType<typeof createFakeDb>,
  role: "owner" as string | null,
  objectOwner: "u1" as string | null,
  objectCompany: "c1" as string | null, // company the upload was issued for (null = pending onboarding)
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  // Plain condition objects the fake database evaluates (same shapes as fakeConditions in the helper).
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
  return { db: m.fake.db };
});
vi.mock("../server/objectAcl", () => ({
  getObjectProvenance: vi.fn(async () =>
    m.objectOwner
      ? { ownerId: m.objectOwner, ownerCompanyId: m.objectCompany, provenance: m.objectCompany ? "company" : "pending_onboarding", visibility: "private" }
      : null),
}));
vi.mock("../server/storage", () => ({
  storage: {
    getCompany: vi.fn(async (id: string) => m.fake.rows.companies().find((c) => c.id === id)),
    getUserRoleInCompany: vi.fn(async () => m.role),
  },
}));

import { registerCompanyVerificationRoutes } from "../server/routes/company-verification";

const app = express();

let server: TestServer;

beforeAll(async () => { server = await startTestServer(app); });

afterAll(() => stopTestServer(server));
app.use(express.json());
const authenticate: express.RequestHandler = (req, _res, next) => {
  (req as any).auth = { userId: "u1", activeCompanyId: req.header("x-active") ?? "c1", isAdmin: false };
  next();
};
registerCompanyVerificationRoutes(app, { authenticateToken: authenticate, requireCompanyContext: (_q, _s, n) => n() });

const complete = { legalName: "Al Noor Trading", crNumber: "1010123456", city: "Riyadh" };
const company = () => m.fake.rows.companies().find((c) => c.id === "c1")!;
const docs = () => m.fake.rows.documents().filter((d) => d.companyId === "c1");
const notifications = () => m.fake.rows.notifications();
const activity = (action: string) => m.fake.rows.activity().filter((a) => a.action === action);

const submit = (headers: Record<string, string> = {}) => request(server).post("/api/companies/c1/verification/submit").set(headers);
const attach = (body: Record<string, unknown>) => request(server).post("/api/companies/c1/documents").send(body);
const save = (body: Record<string, unknown>) => request(server).patch("/api/companies/c1/verify-info").send(body);
const crDoc = (n: string) => ({ documentType: "cr_certificate", fileUrl: `/objects/uploads/${n}`, originalName: `${n}.pdf` });

function seed(overrides: Record<string, unknown> = {}, withCrDoc = false) {
  for (const list of [m.fake.rows.companies(), m.fake.rows.documents(), m.fake.rows.activity(), m.fake.rows.notifications()]) list.length = 0;
  m.fake.rows.companies().push({
    id: "c1", name: "Noor", accountType: "company", verificationStatus: "not_verified",
    legalName: null, crNumber: null, vatNumber: null, city: null, rejectionReason: null, verifiedAt: null, ...overrides,
  });
  if (withCrDoc) m.fake.rows.documents().push({ id: "old", companyId: "c1", uploadedBy: "u1", uploadedAt: new Date(0), ...crDoc("old") });
}

beforeEach(() => {
  m.role = "owner";
  m.objectOwner = "u1";
  m.objectCompany = "c1";
  m.fake.state.lockingEnabled = true;
  m.fake.state.failInsertInto = null;
  seed();
});

describe("shared rules", () => {
  it("lists every missing item and is empty when complete", () => {
    expect(missingVerificationItems({}, [])).toEqual(["legalName", "crNumber", "city", "cr_certificate"]);
    expect(missingVerificationItems({ ...complete, crNumber: "12345" }, ["cr_certificate"])).toEqual(["crNumber"]);
    expect(missingVerificationItems({ ...complete, city: "  " }, ["vat_certificate"])).toEqual(["city", "cr_certificate"]);
    expect(missingVerificationItems(complete, ["cr_certificate"])).toEqual([]);
  });
  it("accepts only private upload paths", () => {
    expect(isUploadObjectPath("/objects/uploads/3f2a-11")).toBe(true);
    expect(isUploadObjectPath("/objects/uploads/../offers/x")).toBe(false);
    expect(isUploadObjectPath("/objects/company-brochures/x")).toBe(false);
    expect(isUploadObjectPath(null)).toBe(false);
  });
});

describe("submit", () => {
  it("rejects an incomplete request and writes nothing", async () => {
    const res = await submit();
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: "VERIFICATION_INCOMPLETE", missing: ["legalName", "crNumber", "city", "cr_certificate"] });
    expect(company().verificationStatus).toBe("not_verified");
    expect(notifications()).toHaveLength(0);
  });

  it("submits a complete request with exactly one audit record and one admin notification", async () => {
    seed(complete, true);
    const res = await submit();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ verificationStatus: "under_review", alreadySubmitted: false });
    expect(company().verificationStatus).toBe("under_review");
    expect(activity("company.verification_submitted")).toHaveLength(1);
    expect(activity("company.verification_submitted")[0].metadata.documents.map((d: any) => d.fileUrl)).toEqual(["/objects/uploads/old"]);
    expect(notifications()).toHaveLength(1);
  });

  it("five concurrent submits: one submission, one notification, every caller told it is under review", async () => {
    seed(complete, true);
    const results = await Promise.all(Array.from({ length: 5 }, () => submit()));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(results.filter((r) => r.body.alreadySubmitted === false)).toHaveLength(1);
    expect(results.every((r) => r.body.verificationStatus === "under_review")).toBe(true);
    expect(activity("company.verification_submitted")).toHaveLength(1);
    expect(notifications()).toHaveLength(1);
  });

  it("an audit failure rolls the submission back: 500, still not submitted, no notification; a retry then succeeds once", async () => {
    seed(complete, true);
    const { memberActivityLog } = await import("../shared/schema");
    m.fake.state.failInsertInto = memberActivityLog;
    const failed = await submit();
    expect(failed.status).toBe(500);
    expect(failed.body.code).toBe("SUBMIT_FAILED");
    expect(company().verificationStatus).toBe("not_verified");
    expect(notifications()).toHaveLength(0);

    m.fake.state.failInsertInto = null;
    const retry = await submit();
    expect(retry.body).toMatchObject({ verificationStatus: "under_review", alreadySubmitted: false });
    expect(notifications()).toHaveLength(1);
    expect(activity("company.verification_submitted")).toHaveLength(1);
  });

  it("a notification failure rolls back status and audit too, so no committed submission ever lacks its notification", async () => {
    seed(complete, true);
    const { adminNotifications } = await import("../shared/schema");
    m.fake.state.failInsertInto = adminNotifications;
    expect((await submit()).status).toBe(500);
    expect(company().verificationStatus).toBe("not_verified");
    expect(activity("company.verification_submitted")).toHaveLength(0);
    m.fake.state.failInsertInto = null;
    expect((await submit()).body.alreadySubmitted).toBe(false);
    expect(notifications()).toHaveLength(1);
  });

  it("resubmits after rejection and clears the reason", async () => {
    seed({ ...complete, verificationStatus: "rejected", rejectionReason: "Blurry CR" }, true);
    expect((await submit()).status).toBe(200);
    expect(company()).toMatchObject({ verificationStatus: "under_review", rejectionReason: null });
    expect(notifications()[0].metadata.resubmission).toBe(true);
  });

  it("refuses verified companies, members below admin, another company and non-company workspaces", async () => {
    seed({ ...complete, verificationStatus: "verified" }, true);
    expect((await submit()).status).toBe(409);
    seed(complete, true);
    m.role = "member";
    expect((await submit()).status).toBe(403);
    m.role = "owner";
    expect((await submit({ "x-active": "c2" })).status).toBe(403);
    seed({ ...complete, accountType: "team" }, true);
    expect((await submit()).status).toBe(400);
    expect(notifications()).toHaveLength(0);
  });
});

describe("documents", () => {
  it("attaching never changes the status or notifies anyone", async () => {
    const res = await attach(crDoc("new"));
    expect(res.status).toBe(201);
    expect(company().verificationStatus).toBe("not_verified");
    expect(notifications()).toHaveLength(0);
  });

  it("A-R1: two concurrent replacements of one slot leave exactly one document, one of the two new files", async () => {
    seed(complete, true);
    const [a, b] = await Promise.all([attach(crDoc("a")), attach(crDoc("b"))]);
    expect([a.status, b.status]).toEqual([201, 201]);
    const left = docs().filter((d) => d.documentType === "cr_certificate");
    expect(left).toHaveLength(1);
    expect(["/objects/uploads/a", "/objects/uploads/b"]).toContain(left[0].fileUrl);
  });

  it("A-R1 control: the same race without the row lock loses every document (the lock is what prevents it)", async () => {
    seed(complete, true);
    m.fake.state.lockingEnabled = false;
    await Promise.all([attach(crDoc("a")), attach(crDoc("b"))]);
    expect(docs().filter((d) => d.documentType === "cr_certificate")).toHaveLength(0);
  });

  it("a replacement that fails keeps the previous document", async () => {
    seed(complete, true);
    const { memberActivityLog } = await import("../shared/schema");
    m.fake.state.failInsertInto = memberActivityLog;
    const res = await attach(crDoc("new"));
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("ATTACH_FAILED");
    expect(docs().map((d) => d.fileUrl)).toEqual(["/objects/uploads/old"]);
  });

  it("A-R2: an upload that finishes after a concurrent submit is refused and the reviewed file is untouched", async () => {
    seed(complete, true);
    const [sub, late] = await Promise.all([submit(), attach(crDoc("late"))]);
    expect(sub.body.verificationStatus).toBe("under_review");
    expect(late.status).toBe(409);
    expect(late.body.code).toBe("VERIFICATION_LOCKED");
    expect(docs().map((d) => d.fileUrl)).toEqual(["/objects/uploads/old"]);
    expect(activity("company.verification_submitted")[0].metadata.documents[0].fileUrl).toBe("/objects/uploads/old");
  });

  it("refuses a file the caller did not upload, one issued for another company, a path outside private uploads, and members below admin", async () => {
    m.objectOwner = "someone-else";
    expect((await attach(crDoc("x"))).status).toBe(400);
    m.objectOwner = "u1";
    m.objectCompany = "c2"; // R8-R1: the caller's own upload, issued for another of their companies
    expect((await attach(crDoc("x"))).body.code).toBe("INVALID_FILE");
    m.objectCompany = null; // a pending onboarding upload is not a company file
    expect((await attach(crDoc("x"))).status).toBe(400);
    m.objectCompany = "c1";
    expect((await attach({ documentType: "cr_certificate", fileUrl: "/objects/offers/sealed-bid" })).status).toBe(400);
    m.role = "member";
    expect((await attach(crDoc("x"))).status).toBe(403);
    expect(docs()).toHaveLength(0);
  });

  it("keeps several 'other' documents", async () => {
    // Each attach response is captured and checked before the final document
    // list, so a failure reports which attach failed and why (an intermittent
    // failure here was seen once in a full-suite run, cause unconfirmed).
    // The diagnostic holds only fixture data — no tokens or environment values.
    const responses: { file: string; status: number; body: unknown }[] = [];
    for (const file of ["o1", "o2"]) {
      const res = await attach({ documentType: "other", fileUrl: `/objects/uploads/${file}` });
      responses.push({ file, status: res.status, body: res.body });
    }
    const diagnostic = () => JSON.stringify({
      responses,
      companyStatus: company().verificationStatus,
      documents: docs().map((d) => ({ id: d.id, type: d.documentType, fileUrl: d.fileUrl })),
      fake: { lockingEnabled: m.fake.state.lockingEnabled, failInsertInto: !!m.fake.state.failInsertInto, role: m.role, objectOwner: m.objectOwner },
    });
    expect(responses.map((r) => r.status), diagnostic()).toEqual([201, 201]);
    expect(docs().map((d) => d.fileUrl).sort(), diagnostic()).toEqual(["/objects/uploads/o1", "/objects/uploads/o2"]);
  });
});

describe("details", () => {
  it("saves as a draft without submitting", async () => {
    const res = await save(complete);
    expect(res.status).toBe(200);
    expect(company()).toMatchObject({ ...complete, verificationStatus: "not_verified" });
    expect(notifications()).toHaveLength(0);
  });

  it("rejects an invalid CR number", async () => {
    const res = await save({ ...complete, crNumber: "12" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("crNumber: CR number must be exactly 10 digits");
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ["crNumber"], message: "CR number must be exactly 10 digits" }),
    ]));
    expect(company().crNumber).toBeNull();
  });

  it("A-R2: is locked while under review, and a save racing a submit cannot slip in after it", async () => {
    seed(complete, true);
    const [sub, late] = await Promise.all([submit(), save({ ...complete, crNumber: "1010999999" })]);
    expect(sub.body.verificationStatus).toBe("under_review");
    expect(late.status).toBe(409);
    expect(company().crNumber).toBe("1010123456");
  });

  it("A-R2: submit validates the same state it submits — a save that lands first is what gets submitted", async () => {
    seed(complete, true);
    const [saved, sub] = await Promise.all([save({ ...complete, crNumber: "1010999999" }), submit()]);
    expect(saved.status).toBe(200);
    expect(sub.status).toBe(200);
    expect(activity("company.verification_submitted")[0].metadata.details.crNumber).toBe("1010999999");
  });

  it("A-R3: changing a verified company's identity removes the badge but does NOT submit, and stays editable", async () => {
    seed({ ...complete, verificationStatus: "verified", verifiedAt: new Date() }, true);
    const res = await save({ ...complete, crNumber: "1010999999" });
    expect(res.status).toBe(200);
    expect(res.body.invalidated).toBe(true);
    expect(company()).toMatchObject({ verificationStatus: "not_verified", verifiedAt: null });
    expect(notifications()).toHaveLength(0);
    expect(activity("company.verification_invalidated")).toHaveLength(1);
    // The supporting document can now be replaced, then the request explicitly submitted.
    expect((await attach(crDoc("new-cr"))).status).toBe(201);
    expect((await submit()).body.alreadySubmitted).toBe(false);
    expect(notifications()).toHaveLength(1);
  });

  it("A-R3: a city-only change keeps a verified company verified", async () => {
    seed({ ...complete, verificationStatus: "verified" }, true);
    const res = await save({ ...complete, city: "Jeddah" });
    expect(res.body.invalidated).toBe(false);
    expect(company().verificationStatus).toBe("verified");
  });
});
