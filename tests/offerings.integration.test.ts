// Vendor offerings on a REAL PostgreSQL (BID-OFFERING-CLASSIFICATION): what
// mocks cannot prove — the save is one transaction (a failure late in it leaves
// nothing behind), concurrent editors are serialised by the row lock, the
// database itself refuses cross-group items, the seed is idempotent, and the
// analytics SQL agrees with the reference semantics.
//
// Opt-in, like the other *.integration.test.ts files:
//   OFFERINGS_TEST_DATABASE_URL=postgres://…@127.0.0.1:…/<scratch db> \
//     npx vitest run tests/offerings.integration.test.ts
// - Never reads DATABASE_URL. Refuses hosts other than localhost / 127.0.0.1 and
//   any URL equal to DATABASE_URL or PROD_DATABASE_URL.
// - The scratch database needs the base schema (drizzle-kit push of the BASE
//   revision, without these tables) and then migrations/0020 and 0021 via psql.
// - Rows use random ids and are deleted in afterAll. One temporary trigger is
//   created and dropped inside a test.
// Not run by `npm run test:unit` (*.integration.test.ts is excluded).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../shared/schema";
import { createOfferingStore, OfferingError } from "../server/lib/offering-store";
import { createOfferingAnalytics, referenceOrganizationsBy } from "../server/lib/offering-analytics";
import { offeringCatalogue } from "../server/lib/offering-catalogue";

const url = process.env.OFFERINGS_TEST_DATABASE_URL;
const safe = (() => {
  if (!url) return false;
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return false;
  return url !== process.env.DATABASE_URL && url !== process.env.PROD_DATABASE_URL;
})();

const G = "BID-D01-F01-G01"; // items I01, I02
const W = "BID-D01-F01-G03"; // no listed items
const H = "BID-D17-F01-G01"; // items I01..I04
const one = { groups: [{ groupId: G, itemIds: [`${G}-I01`], declared: false }] };

describe.skipIf(!safe)("vendor offerings on Postgres", () => {
  const pool = safe ? new pg.Pool({ connectionString: url, max: 8, statement_timeout: 10_000, lock_timeout: 8_000 } as any) : (null as any);
  const db = safe ? drizzle(pool, { schema }) : (null as any);
  const store = safe ? createOfferingStore(db) : (null as any);
  const run = randomUUID().slice(0, 8);
  const userId = `of-user-${run}`;
  const companyIds: string[] = [];
  const q = async (text: string, params: unknown[] = []) => (await pool.query(text, params)).rows;

  async function newCompany(status: schema.VendorRegistrationStatus | null, accountType = "company") {
    const id = `of-co-${run}-${companyIds.length}`;
    companyIds.push(id);
    await db.insert(schema.companies).values({ id, name: id, slug: id, accountType } as any);
    if (status) await db.insert(schema.companyVendorRegistrations).values({ companyId: id, status });
    return id;
  }
  const save = (companyId: string, expectedRevision: number, selection: any, activateVendor = false) =>
    store.save({ companyId, actorId: userId, expectedRevision, selection, activateVendor });
  const codeOf = async (p: Promise<unknown>) => { try { await p; return "OK"; } catch (e) { return e instanceof OfferingError ? e.code : (e as any).code ?? String(e); } };

  beforeAll(async () => {
    await db.insert(schema.users).values({ id: userId, username: userId, email: `${userId}@example.invalid`, password: "x", name: "Offerings test" } as any);
  });
  afterAll(async () => {
    if (!safe) return;
    await q(`DROP TRIGGER IF EXISTS offerings_test_fail ON company_offering_groups`).catch(() => {});
    await q(`DROP FUNCTION IF EXISTS offerings_test_fail()`).catch(() => {});
    await db.delete(schema.memberActivityLog).where(inArray(schema.memberActivityLog.companyId, companyIds)).catch(() => {});
    await db.delete(schema.companies).where(inArray(schema.companies.id, companyIds)).catch(() => {}); // cascades
    await db.delete(schema.users).where(eq(schema.users.id, userId)).catch(() => {});
    await pool.end();
  });

  it("the seeded catalogue matches the bundled one, and re-running the seed changes nothing", async () => {
    const counts = async () => (await q(`SELECT
      (SELECT count(*) FROM offering_sectors WHERE status='active')::int s,
      (SELECT count(*) FROM offering_specializations WHERE status='active')::int f,
      (SELECT count(*) FROM offering_groups WHERE status='active')::int g,
      (SELECT count(*) FROM offering_items WHERE status='active')::int i,
      (SELECT max(updated_at) FROM offering_items) t`))[0];
    const before = await counts();
    expect([before.s, before.f, before.g, before.i]).toEqual([42, 163, 695, 629]);
    await pool.query(readFileSync(path.resolve(__dirname, "../migrations/0021_offering_catalogue_seed.sql"), "utf8"));
    const after = await counts();
    expect(after).toEqual(before); // no row rewritten (updated_at unchanged)
  });

  it("an empty classification cannot complete registration; one offering does, atomically with the status", async () => {
    const co = await newCompany("pending");
    expect(await codeOf(save(co, 0, { groups: [] }))).toBe("OFFERINGS_REQUIRED");
    const r = await save(co, 0, { groups: [...one.groups, { groupId: W, itemIds: [], declared: true }] });
    expect([r.state.status, r.state.revision, r.completedRegistration]).toEqual(["registered", 1, true]);
    expect((await store.read(co)).selection).toEqual({ groups: [{ groupId: G, itemIds: [`${G}-I01`], declared: false }, { groupId: W, itemIds: [], declared: true }] });
    const [act] = await q(`SELECT action, metadata FROM member_activity_log WHERE company_id=$1`, [co]);
    expect(act.action).toBe("company.vendor_registration_completed");
    expect(JSON.stringify(act.metadata)).not.toContain("BID-"); // counts only
  });

  it("a failure late in the transaction rolls everything back: no items, no status change, no revision", async () => {
    const co = await newCompany("pending");
    await q(`CREATE OR REPLACE FUNCTION offerings_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$`);
    await q(`CREATE TRIGGER offerings_test_fail BEFORE INSERT ON company_offering_groups FOR EACH ROW WHEN (NEW.company_id = '${co}') EXECUTE FUNCTION offerings_test_fail()`);
    try {
      // Items are inserted before the declaration that fails.
      expect(await codeOf(save(co, 0, { groups: [...one.groups, { groupId: W, itemIds: [], declared: true }] }))).not.toBe("OK");
    } finally {
      await q(`DROP TRIGGER offerings_test_fail ON company_offering_groups`);
    }
    const st = await store.read(co);
    expect([st.status, st.revision, st.selection.groups]).toEqual(["pending", 0, []]);
    expect(await q(`SELECT 1 FROM member_activity_log WHERE company_id=$1`, [co])).toEqual([]);
    // Retry after the failure succeeds once.
    expect((await save(co, 0, one)).state.status).toBe("registered");
  });

  it("two editors saving from the same revision: exactly one wins, the other gets a conflict", async () => {
    const co = await newCompany("pending");
    await save(co, 0, one);
    const results = await Promise.allSettled([
      save(co, 1, { groups: [{ groupId: G, itemIds: [`${G}-I01`, `${G}-I02`], declared: false }] }),
      save(co, 1, { groups: [{ groupId: H, itemIds: [`${H}-I01`], declared: false }] }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const lost = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect([lost.reason.code, lost.reason.extra]).toEqual(["OFFERINGS_CONFLICT", { currentRevision: 2 }]);
    expect((await store.read(co)).revision).toBe(2);
  });

  it("two editors racing behind a held row lock: both wait, then exactly one wins (no lost update)", async () => {
    const co = await newCompany("pending");
    await save(co, 0, one);
    const holder = await pool.connect();
    let p1: Promise<unknown> | undefined;
    let p2: Promise<unknown> | undefined;
    try {
      await holder.query("BEGIN");
      await holder.query("SELECT 1 FROM company_vendor_registrations WHERE company_id = $1 FOR UPDATE", [co]);
      p1 = save(co, 1, { groups: [{ groupId: G, itemIds: [`${G}-I01`, `${G}-I02`], declared: false }] });
      p2 = save(co, 1, { groups: [{ groupId: H, itemIds: [`${H}-I01`], declared: false }] });
      p1.catch(() => {}); p2.catch(() => {});
      // Both saves are observed blocked by Postgres before the lock is released.
      const deadline = Date.now() + 5000;
      let waiting = 0;
      while (Date.now() < deadline) {
        waiting = Number((await q(`SELECT count(*)::int n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`))[0].n);
        if (waiting >= 2) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(waiting).toBeGreaterThanOrEqual(2);
    } finally {
      await holder.query("COMMIT").catch(() => {});
      holder.release();
    }
    const results = await Promise.allSettled([p1!, p2!]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason.code).toBe("OFFERINGS_CONFLICT");
    expect((await store.read(co)).revision).toBe(2);
  });

  it("OFC-4: a save committing between read()'s statements never yields a mixed state (one snapshot)", async () => {
    const co = await newCompany("pending");
    await save(co, 0, one); // revision 1: G/I01
    // Pause read() right after it has read the registration row; commit a save in that gap.
    let release!: () => void;
    let paused!: () => void;
    const reached = new Promise<void>((r) => { paused = r; });
    const gate = new Promise<void>((r) => { release = r; });
    const pausingStore = createOfferingStore(db, undefined, { afterRegistrationRead: async () => { paused(); await gate; } });
    const reading = pausingStore.read(co);
    try {
      await reached;
      await save(co, 1, { groups: [{ groupId: H, itemIds: [`${H}-I01`], declared: false }] }); // revision 2 commits now
    } finally {
      release();
    }
    const state = await reading;
    // Before the save: revision 1 with G/I01. A mixed read would pair revision 1 with H/I01.
    expect([state.revision, state.selection]).toEqual([1, one]);
    const after = await store.read(co);
    expect([after.revision, after.selection.groups[0].groupId]).toEqual([2, H]);
  });

  it("a retried save that already committed is answered without a second write", async () => {
    const co = await newCompany("pending");
    await save(co, 0, one);
    const again = await save(co, 0, one);
    expect([again.changed, again.state.revision]).toEqual([false, 1]);
  });

  it("a registered vendor cannot drop its last offering; the previous offerings stay", async () => {
    const co = await newCompany("pending");
    await save(co, 0, one);
    expect(await codeOf(save(co, 1, { groups: [] }))).toBe("LAST_OFFERING_REQUIRED");
    expect((await store.read(co)).selection).toEqual(one);
  });

  it("the database refuses an item stored under a different group, and an unknown group", async () => {
    const co = await newCompany("pending");
    const insItem = q(`INSERT INTO company_offering_items (company_id, item_id, group_id, catalogue_version) VALUES ($1, $2, $3, 'registration-1.0-draft')`, [co, `${H}-I01`, G]);
    await expect(insItem).rejects.toMatchObject({ code: "23503" });
    const insGroup = q(`INSERT INTO company_offering_groups (company_id, group_id, catalogue_version) VALUES ($1, 'BID-D99-F01-G01', 'registration-1.0-draft')`, [co]);
    await expect(insGroup).rejects.toMatchObject({ code: "23503" });
  });

  it("legacy: an organization without a row reads as unclassified, keeps everything, and can classify", async () => {
    const co = await newCompany(null);
    expect((await store.read(co)).status).toBe("legacy_unclassified");
    expect(await store.status(co)).toBe("legacy_unclassified");
    expect(await codeOf(save(co, 0, { groups: [] }))).toBe("OFFERINGS_REQUIRED");
    expect((await save(co, 0, one)).state.status).toBe("registered");
  });

  it("requester-only needs explicit activation; teams cannot be requester-only", async () => {
    const co = await newCompany("pending");
    expect((await store.declareRequesterOnly({ companyId: co, actorId: userId, expectedRevision: 0 })).status).toBe("requester_only");
    expect(await codeOf(save(co, 1, one))).toBe("VENDOR_NOT_ACTIVE");
    expect((await save(co, 1, one, true)).state.status).toBe("registered");
    expect(await codeOf(store.declareRequesterOnly({ companyId: co, actorId: userId, expectedRevision: 2 }))).toBe("ALREADY_REGISTERED");
    const team = await newCompany("pending", "team");
    expect(await codeOf(store.declareRequesterOnly({ companyId: team, actorId: userId, expectedRevision: 0 }))).toBe("VENDOR_ONLY_WORKSPACE");
  });

  it("analytics SQL counts distinct organizations and agrees with the reference (one vendor in several groups)", async () => {
    const analytics = createOfferingAnalytics(db);
    const before = Object.fromEntries(await Promise.all((["sector", "group", "item", "offering_type"] as const).map(async (b) => [b, await analytics.organizationsBy(b)])));
    const fixtures = [
      { groups: [{ groupId: G, itemIds: [`${G}-I01`, `${G}-I02`], declared: false }, { groupId: W, itemIds: [], declared: true }, { groupId: H, itemIds: [`${H}-I02`], declared: false }] },
      { groups: [{ groupId: G, itemIds: [`${G}-I01`], declared: false }] },
      { groups: [{ groupId: G, itemIds: [], declared: true }] },
    ];
    const orgs: { companyId: string; selection: any }[] = [];
    for (const selection of fixtures) {
      const co = await newCompany("pending");
      await save(co, 0, selection);
      orgs.push({ companyId: co, selection });
    }
    const idx = offeringCatalogue();
    for (const bucket of ["sector", "group", "item", "offering_type"] as const) {
      const after = new Map((await analytics.organizationsBy(bucket)).map((r) => [r.bucket, r.organizations]));
      const base = new Map(before[bucket].map((r: any) => [r.bucket, r.organizations]));
      for (const { bucket: b, organizations } of referenceOrganizationsBy(orgs, idx, bucket)) {
        expect([bucket, b, (after.get(b) ?? 0) - (base.get(b) ?? 0)]).toEqual([bucket, b, organizations]);
      }
    }
    const statuses = await analytics.classificationStatusCounts();
    expect(statuses.registered).toBeGreaterThanOrEqual(3);
  });

  it("deleting an organization removes its registration and offerings", async () => {
    const co = await newCompany("pending");
    await save(co, 0, one);
    await db.delete(schema.companies).where(eq(schema.companies.id, co));
    expect(await q(`SELECT 1 FROM company_offering_items WHERE company_id=$1 UNION ALL SELECT 1 FROM company_vendor_registrations WHERE company_id=$1`, [co])).toEqual([]);
  });
});
