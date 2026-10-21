// A small in-memory stand-in for the Drizzle database, just big enough to run
// server/lib/company-verification-store.ts unchanged. It models the two things
// the store relies on:
//
//   - row locks: `.for("update")` on a company takes a per-company lock held
//     until the transaction ends, so a second transaction waits there;
//   - rollback: a transaction that throws restores every row it touched.
//
// Each statement yields to the event loop first, so concurrent requests really
// interleave. Writes are visible immediately (no MVCC), which is stricter than
// Postgres: without the lock, races show up here at least as badly.
//
// The test file swaps drizzle-orm's eq/ne/and/inArray/desc for plain Cond
// objects this fake evaluates.
//
// This proves the store's locking protocol, not Postgres itself — see the
// opt-in tests/company-verification-locking.integration.test.ts for that.

import { getTableColumns, type Column } from "drizzle-orm";
import { adminNotifications, companies, companyDocuments, memberActivityLog } from "../../shared/schema";

export type Cond =
  | { op: "eq" | "ne"; col: Column; val: unknown }
  | { op: "and"; parts: Cond[] }
  | { op: "inArray"; col: Column; vals: unknown[] };

type Row = Record<string, any>;
const TABLES = [companies, companyDocuments, memberActivityLog, adminNotifications] as const;

export function createFakeDb() {
  const rows = new Map<unknown, Row[]>(TABLES.map((t) => [t, []]));
  const keyOf = new Map<Column, string>();
  for (const t of TABLES) for (const [k, c] of Object.entries(getTableColumns(t))) keyOf.set(c as Column, k);

  const state = {
    lockingEnabled: true,
    /** Throw when inserting into this table (to test rollback). */
    failInsertInto: null as unknown,
    statements: 0,
  };
  const locks = new Map<string, Promise<void>>();
  let idSeq = 0;

  const tick = () => new Promise<void>((r) => setTimeout(r, 0));
  const match = (row: Row, c?: Cond): boolean => {
    if (!c) return true;
    if (c.op === "and") return c.parts.every((p) => match(row, p));
    const v = row[keyOf.get(c.col)!];
    if (c.op === "eq") return v === c.val;
    if (c.op === "ne") return v !== c.val;
    return c.vals.includes(v);
  };
  const table = (t: unknown) => rows.get(t)!;
  const companyIdIn = (c?: Cond): string | undefined => {
    if (!c) return undefined;
    if (c.op === "and") return c.parts.map(companyIdIn).find(Boolean);
    return c.op === "eq" && c.col === companies.id ? (c.val as string) : undefined;
  };

  function builder(tx: TxState | null) {
    const run = async <T>(fn: () => T): Promise<T> => { await tick(); state.statements++; return fn(); };
    return {
      select(projection?: Record<string, Column>) {
        let t: unknown; let cond: Cond | undefined; let lim = Infinity; let lockWanted = false;
        const exec = async () => {
          if (lockWanted && tx) await tx.lock(companyIdIn(cond)!);
          return run(() => table(t).filter((r) => match(r, cond)).slice(0, lim).map((r) =>
            projection ? Object.fromEntries(Object.entries(projection).map(([k, c]) => [k, r[keyOf.get(c)!]])) : { ...r }));
        };
        const q: any = {
          from(x: unknown) { t = x; return q; },
          where(c: Cond) { cond = c; return q; },
          orderBy() { return q; },
          limit(n: number) { lim = n; return q; },
          for(_s: string) { lockWanted = true; return q; },
          then(res: any, rej: any) { return exec().then(res, rej); },
        };
        return q;
      },
      insert(t: unknown) {
        return { values(v: Row) {
          const exec = () => run(() => {
            if (state.failInsertInto === t) throw new Error("simulated insert failure");
            const row = { id: `id${++idSeq}`, createdAt: new Date(), uploadedAt: new Date(Date.now() + idSeq), ...v };
            tx?.touch(t, row.companyId ?? row.relatedId ?? row.id);
            table(t).push(row);
            return [{ ...row }];
          });
          const q: any = { returning: () => exec(), then: (res: any, rej: any) => exec().then(res, rej) };
          return q;
        } };
      },
      delete(t: unknown) {
        return { where(c: Cond) {
          return run(() => {
            const keep = table(t).filter((r) => !match(r, c));
            for (const r of table(t)) if (match(r, c)) tx?.touch(t, r.companyId);
            rows.set(t, keep);
          });
        } };
      },
      update(t: unknown) {
        return { set(u: Row) { return { where(c: Cond) {
          const exec = () => run(() => {
            const hit = table(t).filter((r) => match(r, c));
            for (const r of hit) { tx?.touch(t, r.id); Object.assign(r, u); }
            return hit.map((r) => ({ ...r }));
          });
          const q: any = { returning: () => exec(), then: (res: any, rej: any) => exec().then(res, rej) };
          return q;
        } }; } };
      },
    };
  }

  interface TxState { lock(companyId: string): Promise<void>; touch(t: unknown, companyId: string): void }

  const db: any = {
    ...builder(null),
    async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
      const held: Array<() => void> = [];
      const snapshot = new Map<unknown, Row[]>();
      const txState: TxState = {
        async lock(companyId) {
          if (!state.lockingEnabled) return;
          while (locks.has(companyId)) await locks.get(companyId);
          let release!: () => void;
          locks.set(companyId, new Promise<void>((r) => { release = () => { locks.delete(companyId); r(); }; }));
          held.push(release);
        },
        touch(t) { if (!snapshot.has(t)) snapshot.set(t, table(t).map((r) => ({ ...r }))); },
      };
      try {
        return await fn(builder(txState));
      } catch (e) {
        for (const [t, saved] of snapshot) rows.set(t, saved);
        throw e;
      } finally {
        held.forEach((r) => r());
      }
    },
  };

  return { db, rows: { companies: () => table(companies), documents: () => table(companyDocuments), activity: () => table(memberActivityLog), notifications: () => table(adminNotifications) }, state };
}
