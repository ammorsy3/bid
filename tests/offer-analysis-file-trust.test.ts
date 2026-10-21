// NF-2 (SEC-PO-AUTHZ-R1): AI proposal analysis reads an offer's files on the
// server and sends their text to the AI provider. Only files the offer really
// owns (server/lib/object-provenance.ts) may be read.
//
// The real POST /api/ai/analyze-offer/:offerId handler and analyzeOfferWithAI run.
// Stubbed: storage (in memory), the ACL provenance lookup, text extraction (records
// every path it is asked to read) and the AI provider (global fetch records every
// request body). Nothing here reaches a database, the object store or the network.

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

const m = vi.hoisted(() => ({
  offers: [] as Record<string, any>[],
  acl: {} as Record<string, { ownerId: string; ownerCompanyId: string | null; provenance: "company" | "pending_onboarding" | null }>,
  extracted: [] as string[],
  aiBodies: [] as string[],
  analyses: [] as Record<string, any>[],
}));

const SECRET = (p: string) => `SECRET-TEXT-OF:${p}`;
const OWN_TECH = "/objects/uploads/vendor-a-tech";
const OWN_FIN = "/objects/uploads/vendor-a-fin";
const FOREIGN = "/objects/uploads/vendor-b-sealed-bid";
const LEGACY_OWN = "/objects/uploads/legacy-a";

vi.mock("../server/db", () => ({ db: {}, pool: { on: () => undefined, query: async () => ({ rows: [] }) } }));
vi.mock("../server/objectAcl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/objectAcl")>()),
  getObjectProvenance: async (p: string) => (m.acl[p] ? { ...m.acl[p], visibility: "private" } : null),
}));
vi.mock("../server/textExtraction", () => ({
  fetchAndExtractFile: async (p: string) => { m.extracted.push(p); return SECRET(p); },
}));
vi.mock("../server/lib/tender-ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/lib/tender-ai")>()),
  getOpenAIConfig: () => ({ url: "https://ai.invalid/v1/chat/completions", key: "inert" }),
}));
vi.mock("../server/lib/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/lib/entitlements")>()),
  requireFeature: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../server/storage", () => {
  const tender = { id: "t1", companyId: "owner-co", title: "RFP", description: "d", submissionType: "tech_fin_proposal", rfpRequirements: ["ISO 9001"], status: "closed" };
  const known: Record<string, (...a: any[]) => unknown> = {
    getUser: async (id: string) => ({ id, email: `${id}@example.test`, otpVerified: true, isAdmin: false, lastLoginAt: new Date() }),
    getUserRoleInCompany: async () => "owner",
    getOffer: async (id: string) => m.offers.find((o) => o.id === id),
    getTender: async () => tender,
    getOffersByTender: async () => m.offers.map((o) => ({ ...o, company: { name: o.companyId }, profile: null })),
    getProposalAnalysisByOffer: async () => undefined,
    createProposalAnalysis: async (a: Record<string, any>) => { m.analyses.push(a); return a; },
  };
  return { storage: new Proxy(known, { get: (t, k: string) => t[k] ?? (async () => undefined) }) };
});

let app: express.Express;

let server: TestServer;

afterAll(() => stopTestServer(server));
const realFetch = globalThis.fetch;
const owner = { Authorization: `Bearer ${jwt.sign({ userId: "owner-co-user", activeCompanyId: "owner-co", roleInCompany: "owner" }, process.env.JWT_SECRET!)}` };
const analyze = (offerId: string) => request(server).post(`/api/ai/analyze-offer/${offerId}`).set(owner).send({});
const offer = (files: Record<string, string>) => {
  m.offers = [{ id: "o-a", tenderId: "t1", companyId: "vendor-a", createdBy: "vendor-a-user", status: "pending", quotePrice: null, notes: null, ...files }];
};
const sentToAi = () => m.aiBodies.join("\n");

beforeAll(async () => {
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    m.aiBodies.push(String(init?.body ?? ""));
    return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const { registerRoutes } = await import("../server/routes");
  app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = await startTestServer(app);
}, 60_000);
afterAll(() => { globalThis.fetch = realFetch; });

beforeEach(() => {
  m.acl = {
    [OWN_TECH]: { ownerId: "vendor-a-user", ownerCompanyId: "vendor-a", provenance: "company" },
    [OWN_FIN]: { ownerId: "vendor-a-colleague", ownerCompanyId: "vendor-a", provenance: "company" },
    [FOREIGN]: { ownerId: "vendor-b-user", ownerCompanyId: "vendor-b", provenance: "company" },
    [LEGACY_OWN]: { ownerId: "vendor-a-user", ownerCompanyId: null, provenance: null },
  };
  m.extracted = [];
  m.aiBodies = [];
  m.analyses = [];
});

describe("NF-2: AI analysis reads only files the offer owns", () => {
  it("REPRO: a stored offer naming another company's sealed bid — the file is never read and its text never reaches the AI", async () => {
    offer({ technicalFileUrl: OWN_TECH, financialFileUrl: FOREIGN });
    const r = await analyze("o-a");
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(m.extracted).toEqual([OWN_TECH]);
    expect(sentToAi()).toContain(SECRET(OWN_TECH));
    expect(sentToAi()).not.toContain(SECRET(FOREIGN));
    expect(sentToAi()).toContain("FINANCIAL PROPOSAL: withheld");
  });

  it("forged references of every shape are skipped before any read: foreign company, pending onboarding, no ACL, non-upload path", async () => {
    m.acl["/objects/uploads/pending"] = { ownerId: "vendor-a-user", ownerCompanyId: null, provenance: "pending_onboarding" };
    for (const url of [FOREIGN, "/objects/uploads/pending", "/objects/uploads/no-acl", "/objects/company-logos/x.png", "https://evil.example/x.pdf"]) {
      m.extracted = []; m.aiBodies = [];
      offer({ combinedFileUrl: url });
      expect((await analyze("o-a")).status).toBe(200);
      expect([url, m.extracted]).toEqual([url, []]);
      expect(sentToAi()).not.toContain("SECRET-TEXT-OF");
    }
  });

  it("the offering company's own files are read: a colleague's company upload and the author's legacy file", async () => {
    offer({ technicalFileUrl: LEGACY_OWN, financialFileUrl: OWN_FIN });
    expect((await analyze("o-a")).status).toBe(200);
    expect(m.extracted.sort()).toEqual([LEGACY_OWN, OWN_FIN].sort());
    expect(sentToAi()).toContain(SECRET(OWN_FIN));
    expect(sentToAi()).not.toContain("withheld");
  });

  it("a legacy file attached by someone other than its uploader is skipped", async () => {
    m.offers = [{ id: "o-a", tenderId: "t1", companyId: "vendor-a", createdBy: "vendor-a-other", status: "pending", technicalFileUrl: LEGACY_OWN }];
    expect((await analyze("o-a")).status).toBe(200);
    expect(m.extracted).toEqual([]);
  });
});
