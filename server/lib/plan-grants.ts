// Administrative plan grants: storage and the audited change (item 7).
//
// A change runs in one transaction that locks the company row first, checks the
// grant the admin saw is still the active one, revokes it, inserts the new grant
// and writes audit_log with the previous and new values — all or nothing. A
// grant never touches company_subscriptions, checkouts or invoices.

import { and, desc, eq, isNull } from "drizzle-orm";
import { auditLog, companies, companyPlanGrants, type CompanyPlanGrant } from "@shared/schema";
import { grantEndsAt, isGrantActive, type GrantDuration, type GrantPlan } from "@shared/plan-grants";
import { db as defaultDb } from "../db";

type Database = typeof defaultDb;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class PlanGrantError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "PlanGrantError";
  }
}

export interface SetGrantInput {
  companyId: string;
  actorId: string;
  plan: GrantPlan;
  duration: GrantDuration;
  reason: string;
  expectedGrantId: string | null;
  now?: Date;
}

export interface RevokeGrantInput {
  companyId: string;
  actorId: string;
  reason: string;
  expectedGrantId: string;
  now?: Date;
}

const snapshot = (g: CompanyPlanGrant | null) =>
  g ? JSON.stringify({ grantId: g.id, plan: g.plan, startsAt: g.startsAt, endsAt: g.endsAt, reason: g.reason }) : JSON.stringify({ grant: null });

async function lockCompanyWorkspace(tx: Tx, companyId: string) {
  const [row] = await tx.select().from(companies).where(eq(companies.id, companyId)).for("update");
  if (!row || row.deletedAt) throw new PlanGrantError(404, "NOT_FOUND", "Company not found");
  // Plans gate company workspaces only (server/lib/entitlements.ts).
  if (row.accountType !== "company") throw new PlanGrantError(400, "NOT_A_COMPANY_WORKSPACE", "Plans apply to company workspaces only.");
  return row;
}

async function currentGrant(tx: Tx | Database, companyId: string): Promise<CompanyPlanGrant | null> {
  const [row] = await tx.select().from(companyPlanGrants)
    .where(and(eq(companyPlanGrants.companyId, companyId), isNull(companyPlanGrants.revokedAt)))
    .limit(1);
  return row ?? null;
}

export function createPlanGrantStore(database: Database) {
  return {
    /** The not-revoked grant, even if expired or not yet started (the admin page shows it). */
    current: (companyId: string) => currentGrant(database, companyId),

    /** The grant that counts for entitlements right now, or null. */
    async active(companyId: string, now: Date = new Date()): Promise<CompanyPlanGrant | null> {
      const g = await currentGrant(database, companyId);
      return isGrantActive(g, now) ? g : null;
    },

    history: (companyId: string) =>
      database.select().from(companyPlanGrants).where(eq(companyPlanGrants.companyId, companyId)).orderBy(desc(companyPlanGrants.createdAt)).limit(20),

    async set(input: SetGrantInput): Promise<CompanyPlanGrant> {
      const now = input.now ?? new Date();
      return database.transaction(async (tx) => {
        await lockCompanyWorkspace(tx, input.companyId);
        const before = await currentGrant(tx, input.companyId);
        if ((before?.id ?? null) !== input.expectedGrantId) {
          throw new PlanGrantError(409, "GRANT_CHANGED", "This company's plan was changed by someone else. Reload and try again.");
        }
        if (before) {
          await tx.update(companyPlanGrants)
            .set({ revokedAt: now, revokedBy: input.actorId, revokeReason: `Replaced: ${input.reason}` })
            .where(eq(companyPlanGrants.id, before.id));
        }
        const [grant] = await tx.insert(companyPlanGrants).values({
          companyId: input.companyId,
          plan: input.plan,
          reason: input.reason,
          startsAt: now,
          endsAt: grantEndsAt(input.duration, now),
          grantedBy: input.actorId,
          createdAt: now,
        }).returning();
        await tx.insert(auditLog).values({
          adminId: input.actorId,
          action: before ? "plan_grant_changed" : "plan_grant_created",
          targetType: "company",
          targetId: input.companyId,
          beforeState: snapshot(before),
          afterState: snapshot(grant),
          notes: input.reason,
        });
        return grant;
      });
    },

    async revoke(input: RevokeGrantInput): Promise<void> {
      const now = input.now ?? new Date();
      await database.transaction(async (tx) => {
        await lockCompanyWorkspace(tx, input.companyId);
        const before = await currentGrant(tx, input.companyId);
        if (!before || before.id !== input.expectedGrantId) {
          throw new PlanGrantError(409, "GRANT_CHANGED", "This company's plan was changed by someone else. Reload and try again.");
        }
        await tx.update(companyPlanGrants)
          .set({ revokedAt: now, revokedBy: input.actorId, revokeReason: input.reason })
          .where(eq(companyPlanGrants.id, before.id));
        await tx.insert(auditLog).values({
          adminId: input.actorId,
          action: "plan_grant_revoked",
          targetType: "company",
          targetId: input.companyId,
          beforeState: snapshot(before),
          afterState: JSON.stringify({ grant: null }),
          notes: input.reason,
        });
      });
    },
  };
}

export type PlanGrantStore = ReturnType<typeof createPlanGrantStore>;
export const planGrants: PlanGrantStore = createPlanGrantStore(defaultDb);
