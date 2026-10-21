// A-R1 / A-R2 / A-R4 against a REAL Postgres: does the company-row lock in
// server/lib/company-verification-store.ts serialise competing verification
// writes, and do its transactions roll back as a whole? The unit tests prove the
// protocol on a model database; only this file proves it on Postgres.
//
// Opt-in and deliberately hard to aim at anything real:
//   VERIFICATION_TEST_DATABASE_URL=postgres://…@localhost:…/<scratch db> \
//     npx vitest run tests/company-verification-locking.integration.test.ts
// - Never reads DATABASE_URL. Refuses hosts other than localhost / 127.0.0.1 and
//   any URL equal to DATABASE_URL or PROD_DATABASE_URL.
// - The scratch database must already have the app schema (see the execution plan
//   in docs/ai/CURRENT_TASK.md). This file runs no DDL.
// - Faults are injected in THIS process only, by wrapping the database handle the
//   store receives; Postgres itself performs the locking and the rollbacks.
// - Every row it writes is under random ids and is deleted in afterAll.
// - Bounded end to end (tests/helpers/locking-harness.ts): Postgres-side statement,
//   lock and idle-in-transaction timeouts; bounded scenario bodies with gates always
//   released; outstanding work terminated (its own tagged backends only) rather than
//   merely timed out; bounded cleanup that always attempts to close the pool.
// Not run by `npm run test:unit` (*.integration.test.ts is excluded).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray, sql } from "drizzle-orm";
import * as schema from "../shared/schema";
import { createVerificationStore, VerificationError } from "../server/lib/company-verification-store";
import { cleanup, gate, paused, waitForSignal } from "./helpers/locking-harness";

// Bounds. Worst case per coordinated test: body 12 s + settle 4 s + cancel 4 s
// + settle 4 s = 24 s, under vitest's 30 s test timeout. Postgres-side limits
// (below) end any abandoned work on their own.
const BODY_MS = 12_000;
const SIGNAL_MS = 5_000; // waiting for "lock acquired" and for observed lock waiters
const SETTLE_MS = 4_000;
const STEP_MS = 5_000; // each cleanup step, the cancel and the pool close
const PG_TIMEOUTS = {
  connectionTimeoutMillis: 5_000, // client: connecting
  statement_timeout: 10_000, // server: any one statement
  lock_timeout: 8_000, // server: waiting for a lock (> SIGNAL_MS, so observed waiters are not cut short)
  idle_in_transaction_session_timeout: 15_000, // server: a paused or abandoned transaction is ended and its lock released
  query_timeout: 12_000, // client: give up on a reply
};

const url = process.env.VERIFICATION_TEST_DATABASE_URL;
const safe = (() => {
  if (!url) return false;
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return false;
  return url !== process.env.DATABASE_URL && url !== process.env.PROD_DATABASE_URL;
})();

// ── fault injection and pausing, scoped to the handle given to the store ─────
type Hooks = {
  /** Runs before an INSERT into `table` executes inside a transaction; throw to fail it. */
  beforeInsert?: (table: unknown) => void | Promise<void>;
  /** Runs before the Nth SELECT of a transaction executes (1 = the row lock itself). */
  beforeSelect?: (n: number) => void | Promise<void>;
};

/** Wraps a Drizzle query chain so `before` runs (and may block or throw) right before it executes. */
function deferChain(q: any, before: () => void | Promise<void>): any {
  return new Proxy(q, {
    get(target, prop) {
      if (prop === "then") {
        return (res: any, rej: any) => Promise.resolve().then(before).then(() => target).then(res, rej);
      }
      const v = target[prop];
      return typeof v === "function" ? (...args: any[]) => deferChain(v.apply(target, args), before) : v;
    },
  });
}

function instrumented(db: any, hooks: Hooks): any {
  return new Proxy(db, {
    get(target, prop) {
      if (prop !== "transaction") return target[prop];
      return (fn: (tx: any) => Promise<unknown>) => target.transaction((tx: any) => {
        let selects = 0;
        const txp = new Proxy(tx, {
          get(t, p) {
            if (p === "insert") return (table: unknown) => deferChain(t.insert(table), () => hooks.beforeInsert?.(table));
            if (p === "select") return (...a: any[]) => { const n = ++selects; return deferChain(t.select(...a), () => hooks.beforeSelect?.(n)); };
            return t[p];
          },
        });
        return fn(txp);
      });
    },
  });
}

describe.skipIf(!safe)("verification store on real Postgres", () => {
  const run = Math.random().toString(36).slice(2, 10);
  // Every connection this test opens is tagged, so cancel() can terminate exactly
  // these backends and nothing else on the server.
  const appName = `bid-verify-test-${run}`;
  const pool = new pg.Pool({ connectionString: url, max: 10, application_name: appName, ...PG_TIMEOUTS });
  // A backend terminated by cancel() makes its idle client emit 'error'; without a
  // listener that would crash the run instead of being reported.
  const poolErrors: string[] = [];
  pool.on("error", (e) => { poolErrors.push(e.message); });
  const db = drizzle({ client: pool, schema });
  const store = createVerificationStore(db as any);

  /**
   * Cancels this test's outstanding database work for real: terminates its own
   * tagged backends from a separate, short-lived connection (the pool may be
   * exhausted or blocked). A Promise timeout alone would leave the query running.
   */
  const cancel = async () => {
    const admin = new pg.Client({ connectionString: url, application_name: `${appName}-cancel`, connectionTimeoutMillis: 5_000, statement_timeout: 5_000 });
    await admin.connect();
    try {
      await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where application_name = $1 and pid <> pg_backend_pid()", [appName]);
    } finally {
      await admin.end().catch(() => {});
    }
  };
  const scenario = (gates: ReturnType<typeof gate>[], body: Parameters<typeof paused>[1]) =>
    paused({ gates, bodyMs: BODY_MS, settleMs: SETTLE_MS, cancel }, body);
  const userId = `vt-user-${run}`;
  const companyIds: string[] = [];
  let seq = 0;

  /** Backends of this database currently waiting on a lock — observed, not assumed. */
  const lockWaiters = async () => {
    const r = await pool.query(
      "select count(*)::int as n from pg_stat_activity where datname = current_database() and application_name = $1 and wait_event_type = 'Lock'",
      [appName],
    );
    return r.rows[0].n as number;
  };
  const waitForLockWaiters = async (n: number) => {
    const deadline = Date.now() + SIGNAL_MS;
    while ((await lockWaiters()) < n) {
      if (Date.now() > deadline) throw new Error(`expected ${n} backend(s) waiting on a lock`);
      await new Promise((r) => setTimeout(r, 20));
    }
  };

  async function newCompany(withCrDoc = true) {
    const id = `vt-co-${run}-${++seq}`;
    companyIds.push(id);
    await db.insert(schema.companies).values({
      id, name: `VT ${seq}`, slug: `vt-${run}-${seq}`, accountType: "company", verificationStatus: "not_verified",
      legalName: "VT Trading", crNumber: `9${run.replace(/\D/g, "").padEnd(5, "0").slice(0, 5)}${String(seq).padStart(4, "0")}`.slice(0, 10), city: "Riyadh",
    } as any);
    if (withCrDoc) {
      await db.insert(schema.companyDocuments).values({ companyId: id, documentType: "cr_certificate", fileUrl: `/objects/uploads/${id}-old`, originalName: "old.pdf", uploadedBy: userId });
    }
    return id;
  }
  const docsOf = (id: string) => db.select().from(schema.companyDocuments).where(eq(schema.companyDocuments.companyId, id));
  const companyRow = async (id: string) => (await db.select().from(schema.companies).where(eq(schema.companies.id, id)))[0];
  const auditOf = (id: string, action: string) =>
    db.select().from(schema.memberActivityLog).where(sql`${schema.memberActivityLog.companyId} = ${id} and ${schema.memberActivityLog.action} = ${action}`);
  const notificationsOf = (id: string) => db.select().from(schema.adminNotifications).where(eq(schema.adminNotifications.relatedId, id));
  const attachWith = (s: ReturnType<typeof createVerificationStore>, id: string, n: string) =>
    s.attachDocument({ companyId: id, userId, documentType: "cr_certificate", fileUrl: `/objects/uploads/${id}-${n}`, originalName: `${n}.pdf`, label: null });

  beforeAll(async () => {
    await db.insert(schema.users).values({ id: userId, username: `vt_${run}`, email: `vt-${run}@example.invalid`, password: "x", name: "VT" } as any);
  });

  // Coordinated tests settle or cancel their own operations (see paused()). Here
  // every delete is bounded and attempted even if an earlier one fails or overruns;
  // this test's backends are terminated, then the pool close is always attempted.
  // A failure here is reported separately by vitest; it never replaces a test's own failure.
  afterAll(async () => {
    if (poolErrors.length) console.warn("[locking test] pool connection errors (expected after a cancel):", poolErrors);
    const ids = companyIds.length ? companyIds : ["-none-"];
    await cleanup([
      ["admin_notifications", () => db.delete(schema.adminNotifications).where(inArray(schema.adminNotifications.relatedId, ids))],
      ["member_activity_log", () => db.delete(schema.memberActivityLog).where(inArray(schema.memberActivityLog.companyId, ids))],
      ["company_documents", () => db.delete(schema.companyDocuments).where(inArray(schema.companyDocuments.companyId, ids))],
      ["companies", () => db.delete(schema.companies).where(inArray(schema.companies.id, ids))],
      ["users", () => db.delete(schema.users).where(eq(schema.users.id, userId))],
    ], { stepMs: STEP_MS, cancel, close: () => pool.end() });
  });

  it("ten concurrent replacements leave exactly one current document", async () => {
    const id = await newCompany();
    const settled = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => attachWith(store, id, `r${i}`)));
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(10);
    const docs = await docsOf(id);
    expect(docs).toHaveLength(1);
    expect(docs[0].fileUrl).toMatch(new RegExp(`${id}-r\\d$`));
  });

  it("a replacement whose audit insert fails rolls back and keeps the previous document", async () => {
    const id = await newCompany();
    const failing = createVerificationStore(instrumented(db, {
      beforeInsert: (t) => { if (t === schema.memberActivityLog) throw new Error("injected audit failure"); },
    }));
    await expect(attachWith(failing, id, "new")).rejects.toThrow("injected audit failure");
    const docs = await docsOf(id);
    expect(docs.map((d) => d.fileUrl)).toEqual([`/objects/uploads/${id}-old`]);
  });

  it("concurrent submissions create one submission audit record and one admin notification", async () => {
    const id = await newCompany();
    const results = await Promise.all(Array.from({ length: 5 }, () => store.submit(id, userId)));
    expect(results.filter((r) => !r.alreadySubmitted)).toHaveLength(1);
    expect(results.every((r) => r.verificationStatus === "under_review")).toBe(true);
    expect(await auditOf(id, "company.verification_submitted")).toHaveLength(1);
    expect(await notificationsOf(id)).toHaveLength(1);
  });

  it("once submit holds the lock, a save and an upload wait for it and are then refused", async () => {
    const id = await newCompany();
    const held = gate();
    const locked = gate();
    const pausing = createVerificationStore(instrumented(db, {
      // Submit's 1st SELECT is the row lock; pause just before its 2nd, i.e. while holding the lock.
      beforeSelect: async (n) => { if (n === 2) { locked.release(); await held.promise; } },
    }));
    let submitting!: ReturnType<typeof pausing.submit>;
    let upload!: Promise<unknown>;
    let save!: Promise<unknown>;
    // Whatever fails inside, `held` is released and all three operations settle
    // before the test ends — the paused transaction can't keep its lock.
    await scenario([held, locked], async (track) => {
      submitting = track(pausing.submit(id, userId));
      await waitForSignal(locked.promise, submitting, SIGNAL_MS, "submit acquiring the company lock");
      upload = track(attachWith(store, id, "late").then(() => "ok", (e) => e));
      save = track(store.saveDetails(id, userId, { crNumber: "1999999999" }).then(() => "ok", (e) => e));
      await waitForLockWaiters(2); // both are really blocked on the company row in Postgres
      held.release();
      await Promise.all([submitting, upload, save]);
    });
    expect((await submitting).alreadySubmitted).toBe(false);
    const [u, s] = await Promise.all([upload, save]);
    expect(u).toBeInstanceOf(VerificationError);
    expect((u as VerificationError).code).toBe("VERIFICATION_LOCKED");
    expect(s).toBeInstanceOf(VerificationError);
    expect((s as VerificationError).code).toBe("VERIFICATION_LOCKED");
    expect((await docsOf(id)).map((d) => d.fileUrl)).toEqual([`/objects/uploads/${id}-old`]);
    expect((await companyRow(id)).crNumber).not.toBe("1999999999");
  });

  it("submit validates and records the same state it submits (a save holding the lock lands first)", async () => {
    const id = await newCompany();
    const held = gate();
    const locked = gate();
    const pausing = createVerificationStore(instrumented(db, {
      // saveDetails: lock → CR uniqueness SELECT → UPDATE → audit INSERT. Pause before the audit insert.
      beforeInsert: async (t) => { if (t === schema.memberActivityLog) { locked.release(); await held.promise; } },
    }));
    let submitting!: ReturnType<typeof store.submit>;
    await scenario([held, locked], async (track) => {
      const saving = track(pausing.saveDetails(id, userId, { crNumber: "1888888888" }));
      await waitForSignal(locked.promise, saving, SIGNAL_MS, "save acquiring the company lock");
      submitting = track(store.submit(id, userId));
      await waitForLockWaiters(1);
      held.release();
      await Promise.all([saving, submitting]);
    });
    const result = await submitting;
    expect(result.alreadySubmitted).toBe(false);
    const [audit] = await auditOf(id, "company.verification_submitted");
    expect((audit.metadata as any).details.crNumber).toBe("1888888888");
  });

  it("an audit insertion failure rolls back the submission", async () => {
    const id = await newCompany();
    const failing = createVerificationStore(instrumented(db, {
      beforeInsert: (t) => { if (t === schema.memberActivityLog) throw new Error("injected audit failure"); },
    }));
    await expect(failing.submit(id, userId)).rejects.toThrow("injected audit failure");
    expect((await companyRow(id)).verificationStatus).toBe("not_verified");
    expect(await auditOf(id, "company.verification_submitted")).toHaveLength(0);
    expect(await notificationsOf(id)).toHaveLength(0);
  });

  it("a notification insertion failure rolls back both status and audit; a retry then submits exactly once", async () => {
    const id = await newCompany();
    const failing = createVerificationStore(instrumented(db, {
      beforeInsert: (t) => { if (t === schema.adminNotifications) throw new Error("injected notification failure"); },
    }));
    await expect(failing.submit(id, userId)).rejects.toThrow("injected notification failure");
    expect((await companyRow(id)).verificationStatus).toBe("not_verified");
    expect(await auditOf(id, "company.verification_submitted")).toHaveLength(0);
    expect(await notificationsOf(id)).toHaveLength(0);

    const retry = await store.submit(id, userId);
    expect(retry.alreadySubmitted).toBe(false);
    const again = await store.submit(id, userId);
    expect(again.alreadySubmitted).toBe(true);
    expect((await companyRow(id)).verificationStatus).toBe("under_review");
    expect(await auditOf(id, "company.verification_submitted")).toHaveLength(1);
    expect(await notificationsOf(id)).toHaveLength(1);
  });
});
