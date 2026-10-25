// RFQ-D2/D5 against a REAL Postgres (Amendment A2): the itemized submission is
// one transaction under the vendor-company lock — idempotent per (company,
// tender, key), revision-checked, superseding before insert, all-or-nothing —
// and the itemized request is created with its items and mirror in one write.
//
// Opt-in, like the other *.integration.test.ts files:
//   RFQ_TEST_DATABASE_URL=postgres://…@127.0.0.1:…/<scratch db> npx vitest run tests/rfq-offers.integration.test.ts
// - Never reads DATABASE_URL; refuses non-localhost hosts and DATABASE_URL / PROD_DATABASE_URL.
// - The scratch database needs the schema including migrations/0018_structured_pricing.sql. No DDL here.
// - Rows use random ids and are deleted in afterAll.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../shared/schema";
import { createTenderItemsStore } from "../server/lib/tender-items-store";
import { createRfqOfferStore, RfqOfferError } from "../server/lib/rfq-offer-store";
import { updateTenderGuarded } from "../server/lib/tender-update";
import { SpecLockedError } from "../server/lib/items-lock";

const url = process.env.RFQ_TEST_DATABASE_URL;
const safe = (() => {
  if (!url) return false;
  const host = new URL(url).hostname;
  return (host === "localhost" || host === "127.0.0.1") && url !== process.env.DATABASE_URL && url !== process.env.PROD_DATABASE_URL;
})();

describe.skipIf(!safe)("itemized requests and offers on Postgres", () => {
  const pool = safe ? new pg.Pool({ connectionString: url, max: 8, statement_timeout: 10_000, lock_timeout: 8_000 } as any) : (null as any);
  const db = safe ? drizzle(pool, { schema }) : (null as any);
  const items = safe ? createTenderItemsStore(db) : (null as any);
  const offersStore = safe ? createRfqOfferStore(db) : (null as any);
  const run = randomUUID().slice(0, 8);
  const ids = { buyer: `buyer-${run}`, vendor: `vendor-${run}`, u1: `u1-${run}`, u2: `u2-${run}`, ub: `ub-${run}` };
  let tenderId = "";
  let itemIds: string[] = [];

  beforeAll(async () => {
    for (const u of [ids.u1, ids.u2, ids.ub]) await db.insert(schema.users).values({ id: u, username: u, email: `${u}@example.invalid`, password: "x", name: u } as any);
    for (const c of [ids.buyer, ids.vendor]) await db.insert(schema.companies).values({ id: c, name: c, slug: c, accountType: "company", verificationStatus: "verified" } as any);
    const tender = await items.createItemizedTender(
      { title: "RFQ", description: "d", deadline: "2099-12-31", companyId: ids.buyer, createdBy: ids.ub, invitationToken: `tok-${run}`, status: "published" } as any,
      { requestType: "rfq", itemizedPricing: true, showReferencePrices: false, itemColumns: [], submissionType: "itemized_only",
        items: [
          { name: "Cement", description: null, unit: "bag", quantity: "100", referenceUnitPrice: "18.00", imageUrl: null, customValues: null },
          { name: "Rebar", description: null, unit: "ton", quantity: "2.5", referenceUnitPrice: null, imageUrl: null, customValues: null },
          { name: "Paint", description: null, unit: "L", quantity: "40", referenceUnitPrice: null, imageUrl: null, customValues: null },
        ] },
    );
    tenderId = tender.id;
    itemIds = (await items.getItems(tenderId, 1)).map((i: any) => i.id);
  });
  afterAll(async () => {
    const offerRows = await db.select({ id: schema.offers.id }).from(schema.offers).where(eq(schema.offers.tenderId, tenderId)).catch(() => []);
    if (offerRows.length) await db.delete(schema.offers).where(inArray(schema.offers.id, offerRows.map((o: any) => o.id))).catch(() => {});
    await db.delete(schema.offerPricingDrafts).where(eq(schema.offerPricingDrafts.tenderId, tenderId)).catch(() => {});
    await db.delete(schema.tenders).where(eq(schema.tenders.id, tenderId)).catch(() => {});
    await db.delete(schema.companies).where(inArray(schema.companies.id, [ids.buyer, ids.vendor])).catch(() => {});
    await db.delete(schema.users).where(inArray(schema.users.id, [ids.u1, ids.u2, ids.ub])).catch(() => {});
    await pool.end();
  });

  const body = (key: string, over: Record<string, unknown> = {}) => ({
    submissionKey: key, itemsRevision: 1, draftVersion: null as number | null, tax: { applyVat: true, mixedTreatment: false }, notes: null, documents: null,
    responses: [
      { itemId: itemIds[0], state: "priced", unitPrice: "18.50" },
      { itemId: itemIds[1], state: "priced", unitPrice: "2400.00", alternative: { name: "Rebar grade 60", unit: "ton", quantity: "2.5", unitPrice: "2150.00", reason: "Faster" } },
      { itemId: itemIds[2], state: "unavailable", alternative: { name: "Paint Y", unit: "L", quantity: "40", unitPrice: "32.25", reason: "Discontinued" } },
    ],
    ...over,
  });
  const docs = { technicalFileUrl: null, financialFileUrl: null, combinedFileUrl: null, videoUrl: null };

  it("the request was written with its items and a mirror without reference prices", async () => {
    const [t] = await db.select().from(schema.tenders).where(eq(schema.tenders.id, tenderId));
    expect([t.itemizedPricing, t.requestType, t.submissionType]).toEqual([true, "rfq", "itemized_only"]);
    // PB-8: structural — the mirror carries exactly the vendor-visible fields, never a price.
    const mirror = t.deliverables as Record<string, unknown>[];
    expect(mirror.map((d) => Object.keys(d).sort())).toEqual(Array(3).fill(["description", "id", "name", "quantity", "unit"]));
    expect(mirror.map((d) => [d.name, d.unit, d.quantity])).toEqual([["Cement", "bag", 100], ["Rebar", "ton", 2.5], ["Paint", "L", 40]]);
    for (const d of mirror) for (const k of Object.keys(d)) expect(k).not.toMatch(/price/i);
    expect(itemIds).toHaveLength(3);
  });

  it("two members submitting at once: exactly one offer; stored totals match the worked example", async () => {
    await offersStore.saveDraft({ tenderId, companyId: ids.vendor, userId: ids.u1, baseVersion: null, itemsRevision: 1, payload: body("x") });
    const results = await Promise.allSettled([
      offersStore.submit({ tenderId, companyId: ids.vendor, userId: ids.u1, body: body("key-aaaaaaaa", { draftVersion: 1 }), documents: docs }),
      offersStore.submit({ tenderId, companyId: ids.vendor, userId: ids.u2, body: body("key-bbbbbbbb", { draftVersion: 1 }), documents: docs }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as RfqOfferError).code).toBe("ALREADY_SUBMITTED");
    const rows = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId));
    expect(rows).toHaveLength(1);
    expect([rows[0].pricingSubtotal, rows[0].pricingVat, rows[0].pricingTotal, rows[0].quotePrice]).toEqual(["9140.00", "1371.00", "10511.00", null]);
    const responses = await db.select().from(schema.offerItemResponses).where(eq(schema.offerItemResponses.offerId, rows[0].id));
    expect(responses).toHaveLength(3);
    expect(await offersStore.getDraft(tenderId, ids.vendor)).toBeNull();
  });

  it("replaying the same key and request returns the same offer; the same key with another request is refused", async () => {
    const [first] = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId));
    const replay = await offersStore.submit({ tenderId, companyId: ids.vendor, userId: ids.u1, body: body(first.submissionKey!, { draftVersion: 1 }), documents: docs });
    expect([replay.replayed, replay.offer.id]).toEqual([true, first.id]);
    await expect(offersStore.submit({ tenderId, companyId: ids.vendor, userId: ids.u1, body: body(first.submissionKey!, { draftVersion: 1, notes: "changed" }), documents: docs }))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  it("a resubmission supersedes the old offer in the same transaction; a stale revision changes nothing", async () => {
    const [first] = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId));
    await expect(offersStore.submit({ tenderId, companyId: ids.vendor, userId: ids.u1, body: body("key-stale000", { itemsRevision: 2 }), documents: docs }))
      .rejects.toMatchObject({ code: "STALE_REVISION" });
    await db.update(schema.offers).set({ resubmissionAllowed: true }).where(eq(schema.offers.id, first.id));
    const again = await offersStore.submit({ tenderId, companyId: ids.vendor, userId: ids.u1, body: body("key-cccccccc"), documents: docs });
    const all = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId));
    expect(all.map((o: any) => [o.id === again.offer.id ? "new" : "old", o.status]).sort()).toEqual([["new", "pending"], ["old", "superseded"]]);
  });

  it("an incomplete final submission writes nothing", async () => {
    const before = (await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId))).length;
    await db.update(schema.offers).set({ resubmissionAllowed: true }).where(eq(schema.offers.tenderId, tenderId));
    await expect(offersStore.submit({ tenderId, companyId: ids.vendor, userId: ids.u1, body: body("key-dddddddd", { responses: body("x").responses.slice(0, 2) }), documents: docs }))
      .rejects.toMatchObject({ code: "PRICING_INCOMPLETE" });
    const after = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId));
    expect(after).toHaveLength(before);
    expect(after.filter((o: any) => o.status !== "superseded")).toHaveLength(1);
  });

  it("PB-2: a member submitting from an older draft version is refused; nothing is written or superseded", async () => {
    await db.update(schema.offers).set({ resubmissionAllowed: true }).where(eq(schema.offers.tenderId, tenderId));
    const before = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId));
    const v1 = await offersStore.saveDraft({ tenderId, companyId: ids.vendor, userId: ids.u1, baseVersion: null, itemsRevision: 1, payload: body("x") });
    await offersStore.saveDraft({ tenderId, companyId: ids.vendor, userId: ids.u2, baseVersion: v1.version, itemsRevision: 1, payload: body("x", { notes: "member B" }) });
    await expect(offersStore.submit({ tenderId, companyId: ids.vendor, userId: ids.u1, body: body("key-eeeeeeee", { draftVersion: v1.version }), documents: docs }))
      .rejects.toMatchObject({ code: "DRAFT_CONFLICT" });
    const after = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId));
    expect(after.map((o: any) => [o.id, o.status])).toEqual(before.map((o: any) => [o.id, o.status]));
    expect((await offersStore.getDraft(tenderId, ids.vendor))?.version).toBe(2);
  });

  it("a failure after superseding rolls everything back (real database error mid-transaction)", async () => {
    // A temporary trigger makes the response insert fail for one marker price.
    await pool.query(`CREATE OR REPLACE FUNCTION pb_fail_marker() RETURNS trigger AS $$ BEGIN IF NEW.unit_price = 777.77 THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql`);
    await pool.query(`CREATE TRIGGER pb_fail_marker BEFORE INSERT ON offer_item_responses FOR EACH ROW EXECUTE FUNCTION pb_fail_marker()`);
    try {
      const draft = await offersStore.getDraft(tenderId, ids.vendor);
      const before = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId));
      const current = before.find((o: any) => o.status !== "superseded");
      expect(current.resubmissionAllowed).toBe(true); // so the transaction does supersede it first
      const bad = body("key-ffffffff", { draftVersion: draft?.version ?? null });
      bad.responses = [{ ...bad.responses[0], unitPrice: "777.77" }, ...bad.responses.slice(1)];
      const err = await offersStore.submit({ tenderId, companyId: ids.vendor, userId: ids.u1, body: bad, documents: docs }).catch((e) => e);
      expect(String((err as { cause?: Error })?.cause?.message ?? err)).toMatch(/injected failure/); // drizzle wraps the database error
      const after = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, tenderId));
      expect(after.map((o: any) => [o.id, o.status]).sort()).toEqual(before.map((o: any) => [o.id, o.status]).sort()); // old offer NOT superseded, no new offer
      expect((await offersStore.getDraft(tenderId, ids.vendor))?.version).toBe(draft?.version); // draft kept
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS pb_fail_marker ON offer_item_responses`);
      await pool.query(`DROP FUNCTION IF EXISTS pb_fail_marker()`);
    }
  });

  describe("specification edit vs first offer (real locks)", () => {
    let legacyId = "";
    beforeAll(async () => {
      const [t] = await db.insert(schema.tenders).values({ title: "Legacy", description: "Original spec", deadline: "2099-12-31", companyId: ids.buyer, createdBy: ids.ub,
        invitationToken: `tok2-${run}`, status: "published", submissionType: "quote_only", deliverables: [{ id: "d1", name: "Cement", description: "", unit: "bag", quantity: 100 }] } as any).returning();
      legacyId = t.id;
    });
    afterAll(async () => {
      await db.delete(schema.offers).where(eq(schema.offers.tenderId, legacyId)).catch(() => {});
      await db.delete(schema.tenders).where(eq(schema.tenders.id, legacyId)).catch(() => {});
    });
    const pending = <T,>(p: Promise<T>) => Promise.race([p.then(() => "settled", () => "settled"), new Promise((r) => setTimeout(() => r("waiting"), 400))]);

    it("an uncommitted first offer makes the edit wait; once it commits the edit is refused (SPEC_LOCKED)", async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`INSERT INTO offers (tender_id, company_id, created_by, quote_price, status) VALUES ($1, $2, $3, 1000, 'pending')`, [legacyId, ids.vendor, ids.u1]);
        const edit = updateTenderGuarded(db, legacyId, { description: "Changed spec" } as any);
        expect(await pending(edit)).toBe("waiting"); // blocked on the row lock
        await client.query("COMMIT");
        await expect(edit).rejects.toBeInstanceOf(SpecLockedError);
      } finally { client.release(); }
      const [t] = await db.select().from(schema.tenders).where(eq(schema.tenders.id, legacyId));
      expect(t.description).toBe("Original spec");
    });

    it("an edit holding the lock makes a first offer wait until the edit commits (the offer prices the new spec)", async () => {
      await db.delete(schema.offers).where(eq(schema.offers.tenderId, legacyId));
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`SELECT id FROM tenders WHERE id = $1 FOR UPDATE`, [legacyId]); // what updateTenderGuarded takes
        await client.query(`UPDATE tenders SET description = 'Edited first' WHERE id = $1`, [legacyId]);
        const offer = pool.query(`INSERT INTO offers (tender_id, company_id, created_by, quote_price, status) VALUES ($1, $2, $3, 900, 'pending')`, [legacyId, ids.vendor, ids.u2]);
        expect(await pending(offer)).toBe("waiting"); // FK key-share lock waits for the edit
        await client.query("COMMIT");
        await offer;
      } finally { client.release(); }
      const [t] = await db.select().from(schema.tenders).where(eq(schema.tenders.id, legacyId));
      expect(t.description).toBe("Edited first");
      await expect(updateTenderGuarded(db, legacyId, { description: "Again" } as any)).rejects.toBeInstanceOf(SpecLockedError);
      expect((await updateTenderGuarded(db, legacyId, { title: "Renamed" } as any)).title).toBe("Renamed"); // non-spec edits still fine
    });
  });
});
