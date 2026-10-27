// OFC-4: an offerings read is one consistent snapshot. Structural check of the
// statements the store issues; Postgres behaviour itself is proven by the
// deterministic concurrent-read test in tests/offerings.integration.test.ts.

import { describe, it, expect, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("../server/db", () => ({ db: {} }));
import { createOfferingStore } from "../server/lib/offering-store";

const dialect = new PgDialect();

function fakeDb() {
  const log: { kind: string; detail?: unknown }[] = [];
  const outside = () => { throw new Error("read outside the snapshot transaction"); };
  const tx = {
    select: () => ({ from: () => ({ where: async () => { log.push({ kind: "select registration" }); return [{ companyId: "c1", status: "registered", revision: 4, catalogueVersion: "v", registeredAt: null, updatedAt: null }]; } }) }),
    execute: async (q: any) => {
      log.push({ kind: "execute", detail: dialect.sqlToQuery(q).sql });
      return { rows: [
        { item_id: "BID-D01-F01-G01-I02", group_id: "BID-D01-F01-G01" },
        { item_id: "BID-D01-F01-G01-I01", group_id: "BID-D01-F01-G01" },
        { item_id: null, group_id: "BID-D01-F01-G03" },
      ] };
    },
  };
  const db = {
    transaction: async (fn: (t: typeof tx) => Promise<unknown>, config: unknown) => { log.push({ kind: "transaction", detail: config }); return fn(tx); },
    select: outside, execute: outside,
  };
  return { db, log };
}

describe("OFC-4: offerings are read from one snapshot", () => {
  it("read() runs every statement inside one read-only REPEATABLE READ transaction", async () => {
    const { db, log } = fakeDb();
    const state = await createOfferingStore(db as any).read("c1");
    expect(log[0]).toEqual({ kind: "transaction", detail: { isolationLevel: "repeatable read", accessMode: "read only" } });
    expect(log.map((l) => l.kind)).toEqual(["transaction", "select registration", "execute"]);
    expect(state).toMatchObject({ status: "registered", revision: 4 });
    expect(state.selection.groups).toEqual([
      { groupId: "BID-D01-F01-G01", itemIds: ["BID-D01-F01-G01-I01", "BID-D01-F01-G01-I02"], declared: false },
      { groupId: "BID-D01-F01-G03", itemIds: [], declared: true },
    ]);
  });

  it("items and declarations come from a single statement", async () => {
    const { db, log } = fakeDb();
    await createOfferingStore(db as any).read("c1");
    const statements = log.filter((l) => l.kind === "execute");
    expect(statements).toHaveLength(1);
    expect(String(statements[0].detail)).toMatch(/company_offering_items[\s\S]*UNION ALL[\s\S]*company_offering_groups/);
  });
});
