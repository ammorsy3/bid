// D-PLANS against a REAL Postgres: the plan-grant change is one transaction
// under the company row lock — audit and grant are written together or not at
// all, and two admins acting on the same view produce exactly one change.
//
// Opt-in, like tests/company-verification-locking.integration.test.ts:
//   PLAN_GRANTS_TEST_DATABASE_URL=postgres://…@127.0.0.1:…/<scratch db> \
//     npx vitest run tests/plan-grants.integration.test.ts
// - Never reads DATABASE_URL. Refuses hosts other than localhost / 127.0.0.1 and
//   any URL equal to DATABASE_URL or PROD_DATABASE_URL.
// - The scratch database must already have the schema including
//   migrations/0019_company_plan_grants.sql. This file runs no DDL.
// - Rows use random ids and are deleted in afterAll.
// Not run by `npm run test:unit` (*.integration.test.ts is excluded).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../shared/schema";
import { createPlanGrantStore, PlanGrantError } from "../server/lib/plan-grants";

const url = process.env.PLAN_GRANTS_TEST_DATABASE_URL;
const safe = (() => {
  if (!url) return false;
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return false;
  return url !== process.env.DATABASE_URL && url !== process.env.PROD_DATABASE_URL;
})();

describe.skipIf(!safe)("plan grants on Postgres", () => {
  const pool = safe ? new pg.Pool({ connectionString: url, max: 6, statement_timeout: 10_000, lock_timeout: 8_000 } as any) : (null as any);
  const db = safe ? drizzle(pool, { schema }) : (null as any);
  const store = safe ? createPlanGrantStore(db) : (null as any);
  const adminId = `pg-admin-${randomUUID()}`;
  const companyId = `pg-co-${randomUUID()}`;

  beforeAll(async () => {
    await db.insert(schema.users).values({ id: adminId, username: adminId, email: `${adminId}@example.invalid`, password: "x", name: "PG admin", isAdmin: true } as any);
    await db.insert(schema.companies).values({ id: companyId, name: "PG grant co", slug: companyId, accountType: "company" } as any);
  });
  afterAll(async () => {
    await db.delete(schema.auditLog).where(eq(schema.auditLog.targetId, companyId)).catch(() => {});
    await db.delete(schema.companyPlanGrants).where(eq(schema.companyPlanGrants.companyId, companyId)).catch(() => {});
    await db.delete(schema.companies).where(inArray(schema.companies.id, [companyId])).catch(() => {});
    await db.delete(schema.users).where(eq(schema.users.id, adminId)).catch(() => {});
    await pool.end();
  });

  it("grant, change and revoke keep one active grant and audit each step", async () => {
    const g1 = await store.set({ companyId, actorId: adminId, plan: "pro", duration: "30d", reason: "Pilot", expectedGrantId: null });
    const g2 = await store.set({ companyId, actorId: adminId, plan: "business", duration: "open", reason: "Partner", expectedGrantId: g1.id });
    expect((await store.active(companyId))?.id).toBe(g2.id);
    await store.revoke({ companyId, actorId: adminId, reason: "Ended", expectedGrantId: g2.id });
    expect(await store.active(companyId)).toBeNull();
    const audits = await db.select().from(schema.auditLog).where(eq(schema.auditLog.targetId, companyId));
    expect(audits.map((a: any) => a.action).sort()).toEqual(["plan_grant_changed", "plan_grant_created", "plan_grant_revoked"]);
  });

  it("two admins acting on the same view: exactly one change, the other gets 409", async () => {
    const results = await Promise.allSettled([1, 2].map((i) =>
      store.set({ companyId, actorId: adminId, plan: "pro", duration: "90d", reason: `Race ${i}`, expectedGrantId: null })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(PlanGrantError);
    expect(rejected.reason.status).toBe(409);
    const active = await db.select().from(schema.companyPlanGrants).where(eq(schema.companyPlanGrants.companyId, companyId));
    expect(active.filter((g: any) => !g.revokedAt)).toHaveLength(1);
  });
});
