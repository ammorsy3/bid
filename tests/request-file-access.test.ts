// SEC-S4S5: request files (attachments, voice note) follow one read policy with
// lifecycle rules (S4); offer documents must be the submitter's own uploads and
// are readable only by the parties to the offer (S5).
//
// The real server/routes.ts handlers run: GET /objects/*, GET /api/tenders/:id and
// POST /api/tenders/:id/offers. Storage, the ACL owner lookup and the object store
// are in-memory stubs, so a 200 here means "the handler streamed the object's
// bytes", and nothing here proves what PostgreSQL stores or how concurrent
// requests interleave on it.

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { tenderReadGrant } from "../server/lib/tender-access";
import { findOfferFileProblem } from "../server/lib/offer-files";

type Tender = Record<string, any>;
type Offer = Record<string, any>;

const m = vi.hoisted(() => ({
  tenders: [] as Tender[],
  offers: [] as Offer[],
  invitedCompanies: {} as Record<string, string[]>, // tenderId -> companyIds (invitations rows)
  invitedEmails: {} as Record<string, string[]>, // tenderId -> emails (invitation_links rows)
  owners: {} as Record<string, string>, // object path -> ACL owner (fixed when the upload was issued)
  publicObjects: new Set<string>(), // object paths whose ACL visibility is public
  brandAssets: {} as Record<string, { companyId: string; ownerUserId: string | null }[]>, // path -> profiles using it
  profileUpdates: [] as Record<string, unknown>[],
  issued: [] as { ownerId: string; objectPath: string }[],
  roles: {} as Record<string, string>, // userId -> role in its company (default owner)
  companyOf: {} as Record<string, string>, // object path -> issuing company (default: derived from the owner id)
  legacy: new Set<string>(), // object paths with provenance NULL (pre-0017)
  created: [] as Offer[],
  statusUpdates: [] as { id: string; status: string }[],
  notified: [] as string[],
}));

const bytesOf = (p: string) => `BYTES:${p}`;
const SPEC = "/objects/uploads/spec";
const VOICE = "/objects/uploads/voice";
const A_TECH = "/objects/uploads/a-tech";
const B_TECH = "/objects/uploads/b-tech";
const A_NEW = "/objects/uploads/a-new";

vi.mock("../server/db", () => ({ db: {}, pool: { on: () => undefined, query: async () => ({ rows: [] }) } }));
vi.mock("../server/objectAcl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/objectAcl")>()),
  getObjectOwnerByPath: async (p: string) => m.owners[p] ?? null,
  // Provenance as written at issuance: the owner's company ("<company>-user", "-user2", "-admin2"),
  // unless overridden; legacy rows have provenance NULL.
  getObjectProvenance: async (p: string) => {
    const ownerId = m.owners[p];
    if (!ownerId) return null;
    if (m.legacy.has(p)) return { ownerId, ownerCompanyId: null, provenance: null, visibility: m.publicObjects.has(p) ? "public" : "private" };
    const ownerCompanyId = m.companyOf[p] ?? ownerId.replace(/-(user|admin)\d*$/, "");
    return { ownerId, ownerCompanyId, provenance: "company", visibility: m.publicObjects.has(p) ? "public" : "private" };
  },
  getObjectAclPolicy: async (o: { objectPath?: string; name: string }) => {
    const p = o.objectPath ?? o.name;
    return m.owners[p] ? { owner: m.owners[p], visibility: m.publicObjects.has(p) ? "public" : "private" } : null;
  },
  publishCompanyObject: async (p: string, companyId: string) => {
    const owner = m.owners[p];
    if (!owner || m.legacy.has(p) || (m.companyOf[p] ?? owner.replace(/-(user|admin)\d*$/, "")) !== companyId) return false;
    m.publicObjects.add(p);
    return true;
  },
}));
vi.mock("../server/objectStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/objectStorage")>();
  class ObjectStorageService extends (actual.ObjectStorageService as any) {
    async getObjectEntityFile(p: string) { return { bucket: "private-files", name: p, objectPath: p, isPublic: false }; }
    // The ACL itself: the uploader, or anyone once the object is public (no tenderAccess rows are written).
    async canAccessObjectEntity({ objectFile, userId }: { objectFile: { name: string }; userId?: string }) {
      return m.publicObjects.has(objectFile.name) || (!!userId && m.owners[objectFile.name] === userId);
    }
    // Issuance records the owner before the URL is returned (as the real method does).
    async issueObjectEntityUpload(ownerId: string) {
      const objectPath = `/objects/uploads/issued-${m.issued.length}`;
      m.owners[objectPath] = ownerId;
      m.issued.push({ ownerId, objectPath });
      return { uploadURL: `https://storage.example/private-files/${objectPath.slice("/objects/".length)}?sig=x`, objectPath };
    }
    async getObjectSize() { return 10; }
    async trySetObjectEntityAclPolicy(raw: string) { return raw.startsWith("/objects/") ? raw : "/objects/" + raw.split("/private-files/")[1].split("?")[0]; }
    async downloadObject(obj: { name: string }, res: any) { res.type("application/octet-stream").send(bytesOf(obj.name)); }
  }
  return { ...actual, ObjectStorageService };
});
vi.mock("../server/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/email")>()),
  sendNewOfferNotification: async ({ tenderId }: { tenderId: string }) => { m.notified.push(tenderId); },
}));
// Vendor registration (BID-OFFERING-CLASSIFICATION) has its own tests
// (tests/offerings-*.test.ts); here the submitting organization is a registered vendor.
vi.mock("../server/lib/offering-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/lib/offering-store")>()),
  offeringStore: () => ({ status: async () => "registered" }),
}));
vi.mock("../server/storage", () => {
  const known: Record<string, (...a: any[]) => unknown> = {
    getUser: async (id: string) => ({ id, email: `${id}@example.test`, otpVerified: true, isAdmin: false, lastLoginAt: new Date() }),
    getUserRoleInCompany: async (userId: string) => m.roles[userId] ?? "owner",
    getCompany: async (id: string) => ({ id, name: id, accountType: "company", verificationStatus: "verified", isActive: true }),
    getTender: async (id: string) => m.tenders.find((t) => t.id === id),
    getTendersByAttachmentUrl: async (u: string) => m.tenders.filter((t) => (t.attachments ?? []).some((a: any) => a.url === u)),
    getTendersByMediaUrl: async (u: string) => m.tenders.filter((t) => t.voiceNoteUrl === u || t.videoUrl === u),
    getOffersByFileUrl: async (u: string) => m.offers.filter((o) => [o.technicalFileUrl, o.financialFileUrl, o.combinedFileUrl].includes(u)),
    getInvitationsByTender: async (tid: string) => (m.invitedCompanies[tid] ?? []).map((companyId) => ({ companyId })),
    getInvitationLinkByTenderAndEmail: async (tid: string, email: string) =>
      (m.invitedEmails[tid] ?? []).includes(email.trim().toLowerCase()) ? { tenderId: tid, vendorEmail: email } : undefined,
    getOfferByTenderAndCompany: async (tid: string, co: string) => m.offers.find((o) => o.tenderId === tid && o.companyId === co) ?? null,
    getCompaniesByBrandAssetUrl: async (p: string) => m.brandAssets[p] ?? [],
    getCompanyProfile: async (companyId: string) => ({ companyId, displayName: companyId }),
    updateCompanyProfile: async (_id: string, u: Record<string, unknown>) => { m.profileUpdates.push(u); return u; },
    getCompanyDocumentsByFileUrl: async () => [],
    createOffer: async (o: Offer) => { const offer = { id: `o-new-${m.created.length}`, ...o }; m.created.push(offer); return offer; },
    updateOfferStatus: async (id: string, status: string) => { m.statusUpdates.push({ id, status }); },
    getOffersByTender: async () => m.created,
    getCompanyMembers: async () => [],
    filterRecipientsByPreference: async (r: unknown[]) => r,
  };
  return { storage: new Proxy(known, { get: (t, k: string) => t[k] ?? (async () => undefined) }) };
});

let app: express.Express;

let server: TestServer;

afterAll(() => stopTestServer(server));
const tokenFor = (userId: string, companyId: string) =>
  jwt.sign({ userId, activeCompanyId: companyId, roleInCompany: "owner" }, process.env.JWT_SECRET!);
/** Each company acts through its first user `<company>-user`. */
const as = (companyId: string, userId = `${companyId}-user`) => ({ Authorization: `Bearer ${tokenFor(userId, companyId)}` });
const download = (path: string, headers: Record<string, string> = {}) =>
  request(server).get(path).set(headers).buffer(true).parse((res, cb) => {
    let d = "";
    res.on("data", (c: Buffer) => (d += c));
    res.on("end", () => cb(null, d));
  });

beforeAll(async () => {
  const { registerRoutes } = await import("../server/routes");
  app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 60_000);

function privateTender(status: string, extra: Tender = {}): Tender {
  return {
    id: "t1", companyId: "owner-co", title: "Private RFP", description: "d", deadline: "2099-12-31",
    status, createdBy: "owner-co-user", isMarketplace: false, marketplaceStatus: null, showPriceToVendors: true, invitationToken: "tok-t1",
    targetAudienceTypes: ["company"],
    attachments: [{ id: "a1", name: "spec.pdf", url: SPEC, size: 1, type: "application/pdf" }],
    voiceNoteUrl: VOICE, videoUrl: null,
    ...extra,
  };
}

beforeEach(() => {
  m.tenders = [privateTender("published")];
  m.offers = [
    { id: "o-a", tenderId: "t1", companyId: "vendor-a", createdBy: "vendor-a-user", status: "pending", technicalFileUrl: A_TECH },
    { id: "o-b", tenderId: "t1", companyId: "vendor-b", createdBy: "vendor-b-user", status: "pending", technicalFileUrl: B_TECH },
  ];
  m.invitedCompanies = { t1: ["invited-co"] };
  m.invitedEmails = { t1: ["email-co-user@example.test"] };
  m.owners = { [SPEC]: "owner-co-user", [VOICE]: "owner-co-user", [A_TECH]: "vendor-a-user", [B_TECH]: "vendor-b-user", [A_NEW]: "vendor-a-user" };
  m.publicObjects = new Set();
  m.brandAssets = {};
  m.profileUpdates = [];
  m.issued = [];
  m.roles = {};
  m.companyOf = {};
  m.legacy = new Set();
  m.created = [];
  m.statusUpdates = [];
  m.notified = [];
});

// ── S4: request files, role × lifecycle ─────────────────────────────────────────
type Caller = { label: string; headers: () => Record<string, string>; allowed: string[] };
const STATES = ["draft", "published", "closed", "cancelled"];
const CALLERS: Caller[] = [
  { label: "owner company", headers: () => as("owner-co"), allowed: ["draft", "published", "closed", "cancelled"] },
  { label: "invited company (invitation row)", headers: () => as("invited-co"), allowed: ["published", "closed"] },
  { label: "invited by email (invitation link row)", headers: () => as("email-co"), allowed: ["published", "closed"] },
  { label: "company with an offer", headers: () => as("vendor-a"), allowed: ["published", "closed", "cancelled"] },
  { label: "unrelated company", headers: () => as("stranger-co"), allowed: [] },
  { label: "signed-in holder of the invitation link (token header)", headers: () => ({ ...as("stranger-co"), "X-Invitation-Token": "tok-t1" }), allowed: ["published"] },
  { label: "signed-in caller presenting the raw tender id, not the token", headers: () => ({ ...as("stranger-co"), "X-Invitation-Token": "t1" }), allowed: [] },
  { label: "signed-in caller presenting a wrong token", headers: () => ({ ...as("stranger-co"), "X-Invitation-Token": "tok-t2" }), allowed: [] },
];

describe("S4 request attachment and voice note: role × state (status and bytes)", () => {
  for (const file of [SPEC, VOICE]) {
    for (const caller of CALLERS) {
      for (const state of STATES) {
        const allowed = caller.allowed.includes(state);
        it(`${file.endsWith("spec") ? "attachment" : "voice note"} · ${caller.label} · ${state} → ${allowed ? "200 + bytes" : "403"}`, async () => {
          m.tenders = [privateTender(state)];
          const r = await download(file, caller.headers());
          if (allowed) {
            expect(r.status).toBe(200);
            expect(r.body).toBe(bytesOf(file));
          } else {
            expect(r.status).toBe(403);
            expect(r.body).not.toContain("BYTES:");
          }
        });
      }
    }
  }

  it("anonymous: 401 and no bytes, with or without the token", async () => {
    for (const headers of [{}, { "X-Invitation-Token": "tok-t1" }]) {
      const r = await download(SPEC, headers);
      expect(r.status).toBe(401);
      expect(r.body).not.toContain("BYTES:");
    }
  });

  it("approved marketplace request: any signed-in company while published, nobody else after", async () => {
    for (const state of STATES) {
      m.tenders = [privateTender(state, { isMarketplace: true, marketplaceStatus: "approved" })];
      const r = await download(SPEC, as("market-co"));
      expect([state, r.status]).toEqual([state, state === "published" ? 200 : 403]);
    }
    m.tenders = [privateTender("published", { isMarketplace: true, marketplaceStatus: "pending" })];
    expect((await download(SPEC, as("market-co"))).status).toBe(403);
  });

  it("a company file uploaded by someone who has since left stays readable to invitees (company provenance, not membership)", async () => {
    m.owners[SPEC] = "former-user";
    m.companyOf[SPEC] = "owner-co"; // issued for owner-co while they belonged to it
    expect((await download(SPEC, as("invited-co"))).status).toBe(200);
  });

  it("a colleague's upload added to someone else's request is served (r8: company provenance restores this)", async () => {
    m.owners[SPEC] = "owner-co-user2";
    expect((await download(SPEC, as("invited-co"))).status).toBe(200);
    expect((await download(SPEC, as("owner-co"))).status).toBe(200);
  });

  it("legacy file (pre-provenance): served only when its uploader authored the request", async () => {
    m.legacy.add(SPEC);
    expect((await download(SPEC, as("invited-co"))).status).toBe(200); // owner-co-user authored t1
    m.owners[SPEC] = "owner-co-user2";
    expect((await download(SPEC, as("invited-co"))).status).toBe(403); // legacy colleague upload: no trusted evidence
  });
});

describe("S4 provenance: a record that names someone else's file grants nothing", () => {
  it("a forged request attachment (attacker's own request lists a competitor's proposal) is denied, even to its 'owner'", async () => {
    m.tenders.push(privateTender("published", { id: "t-evil", companyId: "attacker-co", createdBy: "attacker-co-user", invitationToken: "tok-evil",
      attachments: [{ id: "x", name: "loot.pdf", url: B_TECH, size: 1, type: "application/pdf" }] }));
    const r = await download(B_TECH, as("attacker-co"));
    expect(r.status).toBe(403);
    expect(r.body).not.toContain("BYTES:");
  });

  it("a forged record listed before or after the genuine one neither grants nor shadows", async () => {
    const forged = privateTender("published", { id: "t-evil", companyId: "attacker-co", createdBy: "attacker-co-user", invitationToken: "tok-evil" });
    for (const order of ["before", "after"]) {
      m.tenders = order === "before" ? [forged, privateTender("published")] : [privateTender("published"), forged];
      expect([order, (await download(SPEC, as("invited-co"))).status]).toEqual([order, 200]);
      expect([order, (await download(SPEC, as("attacker-co"))).status]).toEqual([order, 403]);
    }
  });

  it("an object with no ACL row (never finalized) is denied to everyone but its uploader (fail closed)", async () => {
    delete m.owners[SPEC];
    expect((await download(SPEC, as("invited-co"))).status).toBe(403);
    expect((await download(SPEC, as("owner-co"))).status).toBe(403);
  });
});

describe("S4 offer documents stay sealed regardless of request visibility", () => {
  it("the offering company (uploader and colleague) and the requester read the proposal", async () => {
    expect((await download(A_TECH, as("vendor-a"))).body).toBe(bytesOf(A_TECH));
    const colleague = await download(A_TECH, as("vendor-a", "vendor-a-user2"));
    expect([colleague.status, colleague.body]).toEqual([200, bytesOf(A_TECH)]);
    const requester = await download(A_TECH, as("owner-co"));
    expect([requester.status, requester.body]).toEqual([200, bytesOf(A_TECH)]);
  });

  it("no cross-vendor access, and invitation, link or marketplace visibility never opens a proposal", async () => {
    m.tenders = [privateTender("published", { isMarketplace: true, marketplaceStatus: "approved" })];
    const callers: Array<[string, Record<string, string>]> = [
      ["vendor-b", as("vendor-b")], ["invited-co", as("invited-co")], ["email-co", as("email-co")], ["market-co", as("market-co")],
      ["stranger-co + link token", { ...as("stranger-co"), "X-Invitation-Token": "tok-t1" }],
    ];
    const warn = vi.spyOn(console, "warn");
    try {
      for (const [caller, headers] of callers) {
        warn.mockClear();
        const r = await download(A_TECH, headers);
        // The security property first, so it is checked for every caller even if the status differs.
        expect(r.body, `${caller}: proposal bytes`).not.toContain("BYTES:");
        expect(r.status, `${caller}: status`).toBe(403);
        // The denial must come from the /objects policy itself, not from another responder.
        expect(warn.mock.calls.some((c) => String(c[0]).startsWith(`[objects] 403 path=${A_TECH} `)), `${caller}: denied by the /objects policy`).toBe(true);
      }
    } finally {
      warn.mockRestore();
    }
  });

  it("cancelled request (P11): the offer holder still reads the request files and its own offer, never a competitor's", async () => {
    m.tenders = [privateTender("cancelled")];
    expect((await download(SPEC, as("vendor-a"))).status).toBe(200);
    expect((await download(A_TECH, as("vendor-a"))).status).toBe(200);
    expect((await download(B_TECH, as("vendor-a"))).status).toBe(403);
    expect((await download(A_TECH, as("owner-co"))).status).toBe(200);
  });

  it("an EXISTING forged offer reference (written before this fix) no longer opens the file", async () => {
    // attacker-co's offer — on its own request, so it is no party to t1 — names
    // vendor-b's proposal and t1's spec.
    m.tenders.push(privateTender("published", { id: "t-evil", companyId: "attacker-co", createdBy: "attacker-co-user", invitationToken: "tok-evil", attachments: [], voiceNoteUrl: null }));
    m.offers.push({ id: "o-evil", tenderId: "t-evil", companyId: "attacker-co", createdBy: "attacker-co-user", status: "pending",
      technicalFileUrl: B_TECH, financialFileUrl: SPEC });
    for (const path of [B_TECH, SPEC]) {
      const r = await download(path, as("attacker-co"));
      expect(r.status).toBe(403);
      expect(r.body).not.toContain("BYTES:");
    }
    // ...and the forged offer does not shadow vendor-b's genuine one for the requester.
    expect((await download(B_TECH, as("owner-co"))).status).toBe(200);
  });
});

describe("S4 request read (GET /api/tenders/:id) follows the same policy", () => {
  const read = (headers: Record<string, string>) => request(server).get("/api/tenders/t1").set(headers);
  for (const caller of CALLERS.filter((c) => !c.label.includes("token") && !c.label.includes("raw tender id"))) {
    for (const state of STATES) {
      const allowed = caller.allowed.includes(state);
      it(`${caller.label} · ${state} → ${allowed ? 200 : 403}`, async () => {
        m.tenders = [privateTender(state)];
        const r = await read(caller.headers());
        expect(r.status).toBe(allowed ? 200 : 403);
        if (!allowed) expect(r.body).toEqual({ message: "Access denied" });
      });
    }
  }
  it("the invitation token is not a request-read grant (link holders use the public link pages)", async () => {
    const r = await read({ ...as("stranger-co"), "X-Invitation-Token": "tok-t1" });
    expect(r.status).toBe(403);
  });
});

describe("S4 public invitation-link pages never serve a draft", () => {
  it("by-token: draft → 404, published → 200", async () => {
    m.tenders = [privateTender("draft")];
    const { storage } = await import("../server/storage");
    (storage as any).getTenderByInvitationToken = async (t: string) => m.tenders.find((x) => x.invitationToken === t);
    expect((await request(server).get("/api/tenders/by-token/tok-t1")).status).toBe(404);
    m.tenders = [privateTender("published")];
    expect((await request(server).get("/api/tenders/by-token/tok-t1")).status).toBe(200);
  });
  it("invite page: draft → 404, published → 200, closed → 404 (unchanged)", async () => {
    const { storage } = await import("../server/storage");
    (storage as any).getTenderByInvitationToken = async (t: string) => m.tenders.find((x) => x.invitationToken === t);
    for (const [state, code] of [["draft", 404], ["published", 200], ["closed", 404]] as const) {
      m.tenders = [privateTender(state)];
      expect((await request(server).get("/api/tenders/tok-t1/invite")).status).toBe(code);
    }
  });
});

// ── S5: offer file references ───────────────────────────────────────────────────
describe("S5 offer file references are validated before any write", () => {
  const submit = (body: Record<string, unknown>, headers = as("vendor-c")) =>
    request(server).post("/api/tenders/t1/offers").set(headers).send(body);
  // Eligible submitters (S7), so what these tests exercise is the file check.
  beforeEach(() => { m.invitedCompanies.t1.push("vendor-a", "vendor-c"); });

  it("ATTACK CHAIN: a foreign protected path is rejected, nothing is written or superseded, and the file stays unreadable", async () => {
    m.offers.push({ id: "o-c-old", tenderId: "t1", companyId: "vendor-c", createdBy: "vendor-c-user", status: "pending", resubmissionAllowed: true });
    const r = await submit({ technicalFileUrl: B_TECH, quotePrice: 1 });
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ message: "Invalid offer data", code: "FILE_NOT_OWNED", field: "technicalFileUrl" });
    expect(m.created).toHaveLength(0);
    expect(m.statusUpdates).toHaveLength(0);
    expect(m.notified).toHaveLength(0);
    const d = await download(B_TECH, as("vendor-c"));
    expect(d.status).toBe(403);
    expect(d.body).not.toContain("BYTES:");
  });

  for (const field of ["technicalFileUrl", "financialFileUrl", "combinedFileUrl"] as const) {
    it(`${field}: another party's upload → 400 FILE_NOT_OWNED`, async () => {
      const r = await submit({ [field]: SPEC });
      expect(r.body).toEqual({ message: "Invalid offer data", code: "FILE_NOT_OWNED", field });
      expect(m.created).toHaveLength(0);
    });
    it(`${field}: invalid or unsupported references → 400 INVALID_FILE_REFERENCE`, async () => {
      for (const value of ["https://evil.example/x.pdf", "/objects/brand/logo.png", "/objects/uploads/../uploads/spec", "/objects/uploads/a b", "uploads/spec", "/api/objects/uploads/x"]) {
        const r = await submit({ [field]: value });
        expect([value, r.status, r.body.code, r.body.field]).toEqual([value, 400, "INVALID_FILE_REFERENCE", field]);
      }
      expect(m.created).toHaveLength(0);
    });
    it(`${field}: an unfinalized upload (no ACL owner) → 400 FILE_NOT_OWNED`, async () => {
      const r = await submit({ [field]: "/objects/uploads/not-finalized" }, as("vendor-a"));
      expect(r.body.code).toBe("FILE_NOT_OWNED");
      expect(m.created).toHaveLength(0);
    });
  }

  it("valid: the submitter's own finalized uploads in every file field are accepted and stored", async () => {
    m.owners["/objects/uploads/a-fin"] = "vendor-a-user";
    m.owners["/objects/uploads/a-comb"] = "vendor-a-user";
    m.offers = m.offers.filter((o) => o.companyId !== "vendor-a");
    const r = await submit({ technicalFileUrl: A_NEW, financialFileUrl: "/objects/uploads/a-fin", combinedFileUrl: "/objects/uploads/a-comb", videoUrl: "https://video.example/pitch" }, as("vendor-a"));
    expect(r.status).toBe(200);
    expect(m.created[0]).toMatchObject({ technicalFileUrl: A_NEW, financialFileUrl: "/objects/uploads/a-fin", combinedFileUrl: "/objects/uploads/a-comb", videoUrl: "https://video.example/pitch", status: "pending" });
  });

  it("unused file fields sent as empty strings (as the offer form does) are accepted; videoUrl is not treated as an upload", async () => {
    m.offers = m.offers.filter((o) => o.companyId !== "vendor-a");
    const r = await submit({ technicalFileUrl: "", financialFileUrl: "", combinedFileUrl: A_NEW, videoUrl: "https://video.example/v", notes: "" }, as("vendor-a"));
    expect(r.status).toBe(200);
  });

  it("a colleague's upload is refused: ownership is the submitting user's, not the company's", async () => {
    m.offers = m.offers.filter((o) => o.companyId !== "vendor-a");
    const r = await submit({ technicalFileUrl: A_NEW }, as("vendor-a", "vendor-a-user2"));
    expect(r.body).toEqual({ message: "Invalid offer data", code: "FILE_NOT_OWNED", field: "technicalFileUrl" });
  });

  it("valid resubmission with own new uploads supersedes the old offer", async () => {
    m.offers = [{ id: "o-a-old", tenderId: "t1", companyId: "vendor-a", createdBy: "vendor-a-user", status: "pending", resubmissionAllowed: true, technicalFileUrl: A_TECH }];
    const r = await submit({ technicalFileUrl: A_NEW }, as("vendor-a"));
    expect(r.status).toBe(200);
    expect(m.statusUpdates).toEqual([{ id: "o-a-old", status: "superseded" }]);
    expect(m.created[0].technicalFileUrl).toBe(A_NEW);
  });

  it("resubmission reusing the submitter's own earlier file is allowed (provenance = ACL owner, not 'it was on an offer')", async () => {
    m.offers = [{ id: "o-a-old", tenderId: "t1", companyId: "vendor-a", createdBy: "vendor-a-user", status: "pending", resubmissionAllowed: true, technicalFileUrl: A_TECH }];
    const r = await submit({ technicalFileUrl: A_TECH }, as("vendor-a"));
    expect(r.status).toBe(200);
  });

  it("resubmission naming a file that is on an offer but not the submitter's upload is rejected and the existing offer is preserved", async () => {
    m.offers = [{ id: "o-a-old", tenderId: "t1", companyId: "vendor-a", createdBy: "vendor-a-user2", status: "pending", resubmissionAllowed: true, technicalFileUrl: "/objects/uploads/colleague" }];
    m.owners["/objects/uploads/colleague"] = "vendor-a-user2";
    const r = await submit({ technicalFileUrl: "/objects/uploads/colleague" }, as("vendor-a"));
    expect(r.status).toBe(400);
    expect(m.statusUpdates).toHaveLength(0);
    expect(m.created).toHaveLength(0);
  });
});

describe("policy units", () => {
  it("tenderReadGrant: draft never for non-owners; precedence", () => {
    const t = (status: string, extra = {}) => ({ status, ...extra });
    const none = { isOwner: false, isInvited: false, hasOffer: false };
    expect(tenderReadGrant(t("draft"), { ...none, isInvited: true, hasOffer: true, presentedInvitationToken: true })).toBeNull();
    expect(tenderReadGrant(t("draft"), { ...none, isOwner: true })).toBe("owner");
    expect(tenderReadGrant(t("cancelled"), { ...none, isInvited: true })).toBeNull();
    expect(tenderReadGrant(t("cancelled"), { ...none, hasOffer: true })).toBe("offer_holder");
    expect(tenderReadGrant(t("closed"), { ...none, presentedInvitationToken: true })).toBeNull();
    expect(tenderReadGrant(t("published", { isMarketplace: true, marketplaceStatus: "approved" }), none)).toBe("marketplace");
  });

  it("findOfferFileProblem: first problem by field order, empties ignored, legacy needs re-upload", async () => {
    const prov = async (p: string) =>
      p === "/objects/uploads/mine" ? { ownerId: "u1", ownerCompanyId: "c1", provenance: "company" as const, visibility: "private" }
      : p === "/objects/uploads/old" ? { ownerId: "u1", ownerCompanyId: null, provenance: null, visibility: "private" }
      : null;
    const me = { userId: "u1", companyId: "c1" };
    expect(await findOfferFileProblem({ technicalFileUrl: "", financialFileUrl: null, combinedFileUrl: undefined }, me, prov)).toBeNull();
    expect(await findOfferFileProblem({ technicalFileUrl: "/objects/uploads/mine" }, me, prov)).toBeNull();
    expect(await findOfferFileProblem({ technicalFileUrl: "/objects/uploads/mine", financialFileUrl: "x" }, me, prov))
      .toEqual({ field: "financialFileUrl", code: "INVALID_FILE_REFERENCE" });
    expect(await findOfferFileProblem({ technicalFileUrl: "/objects/uploads/old" }, me, prov)).toEqual({ field: "technicalFileUrl", code: "REUPLOAD_REQUIRED" });
    expect(await findOfferFileProblem({ technicalFileUrl: "/objects/uploads/mine" }, { userId: "u1", companyId: "other" }, prov))
      .toEqual({ field: "technicalFileUrl", code: "FILE_NOT_OWNED" });
  });
});

// ── r2: Codex's independent reproductions, as durable tests of the intended denial ──
describe("S4-R1 provenance is record authorship, never membership", () => {
  it("CHAIN: the competitor's uploader also belongs to attacker-co; attacker-co's request names the proposal → 403, no bytes", async () => {
    // Membership of vendor-b-user in attacker-co is irrelevant now: it is not consulted at all.
    m.tenders.push(privateTender("published", { id: "t-evil", companyId: "attacker-co", createdBy: "attacker-co-user", invitationToken: "tok-evil",
      attachments: [{ id: "x", name: "loot.pdf", url: B_TECH, size: 1, type: "application/pdf" }], voiceNoteUrl: null }));
    for (const caller of [as("attacker-co"), as("attacker-co", "vendor-b-user2")]) {
      const r = await download(B_TECH, caller);
      expect(r.status).toBe(403);
      expect(r.body).not.toContain("BYTES:");
    }
    // Genuine parties keep access.
    expect((await download(B_TECH, as("vendor-b"))).status).toBe(200);
    expect((await download(B_TECH, as("owner-co"))).status).toBe(200);
  });

  it("an existing forged offer by a multi-company user's colleague is not trusted either", async () => {
    m.offers.push({ id: "o-evil2", tenderId: "t1", companyId: "attacker-co", createdBy: "attacker-co-user", status: "pending", technicalFileUrl: B_TECH });
    m.invitedCompanies.t1.push("attacker-co");
    const r = await download(B_TECH, as("attacker-co"));
    expect(r.status).toBe(403);
    expect(r.body).not.toContain("BYTES:");
  });
});

describe("S6 brand assets: a profile cannot publish someone else's file", () => {
  const putLogo = (logoUrl: unknown, headers = as("attacker-co")) =>
    request(server).put("/api/companies/attacker-co/profile").set(headers).send({ logoUrl });

  it("CHAIN: logoUrl = a private proposal path → 400 FILE_NOT_OWNED, nothing written or published, still unreadable", async () => {
    const r = await putLogo(B_TECH);
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ message: "Invalid logo", code: "FILE_NOT_OWNED", field: "logoUrl" });
    expect(m.profileUpdates).toHaveLength(0);
    expect(m.publicObjects.has(B_TECH)).toBe(false);
    const d = await download(B_TECH, as("stranger-co"));
    expect(d.status).toBe(403);
    expect(d.body).not.toContain("BYTES:");
  });

  it("the caller's own upload is accepted and explicitly published; others can then see the logo", async () => {
    m.owners["/objects/uploads/my-logo"] = "attacker-co-user";
    const r = await putLogo("/objects/uploads/my-logo");
    expect(r.status).toBe(200);
    expect(m.profileUpdates[0]).toMatchObject({ logoUrl: "/objects/uploads/my-logo" });
    expect(m.publicObjects.has("/objects/uploads/my-logo")).toBe(true);
    expect((await download("/objects/uploads/my-logo", as("stranger-co"))).status).toBe(200);
  });

  it("server-issued public brand paths, external URLs and clearing are accepted unchanged", async () => {
    for (const value of ["/objects/company-logos/abc.png", "https://cdn.example.com/logo.png", "", null]) {
      m.profileUpdates = [];
      const r = await putLogo(value);
      expect([value, r.status]).toEqual([value, 200]);
    }
  });

  it("other managed paths and non-strings are refused as INVALID_BRAND_ASSET", async () => {
    for (const value of ["/objects/credential-documents/x.pdf", "/objects/uploads/x.pdf", "/objects/uploads/../uploads/b-tech", 42]) {
      const r = await putLogo(value);
      expect([value, r.status, r.body.code]).toEqual([value, 400, "INVALID_BRAND_ASSET"]);
    }
    expect(m.profileUpdates).toHaveLength(0);
  });

  it("existing forged brand reference grants nothing; a legacy genuine one (attributed to the company owner) still shows", async () => {
    m.brandAssets[B_TECH] = [{ companyId: "attacker-co", ownerUserId: "attacker-co-user" }];
    expect((await download(B_TECH, as("stranger-co"))).status).toBe(403);
    m.owners["/objects/uploads/legacy-logo"] = "brand-co-user";
    m.brandAssets["/objects/uploads/legacy-logo"] = [{ companyId: "brand-co", ownerUserId: "brand-co-user" }];
    expect((await download("/objects/uploads/legacy-logo", as("stranger-co"))).status).toBe(200);
  });
});

describe("S7 submission eligibility is decided before any write", () => {
  const submit = (headers: Record<string, string>, body: Record<string, unknown> = { quotePrice: 1 }) =>
    request(server).post("/api/tenders/t1/offers").set(headers).send(body);
  const noWrites = () => {
    expect(m.created).toHaveLength(0);
    expect(m.statusUpdates).toHaveLength(0);
    expect(m.notified).toHaveLength(0);
  };

  it("CHAIN: an uninvited company is refused, nothing is written, and it gains no access to the request's files", async () => {
    expect((await download(SPEC, as("stranger-co"))).status).toBe(403);
    const r = await submit(as("stranger-co"));
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("NOT_INVITED");
    noWrites();
    const d = await download(SPEC, as("stranger-co"));
    expect(d.status).toBe(403);
    expect(d.body).not.toContain("BYTES:");
  });

  it("raw tender id, wrong token and another request's token are not evidence", async () => {
    m.tenders.push(privateTender("published", { id: "t2", invitationToken: "tok-t2" }));
    for (const token of ["t1", "tok-wrong", "tok-t2"]) {
      const r = await submit({ ...as("stranger-co"), "X-Invitation-Token": token });
      expect([token, r.status, r.body.code]).toEqual([token, 403, "NOT_INVITED"]);
    }
    noWrites();
  });

  it("legitimate evidence is accepted: invitation row, email invitation, the request's token, approved marketplace", async () => {
    const cases: [string, Record<string, string>, () => void][] = [
      ["invitation row", as("invited-co"), () => {}],
      ["email invitation", as("email-co"), () => {}],
      ["invitation link token", { ...as("link-co"), "X-Invitation-Token": "tok-t1" }, () => {}],
      ["approved marketplace", as("market-co"), () => { m.tenders = [privateTender("published", { isMarketplace: true, marketplaceStatus: "approved" })]; }],
    ];
    for (const [label, headers, setup] of cases) {
      m.created = [];
      setup();
      const r = await submit(headers);
      expect([label, r.status]).toEqual([label, 200]);
      expect(m.created).toHaveLength(1);
      await vi.waitFor(() => expect(m.notified).toHaveLength(cases.findIndex((c) => c[0] === label) + 1));
    }
  });

  it("self-submission by the requester's company is refused", async () => {
    const r = await submit(as("owner-co"));
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("SELF_SUBMISSION");
    noWrites();
  });

  it("a viewer is refused even with a valid invitation; a member is accepted", async () => {
    m.roles["invited-co-user"] = "viewer";
    expect((await submit(as("invited-co"))).status).toBe(403);
    noWrites();
    m.roles["invited-co-user"] = "member";
    expect((await submit(as("invited-co"))).status).toBe(200);
    await vi.waitFor(() => expect(m.notified).toEqual(["t1"]));
  });

  it("authorized resubmission works without a fresh invitation; an unauthorized existing offer does not open submission", async () => {
    m.offers = [{ id: "o-s-old", tenderId: "t1", companyId: "stranger-co", createdBy: "stranger-co-user", status: "pending", resubmissionAllowed: true }];
    const ok = await submit(as("stranger-co"));
    expect(ok.status).toBe(200);
    expect(m.statusUpdates).toEqual([{ id: "o-s-old", status: "superseded" }]);
    await vi.waitFor(() => expect(m.notified).toEqual(["t1"])); // the accepted offer's notification (after its response)
    m.created = []; m.statusUpdates = []; m.notified = [];
    m.offers = [{ id: "o-s-old", tenderId: "t1", companyId: "stranger-co", createdBy: "stranger-co-user", status: "pending", resubmissionAllowed: false }];
    const refused = await submit(as("stranger-co"));
    expect([refused.status, refused.body.code]).toEqual([403, "NOT_INVITED"]);
    noWrites();
  });

  it("published state is still required (closed request refused, no writes)", async () => {
    m.tenders = [privateTender("closed")];
    expect((await submit(as("invited-co"))).status).toBe(403);
    noWrites();
  });
});

describe("Upload ownership is fixed at issuance", () => {
  it("issuing an upload records the caller as owner; only that user may finalize it", async () => {
    const r = await request(server).post("/api/objects/upload").set(as("vendor-a")).send({});
    expect(r.status).toBe(200);
    expect(m.issued).toEqual([{ ownerId: "vendor-a-user", objectPath: "/objects/uploads/issued-0" }]);
    const fileURL = r.body.uploadURL;
    const stranger = await request(server).put("/api/objects/metadata").set(as("stranger-co")).send({ fileURL });
    expect(stranger.status).toBe(403);
    const owner = await request(server).put("/api/objects/metadata").set(as("vendor-a")).send({ fileURL });
    expect(owner.status).toBe(200);
    expect(owner.body.objectPath).toBe("/objects/uploads/issued-0");
  });

  it("an object that was never issued (no ACL row) cannot be claimed by finalizing it", async () => {
    const r = await request(server).put("/api/objects/metadata").set(as("stranger-co")).send({ fileURL: "/objects/uploads/unclaimed" });
    expect(r.status).toBe(403);
    expect(m.owners["/objects/uploads/unclaimed"]).toBeUndefined();
  });
});
