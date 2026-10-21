// Company-file provenance on REAL PostgreSQL (SEC-S4S5 r8; migrations/0017).
//
// Opt-in: runs only when PROVENANCE_TEST_DATABASE_URL points at a disposable local
// database (localhost / 127.0.0.1), equals DATABASE_URL (the app's pool uses it)
// and differs from PROD_DATABASE_URL. The database must already hold the app
// schema (drizzle-kit push of shared/schema.ts), the object_acl fixture observed on
// development, and 0017 — see .mobile-audit/security-r8/pg/. The tests TRUNCATE
// every table they use.
//
// Real: server/routes.ts handlers, storage, the pg pool, all object_acl SQL
// (issuance, finalization upsert, binding, publish, reads), transactions and row
// locks. Stubbed: the external object store (signed URLs, bytes) and email.

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";

const URL_ = process.env.PROVENANCE_TEST_DATABASE_URL ?? "";
const SAFE =
  /^postgres(ql)?:\/\/[^@/]*@(127\.0\.0\.1|localhost)(:\d+)?\/[A-Za-z0-9_]+$/.test(URL_) &&
  URL_ === process.env.DATABASE_URL &&
  URL_ !== process.env.PROD_DATABASE_URL;

const bytesOf = (p: string) => `BYTES:${p}`;

vi.mock("../server/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/email")>();
  const quiet: Record<string, unknown> = {};
  for (const k of Object.keys(actual)) quiet[k] = typeof (actual as any)[k] === "function" ? async () => undefined : (actual as any)[k];
  return quiet;
});
vi.mock("../server/objectStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/objectStorage")>();
  const { issueObjectAcl } = await import("../server/objectAcl");
  class ObjectStorageService extends (actual.ObjectStorageService as any) {
    // External store stubbed; every ACL statement stays real.
    async getObjectEntityFile(p: string) {
      return { bucket: actual.PRIVATE_BUCKET, name: p.slice("/objects/".length), objectPath: p, isPublic: false };
    }
    // The public bucket answers too, so a route that falls back to it is visible in the tests.
    async getPublicFile(p: string) {
      return { bucket: actual.PUBLIC_BUCKET, name: p.slice("/objects/".length), objectPath: p, isPublic: true };
    }
    async getObjectSize() { return 10; }
    async downloadObject(obj: { objectPath: string }, res: any) { res.type("application/octet-stream").send(bytesOf(obj.objectPath)); }
    async issueObjectEntityUpload(ownerId: string, companyId: string | null) {
      const name = `uploads/${randomUUID()}`;
      await issueObjectAcl(`/objects/${name}`, ownerId, companyId);
      return { uploadURL: `https://storage.test/${actual.PRIVATE_BUCKET}/${name}?sig=x`, objectPath: `/objects/${name}` };
    }
  }
  return { ...actual, ObjectStorageService };
});

let app: express.Express;

let server: TestServer;

afterAll(() => stopTestServer(server));
let q: (text: string, params?: unknown[]) => Promise<any[]>;
let closePool: () => Promise<void>;

const tokenFor = (userId: string, companyId?: string) =>
  jwt.sign({ userId, activeCompanyId: companyId, roleInCompany: "owner" }, process.env.JWT_SECRET!);
const as = (userId: string, companyId?: string) => ({ Authorization: `Bearer ${tokenFor(userId, companyId)}` });
const download = (path: string, headers: Record<string, string>) =>
  request(server).get(path).set(headers).buffer(true).parse((res, cb) => {
    let d = "";
    res.on("data", (c: Buffer) => (d += c));
    res.on("end", () => cb(null, d));
  });

async function user(id: string, isAdmin = false) {
  await q(`insert into users (id, username, email, name, password, otp_verified, last_login_at, is_admin) values ($1::varchar,$1::text,$1::text||'@example.test',$1::text,'x',true,now(),$2)`, [id, isAdmin]);
}
const leave = (userId: string, companyId: string) =>
  q(`update user_companies set deleted_at = now() where user_id=$1 and company_id=$2`, [userId, companyId]);
const sealed = async (p: string, headers: Record<string, string>, label: string) => {
  const d = await download(p, headers);
  expect([label, d.status, d.body.includes("BYTES:")]).toEqual([label, 403, false]);
};
const served = async (p: string, headers: Record<string, string>, label: string) => {
  const d = await download(p, headers);
  expect([label, d.status, d.body]).toEqual([label, 200, bytesOf(p)]);
};
async function company(id: string, ownerUserId: string | null = null) {
  await q(`insert into companies (id, name, slug, account_type, verification_status, owner_user_id) values ($1::varchar,$1::text,$1::text,'company','verified',$2::varchar)`, [id, ownerUserId]);
  await q(`insert into company_profiles (company_id, display_name) values ($1::varchar,$1::text)`, [id]);
}
async function member(userId: string, companyId: string, role = "owner") {
  await q(`insert into user_companies (user_id, company_id, role_in_company) values ($1,$2,$3)`, [userId, companyId, role]);
}
/** Issue an upload through the real route (provenance from the request), then finalize it through the real upsert. */
async function upload(userId: string, companyId?: string, purpose?: string): Promise<string> {
  const r = await request(server).post("/api/objects/upload").set(as(userId, companyId)).send(purpose ? { purpose } : {});
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  const fin = await request(server).put("/api/objects/metadata").set(as(userId, companyId)).send({ fileURL: r.body.uploadURL });
  expect(fin.status, JSON.stringify(fin.body)).toBe(200);
  return fin.body.objectPath as string;
}
async function legacyFile(path: string, ownerId: string) {
  await q(`insert into object_acl (object_path, owner_id, visibility) values ($1,$2,'private')`, [path, ownerId]);
}
const aclRow = async (p: string) => (await q(`select owner_id, owner_company_id, provenance, visibility, issued_at from object_acl where object_path=$1`, [p]))[0];
async function tender(id: string, companyId: string, createdBy: string, attachments: { url: string }[] = []) {
  await q(
    `insert into tenders (id, company_id, created_by, title, description, deadline, status, invitation_token, attachments, target_audience_types)
     values ($1::varchar,$2,$3,'RFP','d','2099-12-31','published',$1::text||'-tok',$4::jsonb, array['company'])`,
    [id, companyId, createdBy, JSON.stringify(attachments.map((a, i) => ({ id: `a${i}`, name: "f.pdf", url: a.url, size: 1, type: "application/pdf" })))],
  );
}

describe.skipIf(!SAFE)("company-file provenance on real PostgreSQL", () => {
  beforeAll(async () => {
    const { pool } = await import("../server/db");
    q = async (text, params) => (await pool.query(text, params as any[])).rows;
    closePool = () => pool.end();
    const { registerRoutes } = await import("../server/routes");
    app = express();
    app.use(express.json());
    await registerRoutes(app);
    server = await startTestServer(app);
  }, 60_000);

  afterAll(async () => { await closePool?.(); });

  beforeEach(async () => {
    await q(`truncate object_acl, purchase_orders, offers, invitations, invitation_links, company_documents, member_activity_log, user_companies, company_profiles, tenders, companies, users restart identity cascade`);
    for (const u of ["owner-1", "owner-2", "vendor-b-1", "multi-1", "stranger-1", "founder-1", "founder-2"]) await user(u);
    await company("owner-co", "owner-1");
    await company("vendor-b", "vendor-b-1");
    await company("attacker-co", "multi-1");
    await company("invited-co");
    await member("owner-1", "owner-co");
    await member("owner-2", "owner-co", "admin");
    await member("vendor-b-1", "vendor-b");
    await member("multi-1", "attacker-co");
    await member("multi-1", "vendor-b", "member"); // one person in two companies
    await member("stranger-1", "invited-co");
  });

  // ── Issuance and immutability ────────────────────────────────────────────────
  describe("issuance and immutable provenance", () => {
    it("an upload is issued for the active company; onboarding and no-company uploads are pending", async () => {
      const a = await upload("owner-2", "owner-co");
      expect(await aclRow(a)).toMatchObject({ owner_id: "owner-2", owner_company_id: "owner-co", provenance: "company" });
      const b = await upload("owner-2", "owner-co", "onboarding");
      expect(await aclRow(b)).toMatchObject({ owner_company_id: null, provenance: "pending_onboarding" });
      const c = await upload("founder-1");
      expect(await aclRow(c)).toMatchObject({ owner_company_id: null, provenance: "pending_onboarding" });
      expect((await aclRow(c)).issued_at).toBeTruthy();
    });

    it("finalization (the ACL upsert) never changes provenance; only the issued user may finalize", async () => {
      const r = await request(server).post("/api/objects/upload").set(as("owner-2", "owner-co")).send({});
      const path = "/objects/uploads/" + r.body.uploadURL.split("/uploads/")[1].split("?")[0];
      const before = await aclRow(path);
      const other = await request(server).put("/api/objects/metadata").set(as("stranger-1", "invited-co")).send({ fileURL: r.body.uploadURL });
      expect(other.status).toBe(403);
      const ok = await request(server).put("/api/objects/metadata").set(as("owner-2", "owner-co")).send({ fileURL: r.body.uploadURL });
      expect(ok.status).toBe(200);
      const after = await aclRow(ok.body.objectPath);
      expect(after).toMatchObject({ owner_company_id: before.owner_company_id, provenance: before.provenance });
      expect(after.issued_at?.toISOString()).toBe(before.issued_at?.toISOString());
    });

    it("a removed member's still-valid token cannot issue uploads for that company", async () => {
      await q(`update user_companies set deleted_at = now() where user_id='owner-2'`);
      const r = await request(server).post("/api/objects/upload").set(as("owner-2", "owner-co")).send({});
      expect(r.status).toBe(403);
      expect((await q(`select count(*)::int as n from object_acl`))[0].n).toBe(0);
    });

    it("the database rejects inconsistent provenance rows", async () => {
      await expect(q(`insert into object_acl (object_path, owner_id, provenance) values ('/objects/uploads/x','u','company')`)).rejects.toThrow(/object_acl_provenance_chk/);
      await expect(q(`insert into object_acl (object_path, owner_id, provenance, owner_company_id) values ('/objects/uploads/y','u','pending_onboarding','owner-co')`)).rejects.toThrow(/object_acl_provenance_chk/);
      await expect(q(`insert into object_acl (object_path, owner_id, provenance, owner_company_id) values ('/objects/uploads/z','u','company','no-such-company')`)).rejects.toThrow(/foreign key/);
    });
  });

  // ── Company isolation ────────────────────────────────────────────────────────
  describe("company isolation (incl. a person in two companies)", () => {
    it("a vendor-b file cannot be newly referenced by attacker-co, even by the person who uploaded it", async () => {
      const bFile = await upload("multi-1", "vendor-b"); // multi-1 acting for vendor-b
      await tender("t-att", "attacker-co", "multi-1");
      const patch = await request(server).patch("/api/tenders/t-att").set(as("multi-1", "attacker-co")).send({ attachments: [{ id: "x", name: "x.pdf", url: bFile, size: 1, type: "application/pdf" }] });
      expect([patch.status, patch.body.code]).toEqual([400, "FILE_NOT_OWNED"]);
      await tender("t1", "owner-co", "owner-1");
      await q(`insert into invitations (tender_id, company_id, invitation_token, status) values ('t1','attacker-co','i1','pending')`);
      const offer = await request(server).post("/api/tenders/t1/offers").set(as("multi-1", "attacker-co")).send({ technicalFileUrl: bFile, quotePrice: 1 });
      expect([offer.status, offer.body.code]).toEqual([400, "FILE_NOT_OWNED"]);
      const logo = await request(server).put("/api/companies/attacker-co/profile").set(as("multi-1", "attacker-co")).send({ logoUrl: bFile });
      expect([logo.status, logo.body.code]).toEqual([400, "FILE_NOT_OWNED"]);
    });

    it("an existing forged reference (written directly, as before provenance) grants attacker-co nothing", async () => {
      const bFile = await upload("multi-1", "vendor-b");
      await tender("t-att", "attacker-co", "multi-1", [{ url: bFile }]); // forged: attacker request lists vendor-b's file
      await q(`update company_profiles set logo_url=$1 where company_id='attacker-co'`, [bFile]);
      // The uploader (multi-1) can always read their own upload through the ACL owner
      // rule; what matters is that the forged references open it to nobody else.
      const stranger = await download(bFile, as("stranger-1", "invited-co"));
      expect([stranger.status, stranger.body.includes("BYTES:")]).toEqual([403, false]);
      // A colleague at attacker-co who is not the uploader gets nothing either.
      await user("attacker-2"); await member("attacker-2", "attacker-co");
      const d2 = await download(bFile, as("attacker-2", "attacker-co"));
      expect([d2.status, d2.body.includes("BYTES:")]).toEqual([403, false]);
    });
  });

  describe("request creation (POST /api/tenders → launchTenderFromPayload)", () => {
    const createTender = (attachUrl: string) =>
      request(server).post("/api/tenders").set(as("owner-1", "owner-co")).send({
        title: "New RFP", description: "d", deadline: "2099-12-31", targetAudienceTypes: ["company"],
        attachments: [{ id: "a", name: "spec.pdf", url: attachUrl, size: 1, type: "application/pdf" }],
      });

    it("refuses another company's file at creation and creates nothing; accepts a colleague's company file", async () => {
      const foreign = await upload("vendor-b-1", "vendor-b");
      const bad = await createTender(foreign);
      expect([bad.status, bad.body.code]).toEqual([400, "FILE_NOT_OWNED"]);
      expect((await q(`select count(*)::int n from tenders where title='New RFP'`))[0].n).toBe(0);
      const colleague = await upload("owner-2", "owner-co");
      const ok = await createTender(colleague);
      expect(ok.status, JSON.stringify(ok.body)).toBe(200);
      expect((await q(`select count(*)::int n from tenders where title='New RFP'`))[0].n).toBe(1);
    });
  });

  // ── Colleagues and departed members ──────────────────────────────────────────
  describe("colleague uploads and departed members", () => {
    it("a colleague's upload can be attached to a request created by someone else, and invitees read it", async () => {
      await tender("t1", "owner-co", "owner-1");
      await q(`insert into invitations (tender_id, company_id, invitation_token, status) values ('t1','invited-co','i1','pending')`);
      const file = await upload("owner-2", "owner-co"); // colleague (not the request's author)
      const patch = await request(server).patch("/api/tenders/t1").set(as("owner-1", "owner-co")).send({ attachments: [{ id: "a", name: "spec.pdf", url: file, size: 1, type: "application/pdf" }] });
      expect(patch.status, JSON.stringify(patch.body)).toBe(200);
      const d = await download(file, as("stranger-1", "invited-co"));
      expect([d.status, d.body]).toEqual([200, bytesOf(file)]);
      const coWorker = await download(file, as("owner-1", "owner-co"));
      expect(coWorker.status).toBe(200);
    });

    it("after the uploader leaves the company, the company's file is still served to invitees", async () => {
      const file = await upload("owner-2", "owner-co");
      await tender("t1", "owner-co", "owner-1", [{ url: file }]);
      await q(`insert into invitations (tender_id, company_id, invitation_token, status) values ('t1','invited-co','i1','pending')`);
      await q(`update user_companies set deleted_at = now() where user_id='owner-2'`);
      const d = await download(file, as("stranger-1", "invited-co"));
      expect([d.status, d.body]).toEqual([200, bytesOf(file)]);
    });
  });

  // ── Logos ────────────────────────────────────────────────────────────────────
  describe("logo handling", () => {
    const putLogo = (userId: string, co: string, body: Record<string, unknown>) =>
      request(server).put(`/api/companies/${co}/profile`).set(as(userId, co)).send(body);

    it("a colleague's company upload becomes the logo, is published in the database, and others can see it", async () => {
      const file = await upload("owner-2", "owner-co");
      const r = await putLogo("owner-1", "owner-co", { logoUrl: file });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      expect((await aclRow(file)).visibility).toBe("public");
      expect((await download(file, as("stranger-1", "invited-co"))).status).toBe(200);
    });

    it("a legacy upload must be uploaded again; an unchanged legacy logo still saves without publishing", async () => {
      await legacyFile("/objects/uploads/legacy-logo", "owner-1");
      const r = await putLogo("owner-1", "owner-co", { logoUrl: "/objects/uploads/legacy-logo" });
      expect([r.status, r.body.code]).toEqual([400, "REUPLOAD_REQUIRED"]);
      await q(`update company_profiles set logo_url='/objects/uploads/legacy-logo' where company_id='owner-co'`);
      const same = await putLogo("owner-1", "owner-co", { logoUrl: "/objects/uploads/legacy-logo", displayName: "Owner Co" });
      expect(same.status).toBe(200);
      expect((await aclRow("/objects/uploads/legacy-logo")).visibility).toBe("private");
      // Legacy logo, uploaded by the company owner (backfill attribution): still served via the fallback.
      expect((await download("/objects/uploads/legacy-logo", as("stranger-1", "invited-co"))).status).toBe(200);
    });
  });

  // ── Onboarding binding, rollback and concurrency ─────────────────────────────
  describe("onboarding binding (all or nothing)", () => {
    const create = (userId: string, name: string, docs: string[], logo?: string) =>
      request(server).post("/api/companies").set(as(userId)).send({
        name,
        documents: docs.map((fileUrl, i) => ({ documentType: i === 0 ? "cr_certificate" : "vat_certificate", fileUrl, originalName: `d${i}.pdf` })),
        ...(logo ? { logoUrl: logo } : {}),
      });
    const companiesNamed = async (name: string) => (await q(`select id from companies where name=$1`, [name])).map((r) => r.id);

    it("binds every pending file to the new company, publishes the logo, and records the documents", async () => {
      const d1 = await upload("founder-1"); const logo = await upload("founder-1");
      const r = await create("founder-1", "New Co", [d1], logo);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      const id = r.body.company.id;
      expect(await aclRow(d1)).toMatchObject({ provenance: "company", owner_company_id: id });
      expect(await aclRow(logo)).toMatchObject({ provenance: "company", owner_company_id: id, visibility: "public" });
      expect((await q(`select count(*)::int n from company_documents where company_id=$1`, [id]))[0].n).toBe(1);
      expect((await q(`select role_in_company from user_companies where company_id=$1`, [id]))[0].role_in_company).toBe("owner");
    });

    it("binding is one-time: the same file cannot found a second company", async () => {
      const d1 = await upload("founder-1");
      expect((await create("founder-1", "First Co", [d1])).status).toBe(200);
      const again = await create("founder-1", "Second Co", [d1]);
      expect([again.status, again.body.code]).toEqual([400, "ONBOARDING_FILE_NOT_BINDABLE"]);
      expect(await companiesNamed("Second Co")).toEqual([]);
    });

    it("refuses a legacy file, someone else's pending file and an expired pending file — with nothing created", async () => {
      await legacyFile("/objects/uploads/legacy-doc", "founder-1");
      const theirs = await upload("founder-2");
      const expired = await upload("founder-1");
      await q(`update object_acl set issued_at = now() - interval '25 hours' where object_path=$1`, [expired]);
      for (const [label, path] of [["legacy", "/objects/uploads/legacy-doc"], ["foreign", theirs], ["expired", expired]] as const) {
        const r = await create("founder-1", `Co ${label}`, [path]);
        expect([label, r.status, r.body.code, r.body.fields]).toEqual([label, 400, "ONBOARDING_FILE_NOT_BINDABLE", ["documents.cr_certificate"]]);
        expect(await companiesNamed(`Co ${label}`)).toEqual([]);
      }
      expect(await aclRow(theirs)).toMatchObject({ provenance: "pending_onboarding", owner_company_id: null });
    });

    it("a legacy row is never bindable, even with a recent issued_at and no company (the provenance check itself)", async () => {
      // The check constraint permits provenance NULL with any other values; only provenance distinguishes it.
      await q(`insert into object_acl (object_path, owner_id, visibility, issued_at) values ('/objects/uploads/legacy-recent','founder-1','private', now())`);
      const r = await create("founder-1", "Legacy Recent Co", ["/objects/uploads/legacy-recent"]);
      expect([r.status, r.body.code]).toEqual([400, "ONBOARDING_FILE_NOT_BINDABLE"]);
      expect(await aclRow("/objects/uploads/legacy-recent")).toMatchObject({ provenance: null, owner_company_id: null });
      expect(await companiesNamed("Legacy Recent Co")).toEqual([]);
    });

    it("ROLLBACK: one bindable and one unbindable file → 400, the first binding and every row are rolled back", async () => {
      const good = await upload("founder-1");
      await legacyFile("/objects/uploads/legacy-2", "founder-1");
      const r = await create("founder-1", "Partial Co", [good, "/objects/uploads/legacy-2"]);
      expect([r.status, r.body.fields]).toEqual([400, ["documents.vat_certificate"]]);
      expect(await companiesNamed("Partial Co")).toEqual([]);
      expect(await aclRow(good)).toMatchObject({ provenance: "pending_onboarding", owner_company_id: null });
      const counts = await q(`select
        (select count(*)::int from company_profiles where display_name='Partial Co') p,
        (select count(*)::int from user_companies where user_id='founder-1') m,
        (select count(*)::int from company_documents where uploaded_by='founder-1') d,
        (select count(*)::int from member_activity_log where actor_user_id='founder-1') a`);
      expect(counts[0]).toEqual({ p: 0, m: 0, d: 0, a: 0 });
    });

    it("CONCURRENCY: two creations racing for the same file → exactly one succeeds; the loser leaves no partial state", async () => {
      const shared = await upload("founder-1");
      const onlyA = await upload("founder-1");
      const onlyB = await upload("founder-1");
      const [a, b] = await Promise.all([create("founder-1", "Race A", [shared, onlyA]), create("founder-1", "Race B", [shared, onlyB])]);
      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([200, 400]);
      const winner = a.status === 200 ? { r: a, name: "Race A", own: onlyA } : { r: b, name: "Race B", own: onlyB };
      const loser = a.status === 200 ? { r: b, name: "Race B", own: onlyB } : { r: a, name: "Race A", own: onlyA };
      expect(loser.r.body.code).toBe("ONBOARDING_FILE_NOT_BINDABLE");
      expect(await companiesNamed(loser.name)).toEqual([]);
      expect((await companiesNamed(winner.name))).toHaveLength(1);
      expect(await aclRow(shared)).toMatchObject({ provenance: "company", owner_company_id: winner.r.body.company.id });
      expect(await aclRow(loser.own)).toMatchObject({ provenance: "pending_onboarding", owner_company_id: null }); // loser's own binding rolled back
      expect((await q(`select count(*)::int n from user_companies where user_id='founder-1'`))[0].n).toBe(1);
      expect((await q(`select count(*)::int n from company_documents where uploaded_by='founder-1'`))[0].n).toBe(2);
    });
  });

  // ── R8-R1: verification documents ───────────────────────────────────────────
  describe("R8-R1 verification documents respect company provenance", () => {
    const attachDoc = (userId: string, co: string, fileUrl: string) =>
      request(server).post(`/api/companies/${co}/documents`).set(as(userId, co)).send({ documentType: "cr_certificate", fileUrl });

    beforeEach(async () => {
      await q(`update companies set verification_status='not_verified' where id in ('attacker-co','owner-co')`);
      await user("admin-1", true);
      await user("attacker-2"); await member("attacker-2", "attacker-co");
    });

    it("CHAIN (Codex): a person in two companies cannot attach company-X's upload as company-Y's document; nothing is readable", async () => {
      const bFile = await upload("multi-1", "vendor-b");
      const r = await attachDoc("multi-1", "attacker-co", bFile);
      expect([r.status, r.body.code]).toEqual([400, "INVALID_FILE"]);
      expect((await q(`select count(*)::int n from company_documents where company_id='attacker-co'`))[0].n).toBe(0);
      await sealed(bFile, as("attacker-2", "attacker-co"), "attacker-co colleague");
    });

    it("an existing forged document row (written directly) opens the file to nobody — members and platform admins included", async () => {
      const bFile = await upload("vendor-b-1", "vendor-b");
      await q(`insert into company_documents (company_id, document_type, file_url, uploaded_by) values ('attacker-co','cr_certificate',$1,'multi-1')`, [bFile]);
      await sealed(bFile, as("attacker-2", "attacker-co"), "attacker-co member");
      await sealed(bFile, as("admin-1"), "platform admin via forged row");
    });

    it("a genuine document stays readable to current members and platform admins, not to other companies", async () => {
      const own = await upload("owner-2", "owner-co");
      const r = await attachDoc("owner-2", "owner-co", own);
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      await served(own, as("owner-1", "owner-co"), "co-member");
      await served(own, as("admin-1"), "platform admin");
      await sealed(own, as("stranger-1", "invited-co"), "other company");
    });

    it("forged rows naming the same file neither shadow the genuine document nor borrow from it", async () => {
      const own = await upload("owner-2", "owner-co");
      const forge = () => q(`insert into company_documents (company_id, document_type, file_url, uploaded_by) values ('attacker-co','vat_certificate',$1,'multi-1')`, [own]);
      await forge();
      expect((await attachDoc("owner-2", "owner-co", own)).status).toBe(201);
      await forge();
      await served(own, as("owner-1", "owner-co"), "genuine company member");
      await served(own, as("admin-1"), "platform admin via the genuine row");
      await sealed(own, as("attacker-2", "attacker-co"), "member of the forging company");
    });

    it("a legacy document row is readable only when its uploader attached it", async () => {
      await legacyFile("/objects/uploads/legacy-cr", "owner-1");
      await q(`insert into company_documents (company_id, document_type, file_url, uploaded_by) values ('owner-co','cr_certificate','/objects/uploads/legacy-cr','owner-1')`);
      await served("/objects/uploads/legacy-cr", as("owner-2", "owner-co"), "member, legacy genuine");
      await legacyFile("/objects/uploads/legacy-foreign", "vendor-b-1");
      await q(`insert into company_documents (company_id, document_type, file_url, uploaded_by) values ('attacker-co','cr_certificate','/objects/uploads/legacy-foreign','multi-1')`);
      await sealed("/objects/uploads/legacy-foreign", as("attacker-2", "attacker-co"), "member, legacy forged");
      await sealed("/objects/uploads/legacy-foreign", as("admin-1"), "admin, legacy forged");
    });
  });

  // ── R8-R2: revoked membership ────────────────────────────────────────────────
  describe("R8-R2 company-derived access needs current membership", () => {
    it("CHAIN (Codex): a departed uploader's stale token no longer reads the company's private file; current members still do", async () => {
      const file = await upload("owner-2", "owner-co");
      await served(file, as("owner-2", "owner-co"), "uploader while a member");
      await leave("owner-2", "owner-co");
      await sealed(file, as("owner-2", "owner-co"), "departed uploader, stale token");
      await sealed(file, as("owner-2"), "departed uploader, no company");
      await tender("t1", "owner-co", "owner-1", [{ url: file }]);
      await served(file, as("owner-1", "owner-co"), "current member after the uploader left");
    });

    it("CHAIN (Codex): a departed colleague's stale token no longer reads a colleague's attached file", async () => {
      const file = await upload("owner-1", "owner-co");
      await tender("t1", "owner-co", "owner-1", [{ url: file }]);
      await served(file, as("owner-2", "owner-co"), "colleague while a member");
      await leave("owner-2", "owner-co");
      await sealed(file, as("owner-2", "owner-co"), "departed colleague, stale token");
    });

    it("a departed vendor member loses the offer-document grant; the requester keeps it", async () => {
      const bid = await upload("multi-1", "vendor-b");
      await tender("t1", "owner-co", "owner-1");
      await q(`insert into offers (tender_id, company_id, created_by, technical_file_url, status) values ('t1','vendor-b','multi-1',$1,'pending')`, [bid]);
      await served(bid, as("vendor-b-1", "vendor-b"), "vendor colleague");
      await leave("vendor-b-1", "vendor-b");
      await sealed(bid, as("vendor-b-1", "vendor-b"), "departed vendor colleague");
      await served(bid, as("owner-1", "owner-co"), "requester");
    });

    it("independently authorized access survives a stale company: email invitation, invitation token, marketplace, public logo", async () => {
      const file = await upload("owner-1", "owner-co");
      await tender("t1", "owner-co", "owner-1", [{ url: file }]);
      await leave("stranger-1", "invited-co"); // their token still names invited-co
      await q(`insert into invitation_links (requester_company_id, tender_id, vendor_email, token) values ('owner-co','t1','stranger-1@example.test','lnk1')`);
      await served(file, as("stranger-1", "invited-co"), "email invitation");
      await q(`delete from invitation_links`);
      await served(file, { ...as("stranger-1", "invited-co"), "X-Invitation-Token": "t1-tok" }, "invitation token");
      await q(`update tenders set is_marketplace=true, marketplace_status='approved' where id='t1'`);
      await served(file, as("stranger-1", "invited-co"), "approved marketplace");
      const logo = await upload("owner-1", "owner-co");
      expect((await request(server).put("/api/companies/owner-co/profile").set(as("owner-1", "owner-co")).send({ logoUrl: logo })).status).toBe(200);
      await served(logo, as("stranger-1", "invited-co"), "published logo");
    });

    it("a pending onboarding upload stays readable to its uploader (personal, no company)", async () => {
      const pending = await upload("founder-1");
      await served(pending, as("founder-1"), "pending uploader");
      await sealed(pending, as("stranger-1", "invited-co"), "anyone else");
    });

    it("a legacy per-user grant (backfilled tenderAccess) holds only while that user is still a member of the request's company", async () => {
      await tender("t1", "owner-co", "owner-1");
      await q(`insert into object_acl (object_path, owner_id, visibility, tender_access) values ('/objects/uploads/legacy-grant','vendor-b-1','private',$1::jsonb)`,
        [JSON.stringify({ tenderId: "t1", allowedUserIds: ["owner-2"] })]);
      await served("/objects/uploads/legacy-grant", as("owner-2", "owner-co"), "granted member");
      await leave("owner-2", "owner-co");
      await sealed("/objects/uploads/legacy-grant", as("owner-2", "owner-co"), "granted user after leaving");
    });
  });

  // ── REC-R1 / NF-1: purchase orders (SEC-PO-AUTHZ-R1) ─────────────────────────
  describe("REC-R1 purchase orders: live membership, writer roles and file provenance", () => {
    const createPo = (userId: string, co: string | undefined, fileUrl: unknown, tenderId = "po-t") =>
      request(server).post(`/api/tenders/${tenderId}/purchase-orders`).set(as(userId, co)).send({ fileUrl, originalName: "po.pdf" });
    const poCount = async () => (await q(`select count(*)::int n from purchase_orders`))[0].n;
    const forgedPo = async (fileUrl: string, uploadedBy: string, id = "po-forged") => {
      await q(`insert into purchase_orders (id, tender_id, uploaded_by, file_url, status) values ($1,'po-t',$2,$3,'pending')`, [id, uploadedBy, fileUrl]);
      return id;
    };
    const poFile = (id: string, headers: Record<string, string>) => download(`/api/purchase-orders/${id}/file`, headers);
    const refusedPoFile = async (id: string, headers: Record<string, string>, label: string) => {
      const d = await poFile(id, headers);
      expect([label, d.status, d.body.includes("BYTES:")]).toEqual([label, 403, false]);
    };

    beforeEach(async () => {
      await user("admin-1", true);
      await user("attacker-2"); await member("attacker-2", "attacker-co", "member");
      await user("viewer-1"); await member("viewer-1", "owner-co", "viewer");
      await tender("po-t", "owner-co", "owner-1");
      await tender("po-y", "attacker-co", "multi-1");
    });

    it("CHAIN (Codex): a user in X and Y cannot attach X's file to Y's request; nothing is written and a Y colleague gets no bytes", async () => {
      const xFile = await upload("multi-1", "vendor-b");
      const r = await createPo("multi-1", "attacker-co", xFile, "po-y");
      expect([r.status, r.body.code]).toEqual([400, "INVALID_FILE"]);
      expect(await poCount()).toBe(0);
      await sealed(xFile, as("attacker-2", "attacker-co"), "Y colleague via /objects");
    });

    it("a pre-existing forged PO row (written directly) streams nothing — to company members or platform admins", async () => {
      const bFile = await upload("vendor-b-1", "vendor-b");
      const id = await forgedPo(bFile, "owner-1");
      await refusedPoFile(id, as("owner-1", "owner-co"), "requester member, forged company file");
      await refusedPoFile(id, as("admin-1"), "platform admin, forged company file");
      await legacyFile("/objects/uploads/legacy-foreign-po", "vendor-b-1");
      const legacyId = await forgedPo("/objects/uploads/legacy-foreign-po", "owner-1", "po-forged-legacy");
      await refusedPoFile(legacyId, as("owner-2", "owner-co"), "member, legacy file not uploaded by the PO author");
      await refusedPoFile(legacyId, as("admin-1"), "admin, legacy file not uploaded by the PO author");
    });

    it("public-bucket and non-upload paths are neither accepted nor served (no public-file fallback)", async () => {
      for (const bad of ["/objects/company-logos/x.png", "/objects/uploads/../x", "https://evil.example/x.pdf", 42]) {
        const r = await createPo("owner-1", "owner-co", bad);
        expect([String(bad), r.status]).toEqual([String(bad), 400]);
      }
      expect(await poCount()).toBe(0);
      const id = await forgedPo("/objects/company-logos/x.png", "owner-1");
      await refusedPoFile(id, as("owner-1", "owner-co"), "public-bucket path");
    });

    it("CHAIN (Codex): a departed member's stale token can neither create, list, download nor delete", async () => {
      const own = await upload("owner-2", "owner-co");
      const ok = await createPo("owner-2", "owner-co", own);
      expect(ok.status, JSON.stringify(ok.body)).toBe(200);
      await leave("owner-2", "owner-co");
      const second = await upload("owner-1", "owner-co");
      expect((await createPo("owner-2", "owner-co", second)).status).toBe(403);
      expect(await poCount()).toBe(1);
      expect((await request(server).get("/api/tenders/po-t/purchase-orders").set(as("owner-2", "owner-co"))).status).toBe(403);
      await refusedPoFile(ok.body.id, as("owner-2", "owner-co"), "departed member");
      expect((await request(server).delete(`/api/purchase-orders/${ok.body.id}`).set(as("owner-2", "owner-co"))).status).toBe(403);
      expect(await poCount()).toBe(1);
      // the company keeps its PO after the uploader leaves
      const kept = await poFile(ok.body.id, as("owner-1", "owner-co"));
      expect([kept.status, kept.body]).toEqual([200, bytesOf(own)]);
    });

    it("writer roles: a viewer can list and download but not create or delete; another company's member gets nothing", async () => {
      const own = await upload("owner-1", "owner-co");
      const po = await createPo("owner-1", "owner-co", own);
      expect(po.status).toBe(200);
      const viewerFile = await upload("viewer-1", "owner-co");
      expect((await createPo("viewer-1", "owner-co", viewerFile)).status).toBe(403);
      expect((await request(server).get("/api/tenders/po-t/purchase-orders").set(as("viewer-1", "owner-co"))).body).toHaveLength(1);
      expect((await poFile(po.body.id, as("viewer-1", "owner-co"))).status).toBe(200);
      expect((await request(server).delete(`/api/purchase-orders/${po.body.id}`).set(as("viewer-1", "owner-co"))).status).toBe(403);
      expect((await request(server).get("/api/tenders/po-t/purchase-orders").set(as("vendor-b-1", "vendor-b"))).status).toBe(403);
      await refusedPoFile(po.body.id, as("vendor-b-1", "vendor-b"), "other company");
      await refusedPoFile(po.body.id, as("owner-1", "vendor-b"), "requester member whose active company is another");
    });

    it("legitimate workflows: a member attaches their own upload; colleagues and platform admins read it; admin moderates; delete works", async () => {
      const own = await upload("owner-2", "owner-co");
      expect((await createPo("owner-1", "owner-co", own)).body.code).toBe("INVALID_FILE"); // a colleague's upload: attach your own
      const po = await createPo("owner-2", "owner-co", own);
      expect(po.status).toBe(200);
      for (const [label, h] of [["uploader", as("owner-2", "owner-co")], ["colleague", as("owner-1", "owner-co")], ["platform admin", as("admin-1")]] as const) {
        const d = await poFile(po.body.id, h);
        expect([label, d.status, d.body]).toEqual([label, 200, bytesOf(own)]);
      }
      expect((await request(server).get("/api/tenders/po-t/purchase-orders").set(as("admin-1"))).status).toBe(200);
      expect((await createPo("admin-1", undefined, own)).status).toBe(403); // admins moderate, they do not file POs
      expect((await request(server).delete(`/api/purchase-orders/${po.body.id}`).set(as("owner-1", "owner-co"))).status).toBe(200);
      expect(await poCount()).toBe(0);
      const again = await createPo("owner-2", "owner-co", own);
      expect((await request(server).delete(`/api/purchase-orders/${again.body.id}`).set(as("admin-1"))).status).toBe(200);
    });

    it("a legacy PO file uploaded by the PO's author stays readable to current members (existing references keep working)", async () => {
      await legacyFile("/objects/uploads/legacy-po", "owner-1");
      const id = await forgedPo("/objects/uploads/legacy-po", "owner-1", "po-legacy");
      const d = await poFile(id, as("owner-2", "owner-co"));
      expect([d.status, d.body]).toEqual([200, bytesOf("/objects/uploads/legacy-po")]);
      expect((await createPo("owner-1", "owner-co", "/objects/uploads/legacy-po")).status).toBe(400); // but cannot be newly attached
    });
  });

  // ── R8-R3: historical audit SQL on synthetic fixtures ───────────────────────
  describe("R8-R3 historical audit SQL (synthetic data only)", () => {
    const AUDIT = readFileSync(path.join(__dirname, "..", "scripts", "security", "historical-provenance-audit.sql"), "utf8");
    const audit = async () => {
      const { pool } = await import("../server/db");
      const results = (await pool.query(AUDIT)) as unknown as { rows: Record<string, string>[] }[];
      const row = results.find((r) => r.rows?.length === 1 && "c0_references" in r.rows[0])!.rows[0];
      return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v)]));
    };

    it("counts references and distinct objects separately, includes verification documents, and tolerates JSON null/scalar attachments", async () => {
      const f1 = await upload("owner-1", "owner-co");
      await tender("t1", "owner-co", "owner-1", [{ url: f1 }]);
      await tender("t2", "owner-co", "owner-1", [{ url: f1 }]); // same object, two references
      await q(`insert into company_documents (company_id, document_type, file_url, uploaded_by) values ('owner-co','cr_certificate',$1,'owner-1')`, [f1]);
      await q(`insert into tenders (id, company_id, created_by, title, description, deadline, status, invitation_token, attachments) values
        ('t-null','owner-co','owner-1','x','d','2099-12-31','published','tn','null'::jsonb),
        ('t-str','owner-co','owner-1','x','d','2099-12-31','published','ts','"oops"'::jsonb),
        ('t-obj','owner-co','owner-1','x','d','2099-12-31','published','to','{"url":"/objects/uploads/x"}'::jsonb),
        ('t-mixed','owner-co','owner-1','x','d','2099-12-31','published','tm','[null, 5, {"url": 7}, {"name":"no url"}]'::jsonb)`);
      const a = await audit();
      expect(a.c0_references).toBe(3);        // two request references + one verification reference
      expect(a.c0_distinct_objects).toBe(1);
      expect(a.c7_non_array_attachments).toBe(3);
    });

    it("LIMITATION: a laundered forged reference is invisible to owner/author checks; only the surviving genuine reference flags it", async () => {
      // vendor-b's sealed bid; the forger's offer names it; the old backfill made the forger the ACL owner.
      await tender("t1", "owner-co", "owner-1");
      await q(`insert into object_acl (object_path, owner_id, visibility) values ('/objects/uploads/laundered','multi-1','private')`);
      await q(`insert into offers (tender_id, company_id, created_by, technical_file_url, status) values ('t1','attacker-co','multi-1','/objects/uploads/laundered','pending')`);
      let a = await audit();
      expect(a.c5_offer_references_not_author).toBe(0); // false negative: owner == forger == author
      expect(a.c1_multi_company_objects).toBe(0);        // genuine reference gone: undetectable here
      await q(`insert into offers (tender_id, company_id, created_by, technical_file_url, status) values ('t1','vendor-b','vendor-b-1','/objects/uploads/laundered','pending')`);
      a = await audit();
      expect(a.c1_multi_company_objects).toBe(1);        // with the genuine reference present, the path is flagged
      expect(a.c1_multi_company_references).toBe(2);
      expect(a.c5_offer_references_not_author).toBe(1);  // now the GENUINE vendor looks like the mismatch
    });
  });

  // ── Legacy references ────────────────────────────────────────────────────────
  describe("legacy files", () => {
    it("an existing reference by the legacy file's author keeps working; a new reference must upload again", async () => {
      await legacyFile("/objects/uploads/legacy-bid", "vendor-b-1");
      await tender("t1", "owner-co", "owner-1");
      await q(`insert into offers (tender_id, company_id, created_by, technical_file_url, status) values ('t1','vendor-b','vendor-b-1','/objects/uploads/legacy-bid','pending')`);
      expect((await download("/objects/uploads/legacy-bid", as("owner-1", "owner-co"))).status).toBe(200); // requester, via fallback
      await q(`insert into invitations (tender_id, company_id, invitation_token, status) values ('t1','vendor-b','iv','pending')`);
      await q(`update offers set status='rejected', resubmission_allowed=true`);
      const r = await request(server).post("/api/tenders/t1/offers").set(as("vendor-b-1", "vendor-b")).send({ technicalFileUrl: "/objects/uploads/legacy-bid" });
      expect([r.status, r.body.code]).toEqual([400, "REUPLOAD_REQUIRED"]);
    });
  });
});
