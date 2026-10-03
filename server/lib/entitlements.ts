// Plan gates. The server is the only source of truth: the UI mirrors these
// rules to avoid dead ends, but every limit is enforced here, so a hand-made
// request gets the same 403 PLAN_REQUIRED as a click.
//
// Rules live in shared/entitlements.ts. This file answers "what does THIS
// company get right now?" and turns a failed check into the 403 the client's
// upgrade dialog listens for.

import type { NextFunction, Response, RequestHandler } from "express";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import { teamInvitations, tenders, userCompanies } from "@shared/schema";
import {
  FEATURES,
  FREE_SEAT_LIMIT,
  FREE_TENDER_LIMIT,
  planAllows,
  requiredPlanFor,
  type EntitlementsSummary,
  type Feature,
  type PlanRequiredBody,
  type PlanTier,
} from "@shared/entitlements";
import { storage } from "../storage";
import { getCompanySubscription, isLiveSubscription } from "./billing";
import type { AuthRequest } from "../middleware/auth-types";

export class PlanRequiredError extends Error {
  readonly code = "PLAN_REQUIRED" as const;
  constructor(
    public feature: Feature | "tenders",
    message?: string,
  ) {
    super(message ?? defaultMessage(feature));
    this.name = "PlanRequiredError";
  }
  get requiredPlan() {
    return this.feature === "tenders" ? ("pro" as const) : requiredPlanFor(this.feature);
  }
  toBody(): PlanRequiredBody {
    return { code: this.code, feature: this.feature, requiredPlan: this.requiredPlan, message: this.message };
  }
}

function defaultMessage(feature: Feature | "tenders"): string {
  switch (feature) {
    case "tenders":
      return `The free plan includes ${FREE_TENDER_LIMIT} tenders. Upgrade to create more.`;
    case "seats":
      return "The free plan is for one person. Upgrade to add your team.";
    default:
      return `This is part of the ${requiredPlanFor(feature) === "business" ? "Business" : "Pro"} plan. Upgrade to use it.`;
  }
}

/** Answers the request itself if `err` is a plan failure. Returns true when it did. */
export function sendPlanRequired(res: Response, err: unknown): boolean {
  if (!(err instanceof PlanRequiredError)) return false;
  res.status(403).json(err.toBody());
  return true;
}

interface CompanyPlanFacts {
  tier: PlanTier;
  gated: boolean;
  grandfathered: Set<string>;
}

async function loadPlanFacts(companyId: string): Promise<CompanyPlanFacts> {
  const company = await storage.getCompany(companyId);
  // Unknown company: fail closed (free and gated), never open.
  if (!company) return { tier: "free", gated: true, grandfathered: new Set() };

  // Only company workspaces are gated. Teams and individuals are vendors.
  const gated = company.accountType === "company";
  const sub = await getCompanySubscription(companyId);
  // A cancelled plan stays live until its paid period ends (status stays
  // 'active' with cancelAtPeriodEnd), so "live" is exactly "still paid for".
  const tier: PlanTier = isLiveSubscription(sub) && sub ? (sub.plan as PlanTier) : "free";
  return { tier, gated, grandfathered: new Set(company.grandfatheredFeatures ?? []) };
}

function featureAllowed(facts: CompanyPlanFacts, feature: Feature): boolean {
  return !facts.gated || planAllows(facts.tier, feature) || facts.grandfathered.has(feature);
}

async function countTenders(companyId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(tenders).where(eq(tenders.companyId, companyId));
  return Number(row?.n ?? 0);
}

/** Active members plus invitations still waiting, so a pending invite holds its seat. */
async function countSeats(companyId: string): Promise<number> {
  const [members] = await db
    .select({ n: count() })
    .from(userCompanies)
    .where(and(eq(userCompanies.companyId, companyId), isNull(userCompanies.deletedAt)));
  const [pending] = await db
    .select({ n: count() })
    .from(teamInvitations)
    .where(and(
      eq(teamInvitations.companyId, companyId),
      eq(teamInvitations.status, "pending"),
      gt(teamInvitations.expiresAt, new Date()),
    ));
  return Number(members?.n ?? 0) + Number(pending?.n ?? 0);
}

export async function getEntitlements(companyId: string, role?: string | null): Promise<EntitlementsSummary> {
  const facts = await loadPlanFacts(companyId);
  const [tendersUsed, seatsUsed] = await Promise.all([countTenders(companyId), countSeats(companyId)]);

  const unlimitedTenders = !facts.gated || facts.tier !== "free";
  const tenderLimit = unlimitedTenders ? null : FREE_TENDER_LIMIT;
  const unlimitedSeats = featureAllowed(facts, "seats");
  const seatLimit = unlimitedSeats ? null : FREE_SEAT_LIMIT;

  const features = Object.fromEntries(FEATURES.map((f) => [f, featureAllowed(facts, f)])) as Record<Feature, boolean>;

  return {
    tier: facts.tier,
    gated: facts.gated,
    tendersUsed,
    tenderLimit,
    canCreateTender: tenderLimit === null || tendersUsed < tenderLimit,
    seatsUsed,
    seatLimit,
    features,
    canManageBilling: role === "owner" || role === "admin",
  };
}

/** Throws PlanRequiredError unless the company's plan (or grandfathering) includes `feature`. */
export async function assertFeature(companyId: string, feature: Feature): Promise<void> {
  const facts = await loadPlanFacts(companyId);
  if (!featureAllowed(facts, feature)) throw new PlanRequiredError(feature);
}

/**
 * The checks a new tender must pass, in one place so every creation path
 * (web, API key, webhook, MCP) enforces the same thing: the free-tender limit,
 * the marketplace, and in-app Q&A.
 */
export async function assertCanCreateTender(
  companyId: string,
  opts: { marketplace?: boolean; inquiryType?: string | null } = {},
): Promise<void> {
  const facts = await loadPlanFacts(companyId);
  if (!facts.gated) return;

  if (facts.tier === "free" && (await countTenders(companyId)) >= FREE_TENDER_LIMIT) {
    throw new PlanRequiredError("tenders");
  }
  if (opts.marketplace && !featureAllowed(facts, "marketplace")) {
    throw new PlanRequiredError("marketplace");
  }
  if (opts.inquiryType === "inside_bid" && !featureAllowed(facts, "qa")) {
    throw new PlanRequiredError("qa");
  }
}

/** Throws unless `adding` more people fit. Checked when an invite is SENT, never when it is accepted. */
export async function assertSeatAvailable(companyId: string, adding = 1): Promise<void> {
  const facts = await loadPlanFacts(companyId);
  if (featureAllowed(facts, "seats")) return;
  if ((await countSeats(companyId)) + adding > FREE_SEAT_LIMIT) throw new PlanRequiredError("seats");
}

/** Route middleware: the active company's plan must include `feature`. */
export function requireFeature(feature: Feature): RequestHandler {
  return async (req, res: Response, next: NextFunction) => {
    const companyId = (req as AuthRequest).auth?.activeCompanyId;
    if (!companyId) {
      return res.status(400).json({ message: "No active company. Please select a company first.", requiresCompany: true });
    }
    try {
      await assertFeature(companyId, feature);
      next();
    } catch (err) {
      if (sendPlanRequired(res, err)) return;
      console.error(`[Entitlements] ${feature} check failed:`, err);
      res.status(500).json({ message: "Server error" });
    }
  };
}
