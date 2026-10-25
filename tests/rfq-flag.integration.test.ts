// Evidence gap: flag on → persisted itemized data → flag off, through the real
// routes on a real (scratch) PostgreSQL. With the flag off, reads and locks of
// existing itemized data keep working and every new itemized write is refused.
//
// Opt-in: RFQ_TEST_DATABASE_URL=postgres://…@127.0.0.1:…/<scratch db> npx vitest run tests/rfq-flag.integration.test.ts
// The app's DATABASE_URL is pointed at that scratch URL inside this test process
// only, after the localhost check. Rows use random ids; afterAll removes them.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { startTestServer, stopTestServer, type TestServer } from "./helpers/test-server";

const url = process.env.RFQ_TEST_DATABASE_URL;
const safe = (() => {
  if (!url) return false;
  const host = new URL(url).hostname;
  return (host === "localhost" || host === "127.0.0.1") && url !== process.env.PROD_DATABASE_URL;
})();

vi.mock("../server/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/email")>();
  const quiet: Record<string, unknown> = {};
  for (const k of Object.keys(actual)) quiet[k] = typeof (actual as any)[k] === "function" ? async () => undefined : (actual as any)[k];
  return quiet;
});
vi.mock("../server/lib/tender-ai", () => ({ suggestTenderCategory: async () => null, buildTenderTranslation: async () => null }));

describe.skipIf(!safe)("structured pricing flag on → off with persisted data", () => {
  const run = randomUUID().slice(0, 8);
  const ids = { buyer: `fb-${run}`, vendor: `fv-${run}`, ub: `fub-${run}`, uv: `fuv-${run}` };
  let server: TestServer;
  let pool: any;
  let tenderId = "";
  let offerId = "";
  const token = (userId: string, companyId: string, role: string) => ({ Authorization: `Bearer ${jwt.sign({ userId, activeCompanyId: companyId, roleInCompany: role }, process.env.JWT_SECRET!)}` });
  const buyer = () => token(ids.ub, ids.buyer, "owner");
  const vendor = () => token(ids.uv, ids.vendor, "member");

  beforeAll(async () => {
    process.env.DATABASE_URL = url!; // this process only, scratch database (checked above)
    const pg = (await import("pg")).default;
    pool = new pg.Pool({ connectionString: url });
    for (const [u, c, role] of [[ids.ub, ids.buyer, "owner"], [ids.uv, ids.vendor, "member"]]) {
      await pool.query(`INSERT INTO users (id, username, email, password, name, otp_verified) VALUES ($1, $2, $3, 'x', $4, true)`, [u, u, `${u}@example.invalid`, u]);
      await pool.query(`INSERT INTO companies (id, name, slug, account_type, verification_status) VALUES ($1, $2, $3, 'company', 'verified')`, [c, c, c]);
      await pool.query(`INSERT INTO user_companies (user_id, company_id, role_in_company) VALUES ($1, $2, $3)`, [u, c, role]);
    }
    const { registerRoutes } = await import("../server/routes");
    const app = express();
    app.use(express.json());
    await registerRoutes(app);
    server = await startTestServer(app);
  }, 60_000);
  afterAll(async () => {
    if (!safe) return;
    await stopTestServer(server);
    const q = (sql: string, args: unknown[]) => pool.query(sql, args).catch(() => {});
    await q(`DELETE FROM offers WHERE tender_id = $1`, [tenderId]);
    await q(`DELETE FROM offer_pricing_drafts WHERE tender_id = $1`, [tenderId]);
    await q(`DELETE FROM invitations WHERE tender_id = $1`, [tenderId]);
    await q(`DELETE FROM member_activity_log WHERE company_id = ANY($1)`, [[ids.buyer, ids.vendor]]);
    await q(`DELETE FROM product_events WHERE company_id = ANY($1)`, [[ids.buyer, ids.vendor]]);
    await q(`DELETE FROM vendors_base WHERE requester_company_id = $1`, [ids.buyer]);
    await q(`DELETE FROM tenders WHERE id = $1`, [tenderId]);
    await q(`DELETE FROM user_companies WHERE company_id = ANY($1)`, [[ids.buyer, ids.vendor]]);
    await q(`DELETE FROM companies WHERE id = ANY($1)`, [[ids.buyer, ids.vendor]]);
    await q(`DELETE FROM users WHERE id = ANY($1)`, [[ids.ub, ids.uv]]);
    await pool.end();
    delete process.env.STRUCTURED_PRICING_ENABLED;
  });

  const structured = { requestType: "rfq", itemizedPricing: true, itemColumns: [], items: [
    { name: "Cement", unit: "bag", quantity: "100", referenceUnitPrice: "18.00" },
    { name: "Rebar", unit: "ton", quantity: "2.5" },
  ] };
  const base = { title: "Flag RFQ", description: "Supply", deadline: "2099-12-31", targetAudienceTypes: ["company"], inquiryType: "email_whatsapp", emailContact: "rfq@example.test" };

  it("flag on: an itemized request, a shared draft and an offer are stored", async () => {
    process.env.STRUCTURED_PRICING_ENABLED = "true";
    const created = await request(server).post("/api/tenders").set(buyer()).send({ ...base, structured });
    expect(created.status).toBe(200);
    tenderId = created.body.id;
    await pool.query(`INSERT INTO invitations (tender_id, company_id, status) VALUES ($1, $2, 'pending')`, [tenderId, ids.vendor]);
    const items = (await request(server).get(`/api/tenders/${tenderId}/items`).set(vendor())).body.items;
    const payload = { responses: items.map((i: any) => ({ itemId: i.id, state: "priced", unitPrice: "10.00" })), tax: { applyVat: true, mixedTreatment: false }, notes: null, documents: null };
    const draft = await request(server).put(`/api/tenders/${tenderId}/pricing-draft`).set(vendor()).send({ baseVersion: null, itemsRevision: 1, payload });
    expect(draft.status).toBe(200);
    const sub = await request(server).post(`/api/tenders/${tenderId}/itemized-offers`).set(vendor()).send({ ...payload, submissionKey: `key-${run}`, itemsRevision: 1, draftVersion: draft.body.draft.version });
    expect(sub.status).toBe(200);
    offerId = sub.body.offer.id;
    expect(sub.body.offer.pricingTotal).toBe("1178.75"); // (100×10 + 2.5×10) × 1.15
  });

  it("flag off: reads keep working (requester items, vendor view, stored offer pricing)", async () => {
    process.env.STRUCTURED_PRICING_ENABLED = "false";
    const own = await request(server).get(`/api/tenders/${tenderId}/items`).set(buyer());
    expect([own.status, own.body.owner, own.body.items[0].referenceUnitPrice]).toEqual([200, true, "18.00"]);
    const v = await request(server).get(`/api/tenders/${tenderId}/items`).set(vendor());
    expect([v.status, v.body.owner, JSON.stringify(v.body).includes("18.00")]).toEqual([200, false, false]);
    const op = await request(server).get(`/api/offers/${offerId}/pricing`).set(buyer());
    expect([op.status, op.body.total]).toEqual([200, "1178.75"]);
    const pricing = await request(server).get(`/api/tenders/${tenderId}/pricing`).set(vendor());
    expect(pricing.status).toBe(200);
  });

  it("flag off: locks still hold and every new itemized write is refused", async () => {
    const lockedItems = await request(server).patch(`/api/tenders/${tenderId}`).set(buyer()).send({ deliverables: [{ id: "x", name: "x", unit: "u", quantity: 1 }] });
    expect([lockedItems.status, lockedItems.body.code]).toEqual([409, "ITEMS_LOCKED"]);
    const lockedSpec = await request(server).patch(`/api/tenders/${tenderId}`).set(buyer()).send({ description: "Changed" });
    expect([lockedSpec.status, lockedSpec.body.code]).toEqual([409, "SPEC_LOCKED"]);
    expect((await request(server).patch(`/api/tenders/${tenderId}`).set(buyer()).send({ title: "Renamed" })).status).toBe(200);

    const newReq = await request(server).post("/api/tenders").set(buyer()).send({ ...base, structured });
    expect([newReq.status, newReq.body.code]).toEqual([409, "STRUCTURED_PRICING_DISABLED"]);
    await pool.query(`UPDATE offers SET resubmission_allowed = true WHERE id = $1`, [offerId]); // even a reopened offer
    const draft = await request(server).put(`/api/tenders/${tenderId}/pricing-draft`).set(vendor()).send({ baseVersion: null, itemsRevision: 1, payload: { responses: [], tax: { applyVat: true, mixedTreatment: false } } });
    expect([draft.status, draft.body.code]).toEqual([409, "STRUCTURED_PRICING_DISABLED"]);
    const sub = await request(server).post(`/api/tenders/${tenderId}/itemized-offers`).set(vendor()).send({ responses: [], tax: { applyVat: true, mixedTreatment: false }, submissionKey: `key2-${run}`, itemsRevision: 1, draftVersion: null });
    expect([sub.status, sub.body.code]).toEqual([409, "STRUCTURED_PRICING_DISABLED"]);
    const legacy = await request(server).post(`/api/tenders/${tenderId}/offers`).set(vendor()).send({ quotePrice: 5 });
    expect([legacy.status, legacy.body.code]).toEqual([409, "ITEMIZED_SUBMISSION_REQUIRED"]);
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM offers WHERE tender_id = $1`, [tenderId]);
    expect(rows[0].n).toBe(1);
  });
});
