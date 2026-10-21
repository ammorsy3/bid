// S6 / S7 durable regression tests on the CURRENT storage interfaces (adapted from
// the independent reproductions in .mobile-audit/security-s6s7 and
// .mobile-audit/codex-s4s5-review, whose stubs target removed or never-existing
// methods and therefore end in 500s).
//
// Every storage method these handlers call is stubbed explicitly; an unexpected
// call fails the test ("unstubbed storage call"), so a pass or a denial here is
// the authorization logic, never a missing mock. The real server/routes.ts
// handlers run; nothing touches a database, real storage or email. "Published"
// means objectAcl.publishCompanyObject was called; PostgreSQL behaviour of that SQL
// is not proven here.

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

type Row = Record<string, any>;

const m = vi.hoisted(() => ({
  owners: {} as Record<string, string>, // object path -> ACL owner (fixed at issuance)
  publicObjects: new Set<string>(),
  published: [] as string[],
  profiles: {} as Record<string, Row>, // companyId -> company_profiles row
  companyOwners: {} as Record<string, string>, // companyId -> companies.owner_user_id
  tenders: [] as Row[],
  offers: [] as Row[],
  invitedCompanies: {} as Record<string, string[]>,
  created: [] as Row[],
  createdCompanies: [] as Row[],
  createdProfiles: [] as Row[],
  pending: new Set<string>(), // object paths issued as pending onboarding uploads
  legacy: new Set<string>(), // object paths with provenance NULL (pre-0017)
  companyOf: {} as Record<string, string>, // object path -> issuing company (default: from the owner id)
  profileUpdates: [] as Row[],
  notified: [] as string[],
  unstubbed: [] as string[],
}));

const bytesOf = (p: string) => `BYTES:${p}`;
const SPEC = "/objects/uploads/spec"; // private request attachment (owner-co)
const B_TECH = "/objects/uploads/b-tech"; // vendor-b's sealed proposal
const OWNER_LOGO = "/objects/uploads/brand-owner-logo"; // legacy logo uploaded by brand-co's owner
const COLLEAGUE_LOGO = "/objects/uploads/brand-colleague-logo"; // legacy logo uploaded by a non-owner admin
const BRAND_FIELDS = ["logoUrl", "logoOriginalUrl", "headerUrl", "headerOriginalUrl", "brochureUrl", "introVideoUrl"];

vi.mock("../server/db", () => ({ db: {}, pool: { on: () => undefined, query: async () => ({ rows: [] }) } }));
vi.mock("../server/objectAcl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/objectAcl")>()),
  getObjectOwnerByPath: async (p: string) => m.owners[p] ?? null,
  getObjectProvenance: async (p: string) => {
    const ownerId = m.owners[p];
    if (!ownerId) return null;
    const visibility = m.publicObjects.has(p) ? "public" : "private";
    if (m.legacy.has(p)) return { ownerId, ownerCompanyId: null, provenance: null, visibility };
    if (m.pending.has(p)) return { ownerId, ownerCompanyId: null, provenance: "pending_onboarding", visibility };
    return { ownerId, ownerCompanyId: m.companyOf[p] ?? ownerId.replace(/-(user|admin)\d*$/, ""), provenance: "company", visibility };
  },
  getObjectAclPolicy: async (o: { objectPath?: string; name: string }) => {
    const p = o.objectPath ?? o.name;
    return m.owners[p] ? { owner: m.owners[p], visibility: m.publicObjects.has(p) ? "public" : "private" } : null;
  },
  publishCompanyObject: async (p: string, companyId: string) => {
    const owner = m.owners[p];
    if (!owner || m.legacy.has(p) || m.pending.has(p) || (m.companyOf[p] ?? owner.replace(/-(user|admin)\d*$/, "")) !== companyId) return false;
    m.publicObjects.add(p);
    m.published.push(p);
    return true;
  },
}));
vi.mock("../server/objectStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/objectStorage")>();
  class ObjectStorageService extends (actual.ObjectStorageService as any) {
    async getObjectEntityFile(p: string) { return { bucket: "private-files", name: p, objectPath: p, isPublic: false }; }
    async canAccessObjectEntity({ objectFile, userId }: { objectFile: { name: string }; userId?: string }) {
      return m.publicObjects.has(objectFile.name) || (!!userId && m.owners[objectFile.name] === userId);
    }
    async downloadObject(obj: { name: string }, res: any) { res.type("application/octet-stream").send(bytesOf(obj.name)); }
  }
  return { ...actual, ObjectStorageService };
});
// The real all-or-nothing transaction runs in tests/object-provenance.integration.test.ts
// (real Postgres). Here: the same bind rule in memory — pending, uploaded by the caller.
vi.mock("../server/lib/company-onboarding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/lib/company-onboarding")>();
  return {
    ...actual,
    createCompanyWithOnboardingFiles: async (_db: unknown, input: any) => {
      const failed: string[] = [];
      for (const d of input.documents) if (!(m.pending.has(d.fileUrl) && m.owners[d.fileUrl] === input.userId)) failed.push(`documents.${d.documentType}`);
      if (input.logoUploadPath && !(m.pending.has(input.logoUploadPath) && m.owners[input.logoUploadPath] === input.userId)) failed.push("logoUrl");
      if (failed.length) throw new actual.OnboardingFileError(failed);
      const company = { id: "new-co", ...input.company };
      m.createdCompanies.push(company);
      const profile = { ...input.profile, companyId: company.id };
      m.createdProfiles.push(profile);
      m.profiles[company.id] = profile;
      if (input.logoUploadPath) { m.pending.delete(input.logoUploadPath); m.companyOf[input.logoUploadPath] = company.id; m.publicObjects.add(input.logoUploadPath); m.published.push(input.logoUploadPath); }
      return { company, profile };
    },
  };
});
vi.mock("../server/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/email")>()),
  sendNewOfferNotification: async ({ tenderId }: { tenderId: string }) => { m.notified.push(tenderId); },
}));
vi.mock("../server/storage", () => {
  const brandCompanies = (u: string) => Object.entries(m.profiles)
    .filter(([, p]) => BRAND_FIELDS.some((f) => p[f] === u))
    .map(([companyId]) => ({ companyId, ownerUserId: m.companyOwners[companyId] ?? null }));
  const known: Record<string, (...a: any[]) => unknown> = {
    // auth / company context
    getUser: async (id: string) => ({ id, email: `${id}@example.test`, otpVerified: true, isAdmin: false, lastLoginAt: new Date() }),
    getUserRoleInCompany: async () => "owner",
    getCompany: async (id: string) => ({ id, name: id, accountType: "company", verificationStatus: "verified", isActive: true, ownerUserId: m.companyOwners[id] ?? null }),
    // profiles and brand assets
    getCompanyProfile: async (cid: string) => m.profiles[cid],
    updateCompanyProfile: async (cid: string, u: Row) => { m.profileUpdates.push(u); m.profiles[cid] = { ...(m.profiles[cid] ?? {}), ...u }; return m.profiles[cid]; },
    getCompaniesByBrandAssetUrl: async (u: string) => brandCompanies(u),
    // company creation
    getCompanyByCrNumber: async () => undefined,
    getCompanyBySlug: async () => undefined,
    getCompanyByJoinCode: async () => undefined,
    getCompanyProfileByTractionSlug: async () => undefined,
    createCompany: async (c: Row) => { const row = { id: "new-co", ...c }; m.createdCompanies.push(row); return row; },
    createCompanyProfile: async (p: Row) => { m.createdProfiles.push(p); m.profiles[p.companyId] = p; return p; },
    addUserToCompany: async () => ({}),
    createCompanyDocument: async () => ({}),
    logMemberActivity: async () => undefined,
    logProductEvent: async () => undefined,
    // requests, offers, file lookups
    getTender: async (id: string) => m.tenders.find((t) => t.id === id),
    getTendersByAttachmentUrl: async (u: string) => m.tenders.filter((t) => (t.attachments ?? []).some((a: Row) => a.url === u)),
    getTendersByMediaUrl: async (u: string) => m.tenders.filter((t) => t.voiceNoteUrl === u || t.videoUrl === u),
    getOffersByFileUrl: async (u: string) => m.offers.filter((o) => [o.technicalFileUrl, o.financialFileUrl, o.combinedFileUrl].includes(u)),
    getCompanyDocumentsByFileUrl: async () => [],
    getInvitationsByTender: async (tid: string) => (m.invitedCompanies[tid] ?? []).map((companyId) => ({ companyId })),
    getInvitationLinkByTenderAndEmail: async () => undefined,
    getOfferByTenderAndCompany: async (tid: string, co: string) => m.offers.find((o) => o.tenderId === tid && o.companyId === co) ?? null,
    createOffer: async (o: Row) => { const offer = { id: `o-new-${m.created.length}`, ...o }; m.created.push(offer); return offer; },
    updateOfferStatus: async () => undefined,
    getOffersByTender: async () => m.created,
    getCompanyMembers: async () => [],
    filterRecipientsByPreference: async (r: unknown[]) => r,
    isVendorInBase: async () => true,
    addVendorToBase: async () => ({}),
  };
  // No silent defaults: an unexpected storage call is recorded and answered with an
  // error, and afterEach fails the test, so no assertion can pass on a missing mock.
  return {
    storage: new Proxy(known, {
      get: (t, k: string) => t[k] ?? (async () => { m.unstubbed.push(k); throw new Error(`unstubbed storage call: ${k}`); }),
    }),
  };
});

let app: express.Express;

let server: TestServer;

afterAll(() => stopTestServer(server));
const as = (companyId: string, userId = `${companyId}-user`) => ({
  Authorization: `Bearer ${jwt.sign({ userId, activeCompanyId: companyId, roleInCompany: "owner" }, process.env.JWT_SECRET!)}`,
});
const download = (path: string, headers: Record<string, string> = {}) =>
  request(server).get(path).set(headers).buffer(true).parse((res, cb) => {
    let d = "";
    res.on("data", (c: Buffer) => (d += c));
    res.on("end", () => cb(null, d));
  });
const expectSealed = async (path: string, caller: Record<string, string>, label: string) => {
  const d = await download(path, caller);
  expect([label, d.status]).toEqual([label, 403]);
  expect(d.body).not.toContain("BYTES:");
};

beforeAll(async () => {
  const { registerRoutes } = await import("../server/routes");
  app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 60_000);

beforeEach(() => {
  m.owners = { [SPEC]: "owner-co-user", [B_TECH]: "vendor-b-user", [OWNER_LOGO]: "brand-co-user", [COLLEAGUE_LOGO]: "brand-co-admin2" };
  m.publicObjects = new Set();
  m.published = [];
  m.companyOwners = { "owner-co": "owner-co-user", "brand-co": "brand-co-user", "attacker-co": "attacker-co-user", "vendor-b": "vendor-b-user" };
  m.profiles = {
    "attacker-co": { companyId: "attacker-co", displayName: "Attacker", logoUrl: null },
    "brand-co": { companyId: "brand-co", displayName: "Brand", logoUrl: OWNER_LOGO },
  };
  m.tenders = [{
    id: "t1", companyId: "owner-co", createdBy: "owner-co-user", title: "Private RFP", description: "d", deadline: "2099-12-31",
    status: "published", isMarketplace: false, marketplaceStatus: null, invitationToken: "tok-t1", targetAudienceTypes: ["company"],
    attachments: [{ id: "a1", name: "spec.pdf", url: SPEC, size: 1, type: "application/pdf" }], voiceNoteUrl: null, videoUrl: null,
  }];
  m.offers = [{ id: "o-b", tenderId: "t1", companyId: "vendor-b", createdBy: "vendor-b-user", status: "pending", technicalFileUrl: B_TECH }];
  m.invitedCompanies = { t1: ["invited-co"] };
  m.created = [];
  m.createdCompanies = [];
  m.createdProfiles = [];
  m.pending = new Set();
  m.legacy = new Set();
  m.companyOf = {};
  m.profileUpdates = [];
  m.notified = [];
  m.unstubbed = [];
});
afterEach(() => {
  expect(m.unstubbed, "unstubbed storage calls").toEqual([]);
});

// ── S6: company creation ────────────────────────────────────────────────────────
describe("S6 company creation (POST /api/companies) logo", () => {
  const createCompany = (logoUrl: unknown) =>
    request(server).post("/api/companies").set(as("none", "founder-user")).send({ name: "New Co", logoUrl });

  it("a foreign private file as logo cannot be bound: nothing is created and the file stays sealed", async () => {
    const r = await createCompany(B_TECH);
    expect([r.status, r.body.code, r.body.fields]).toEqual([400, "ONBOARDING_FILE_NOT_BINDABLE", ["logoUrl"]]);
    expect(m.createdCompanies).toHaveLength(0);
    expect(m.published).toEqual([]);
    await expectSealed(B_TECH, as("stranger-co"), "stranger after refused create");
  });

  it("the founder's pending onboarding upload becomes the logo, bound and published", async () => {
    m.owners["/objects/uploads/founder-logo"] = "founder-user";
    m.pending.add("/objects/uploads/founder-logo");
    const r = await createCompany("/objects/uploads/founder-logo");
    expect(r.status).toBe(200);
    expect(m.createdProfiles[0]).toMatchObject({ logoUrl: "/objects/uploads/founder-logo" });
    expect(m.published).toEqual(["/objects/uploads/founder-logo"]);
  });

  it("no logo, a public-bucket path and an external URL are accepted and nothing is published", async () => {
    for (const logo of [undefined, "/objects/company-logos/a.png", "https://cdn.example.com/a.png"]) {
      m.createdCompanies = []; m.createdProfiles = [];
      const r = await createCompany(logo);
      expect([String(logo), r.status]).toEqual([String(logo), 200]);
    }
    expect(m.published).toEqual([]);
  });
});

// ── S6: profile updates ─────────────────────────────────────────────────────────
describe("S6 profile update (PUT /api/companies/:id/profile) logo", () => {
  const put = (co: string, body: Row, userId?: string) =>
    request(server).put(`/api/companies/${co}/profile`).set(as(co, userId)).send(body);

  it("pointing the logo at a competitor's proposal or a private request attachment is refused; nothing written or published", async () => {
    for (const path of [B_TECH, SPEC]) {
      const r = await put("attacker-co", { logoUrl: path });
      expect([path, r.status, r.body.code]).toEqual([path, 400, "FILE_NOT_OWNED"]);
    }
    expect(m.profileUpdates).toEqual([]);
    expect(m.published).toEqual([]);
    await expectSealed(B_TECH, as("stranger-co"), "proposal");
    await expectSealed(SPEC, as("stranger-co"), "request attachment");
  });

  it("UNCHANGED colleague-uploaded logo: saving other fields succeeds, without publishing or changing the ACL, and access is not widened", async () => {
    m.profiles["brand-co"].logoUrl = COLLEAGUE_LOGO;
    const r = await put("brand-co", { logoUrl: COLLEAGUE_LOGO, displayName: "Brand Co" }, "brand-co-user");
    expect(r.status).toBe(200);
    expect(m.profileUpdates.at(-1)).toMatchObject({ displayName: "Brand Co" });
    expect(m.published).toEqual([]);
    expect(m.publicObjects.has(COLLEAGUE_LOGO)).toBe(false);
    expect(m.owners[COLLEAGUE_LOGO]).toBe("brand-co-admin2");
    // r8: a colleague's upload issued for brand-co is that company's file — the logo is visible.
    expect((await download(COLLEAGUE_LOGO, as("stranger-co"))).status).toBe(200);
  });

  it("UNCHANGED forged reference stored before S6: saving other fields succeeds and still grants nothing", async () => {
    m.profiles["attacker-co"].logoUrl = B_TECH;
    const r = await put("attacker-co", { logoUrl: B_TECH, bio: "We build things" });
    expect(r.status).toBe(200);
    expect(m.published).toEqual([]);
    expect(m.publicObjects.has(B_TECH)).toBe(false);
    await expectSealed(B_TECH, as("stranger-co"), "stranger");
    await expectSealed(B_TECH, as("attacker-co"), "attacker");
  });

  it("changing from a stored value to another foreign file is still refused", async () => {
    m.profiles["attacker-co"].logoUrl = B_TECH;
    const r = await put("attacker-co", { logoUrl: SPEC });
    expect([r.status, r.body.code]).toEqual([400, "FILE_NOT_OWNED"]);
    expect(m.profileUpdates).toEqual([]);
  });

  it("a legitimate new logo (own upload) is published; clearing works; omitting logoUrl leaves it untouched", async () => {
    m.owners["/objects/uploads/attacker-own"] = "attacker-co-user";
    expect((await put("attacker-co", { logoUrl: "/objects/uploads/attacker-own" })).status).toBe(200);
    expect(m.published).toEqual(["/objects/uploads/attacker-own"]);
    expect((await download("/objects/uploads/attacker-own", as("stranger-co"))).status).toBe(200);
    expect((await put("attacker-co", { displayName: "No logo field" })).status).toBe(200);
    expect(m.profiles["attacker-co"].logoUrl).toBe("/objects/uploads/attacker-own");
    expect((await put("attacker-co", { logoUrl: "" })).status).toBe(200);
    expect(m.profiles["attacker-co"].logoUrl).toBe("");
  });

  it("authorization is unchanged: another company cannot save this profile even with the unchanged logo value", async () => {
    const r = await request(server).put("/api/companies/brand-co/profile").set(as("attacker-co")).send({ logoUrl: OWNER_LOGO });
    expect(r.status).toBe(403);
    expect(m.profileUpdates).toEqual([]);
  });
});

// ── S6: reading existing references ─────────────────────────────────────────────
describe("S6 existing brand references at read time", () => {
  it("existing forged references (logo, brochure) grant nothing", async () => {
    m.profiles["attacker-co"].logoUrl = B_TECH;
    m.profiles["attacker-co"].brochureUrl = SPEC;
    await expectSealed(B_TECH, as("stranger-co"), "forged logo");
    await expectSealed(B_TECH, as("attacker-co"), "forged logo, attacker");
    await expectSealed(SPEC, as("stranger-co"), "forged brochure");
  });

  it("legacy logo with trusted evidence (uploaded by the company's owner) is visible to other companies", async () => {
    m.legacy.add(OWNER_LOGO);
    const d = await download(OWNER_LOGO, as("stranger-co"));
    expect([d.status, d.body]).toEqual([200, bytesOf(OWNER_LOGO)]);
  });

  it("legacy logo WITHOUT trusted evidence (uploaded by a non-owner member) is not served to others — recovery is re-upload", async () => {
    m.profiles["brand-co"].logoUrl = COLLEAGUE_LOGO;
    m.legacy.add(COLLEAGUE_LOGO);
    await expectSealed(COLLEAGUE_LOGO, as("stranger-co"), "untrusted legacy logo");
    // its uploader still sees it
    expect((await download(COLLEAGUE_LOGO, as("brand-co", "brand-co-admin2"))).status).toBe(200);
  });
});

// ── S7: private-request submission eligibility and the submit-then-read attack ──
describe("S7 submission to a private request", () => {
  const submit = (co: string, headers: Row = {}) =>
    request(server).post("/api/tenders/t1/offers").set({ ...as(co), ...headers }).send({ quotePrice: 1, notes: "x" });

  it("ATTACK: an uninvited company is refused, nothing is written, and it still cannot read the request's files", async () => {
    await expectSealed(SPEC, as("stranger-co"), "before");
    const r = await submit("stranger-co");
    expect([r.status, r.body.code]).toEqual([403, "NOT_INVITED"]);
    expect(m.created).toEqual([]);
    expect(m.notified).toEqual([]);
    await expectSealed(SPEC, as("stranger-co"), "after the refused submission");
  });

  it("raw tender id and another request's token are not evidence", async () => {
    for (const token of ["t1", "tok-other"]) {
      const r = await submit("stranger-co", { "X-Invitation-Token": token });
      expect([token, r.status]).toEqual([token, 403]);
    }
    expect(m.created).toEqual([]);
  });

  it("an invited company submits; as an offer holder it then reads the request file (legitimate)", async () => {
    const r = await submit("invited-co");
    expect(r.status).toBe(200);
    expect(m.created).toHaveLength(1);
    await vi.waitFor(() => expect(m.notified).toEqual(["t1"]));
    m.offers.push(...m.created);
    const d = await download(SPEC, as("invited-co"));
    expect([d.status, d.body]).toEqual([200, bytesOf(SPEC)]);
  });

  it("a link holder presenting the request's own token submits successfully", async () => {
    const r = await submit("link-co", { "X-Invitation-Token": "tok-t1" });
    expect(r.status).toBe(200);
    await vi.waitFor(() => expect(m.notified).toEqual(["t1"]));
  });

  it("the requester's own company cannot submit", async () => {
    const r = await submit("owner-co");
    expect([r.status, r.body.code]).toEqual([403, "SELF_SUBMISSION"]);
    expect(m.created).toEqual([]);
  });
});
