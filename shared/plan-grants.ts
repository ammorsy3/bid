// Administrative plan grants (BID-UX-BUGFIX item 7). Pure rules shared by the
// admin API and the admin page; storage is server/lib/plan-grants.ts.
import { z } from "zod";
import { TIER_RANK, type PlanTier } from "./entitlements";

export const GRANT_PLANS = ["pro", "business"] as const;
export type GrantPlan = (typeof GRANT_PLANS)[number];

/** How long a grant lasts; "open" has no end date. */
export const GRANT_DURATIONS = ["30d", "90d", "365d", "open"] as const;
export type GrantDuration = (typeof GRANT_DURATIONS)[number];

const DAYS: Record<Exclude<GrantDuration, "open">, number> = { "30d": 30, "90d": 90, "365d": 365 };

export function grantEndsAt(duration: GrantDuration, from: Date): Date | null {
  return duration === "open" ? null : new Date(from.getTime() + DAYS[duration] * 86_400_000);
}

const reason = z.string().trim().min(3).max(500);

export const setPlanGrantSchema = z.object({
  plan: z.enum(GRANT_PLANS),
  duration: z.enum(GRANT_DURATIONS),
  reason,
  // The active grant the admin was looking at (null: none). A stale value is a
  // 409, so two admins never overwrite each other's change unknowingly.
  expectedGrantId: z.string().max(100).nullable(),
  // The target is typed in the URL and repeated here, so a request built for one
  // company can never change another.
  confirmCompanyId: z.string().min(1).max(100),
}).strict();

export const revokePlanGrantSchema = z.object({
  reason,
  expectedGrantId: z.string().min(1).max(100),
  confirmCompanyId: z.string().min(1).max(100),
}).strict();

export interface GrantLike {
  plan: string;
  startsAt: Date | string;
  endsAt: Date | string | null;
  revokedAt: Date | string | null;
}

export function isGrantActive(grant: GrantLike | null | undefined, now: Date = new Date()): boolean {
  if (!grant || grant.revokedAt) return false;
  if (new Date(grant.startsAt) > now) return false;
  return grant.endsAt == null || new Date(grant.endsAt) > now;
}

/** The plan a company actually gets: the higher of its paid plan and an active grant. */
export function effectiveTier(subscriptionTier: PlanTier, grant: GrantLike | null | undefined, now: Date = new Date()): PlanTier {
  if (!isGrantActive(grant, now)) return subscriptionTier;
  const granted = grant!.plan as PlanTier;
  return TIER_RANK[granted] > TIER_RANK[subscriptionTier] ? granted : subscriptionTier;
}

export type PlanSource = "free" | "subscription" | "grant";

export function planSource(subscriptionTier: PlanTier, grant: GrantLike | null | undefined, now: Date = new Date()): PlanSource {
  const tier = effectiveTier(subscriptionTier, grant, now);
  if (tier === "free") return "free";
  return tier !== subscriptionTier ? "grant" : "subscription";
}
