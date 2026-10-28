// Free trials (migration 0022): a promo code gives a company workspace a paid
// plan for a while, with no card and nothing created at StreamPay. Entitlements
// count an active trial like an admin grant (server/lib/entitlements.ts). Near
// the end Bid asks for payment: a banner in the app, and the two emails sent
// from the daily billing cron (runTrialEmails). Starting one is in billing.ts
// (startTrial), next to the promo codes.

import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { companies, companyTrials, users, type CompanyTrial, type User } from "@shared/schema";
import { db } from "../db";
import { storage } from "../storage";
import { getCompanySubscription, isLiveSubscription } from "./billing";

const DAY_MS = 24 * 60 * 60 * 1000;
/** The "your trial ends soon" email goes out this many days before the end. */
export const TRIAL_REMINDER_DAYS = 5;
/** Never send "your trial ended" for a trial that ended longer ago than this. */
const ENDED_EMAIL_MAX_AGE_MS = 7 * DAY_MS;

export function isTrialActive(t: Pick<CompanyTrial, "startsAt" | "endsAt"> | null | undefined, now: Date = new Date()): boolean {
  return !!t && new Date(t.startsAt) <= now && new Date(t.endsAt) > now;
}

/** Whole days left, rounded up: 1 on the last day, 0 once it has ended. */
export function trialDaysLeft(t: Pick<CompanyTrial, "endsAt">, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(t.endsAt).getTime() - now.getTime()) / DAY_MS));
}

/** The company's trial, active or over (one per company, ever). */
export async function getCompanyTrial(companyId: string): Promise<CompanyTrial | null> {
  const [row] = await db.select().from(companyTrials).where(eq(companyTrials.companyId, companyId)).limit(1);
  return row ?? null;
}

export interface TrialEmail {
  kind: "ending" | "ended";
  trial: CompanyTrial;
  user: Pick<User, "id" | "email" | "name" | "language">;
  companyName: string;
}

/**
 * The two trial emails, at most once each: "ends in a few days" and "has ended".
 * Each row is claimed with a conditional UPDATE before sending, so overlapping
 * runs never both send. Nothing is sent once the company pays, when the person
 * who started the trial has left it, or when they turned billing emails off.
 */
export async function runTrialEmails(
  send: (e: TrialEmail) => Promise<boolean>,
  now = new Date(),
): Promise<{ considered: number; sent: number; skipped: number }> {
  const ending = await db
    .select({ trial: companyTrials, user: users, companyName: companies.name })
    .from(companyTrials)
    .innerJoin(users, eq(users.id, companyTrials.startedBy))
    .innerJoin(companies, eq(companies.id, companyTrials.companyId))
    .where(and(
      isNull(companyTrials.reminderSentAt),
      gt(companyTrials.endsAt, now),
      lte(companyTrials.endsAt, new Date(now.getTime() + TRIAL_REMINDER_DAYS * DAY_MS)),
      isNull(companies.deletedAt),
    ))
    .limit(50);
  const ended = await db
    .select({ trial: companyTrials, user: users, companyName: companies.name })
    .from(companyTrials)
    .innerJoin(users, eq(users.id, companyTrials.startedBy))
    .innerJoin(companies, eq(companies.id, companyTrials.companyId))
    .where(and(
      isNull(companyTrials.endedSentAt),
      lte(companyTrials.endsAt, now),
      gt(companyTrials.endsAt, new Date(now.getTime() - ENDED_EMAIL_MAX_AGE_MS)),
      isNull(companies.deletedAt),
    ))
    .limit(50);

  let sent = 0;
  let skipped = 0;
  const rows = [
    ...ending.map((r) => ({ ...r, kind: "ending" as const })),
    ...ended.map((r) => ({ ...r, kind: "ended" as const })),
  ];
  for (const { kind, trial, user, companyName } of rows) {
    const column = kind === "ending" ? companyTrials.reminderSentAt : companyTrials.endedSentAt;
    // Claim first. An ended trial also counts as reminded, so a trial that ended
    // before the cron caught its reminder window gets one email, not two.
    const claimed = await db
      .update(companyTrials)
      .set(kind === "ending" ? { reminderSentAt: now } : { endedSentAt: now, reminderSentAt: trial.reminderSentAt ?? now })
      .where(and(eq(companyTrials.id, trial.id), isNull(column)))
      .returning({ id: companyTrials.id });
    if (claimed.length === 0) { skipped++; continue; }

    const [sub, role] = await Promise.all([
      getCompanySubscription(trial.companyId),
      storage.getUserRoleInCompany(user.id, trial.companyId),
    ]);
    const allowed = role
      ? await storage.filterRecipientsByPreference([{ userId: user.id }], trial.companyId, "billing", "email")
      : [];
    if (isLiveSubscription(sub) || allowed.length === 0) { skipped++; continue; }

    if (await send({ kind, trial, user, companyName })) sent++;
    else {
      console.error(`[Billing] trial ${kind} email to ${user.id} for company ${trial.companyId} was not sent`);
      skipped++;
    }
  }
  return { considered: rows.length, sent, skipped };
}
