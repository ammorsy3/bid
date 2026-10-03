// What each plan includes — the one place the pricing page's promises become rules.
//
// Read by the server (every gate in server/lib/entitlements.ts), by the client
// (locks, badges, the upgrade dialog) and by tests. If the pricing page changes,
// this file changes with it; tests/entitlements.test.ts fails when a feature
// shown on the page has no rule here.
//
// Only COMPANY workspaces are ever gated. Team and individual workspaces are the
// vendor side of the marketplace: they browse, bid, ask questions and join
// Traction Links for free, always.

export const PLAN_TIERS = ["free", "pro", "business"] as const;
export type PlanTier = typeof PLAN_TIERS[number];

export const TIER_RANK: Record<PlanTier, number> = { free: 0, pro: 1, business: 2 };

/** Free plan: this many tenders in total (every status counts, so nothing frees a slot). */
export const FREE_TENDER_LIMIT = 3;
/** Free plan: a company workspace is for one person. Pro and Business include the whole team. */
export const FREE_SEAT_LIMIT = 1;

/** Everything that needs a paid plan, and the lowest plan that includes it. */
export const FEATURE_MIN_PLAN = {
  marketplace: "pro",   // publish to the public marketplace (free tenders are private, invite-link only)
  aiBuilder: "pro",     // the AI copilot, "suggest with AI", AI budget estimate
  ownTemplates: "pro",  // save your own templates (Bid's ready-made ones stay open to everyone)
  qa: "pro",            // in-app structured Q&A rounds (free: email / WhatsApp contact)
  traction: "pro",      // create a Traction Link
  seats: "pro",         // a second person in the workspace
  aiAnalysis: "business", // AI scoring and ranking of proposals
  comparison: "business", // side-by-side proposal comparison
  api: "business",      // API keys and integrations
} as const satisfies Record<string, Exclude<PlanTier, "free">>;

export type Feature = keyof typeof FEATURE_MIN_PLAN;
export const FEATURES = Object.keys(FEATURE_MIN_PLAN) as Feature[];

export function isFeature(v: unknown): v is Feature {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(FEATURE_MIN_PLAN, v);
}

export function planAllows(tier: PlanTier, feature: Feature): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_PLAN[feature]];
}

export function requiredPlanFor(feature: Feature): Exclude<PlanTier, "free"> {
  return FEATURE_MIN_PLAN[feature];
}

/**
 * Features a company already used before the limits went live and keeps. The
 * migration (0015) stamps these onto companies.grandfathered_features; nothing
 * else ever adds to it, so a free company can't unlock more by using a feature
 * later. Everything else is grandfathered per item: an existing tender keeps its
 * Q&A and marketplace listing, a saved template stays usable.
 */
export const GRANDFATHERABLE = ["traction", "api", "aiBuilder"] as const satisfies readonly Feature[];

/**
 * The pricing page's feature lines (client/src/pages/Pricing.tsx FEATURES) and the
 * rule each one maps to. `null` = shown on the page but not gated in this round.
 * tests/entitlements.test.ts reads Pricing.tsx and fails if a Pro/Business line
 * is missing here, so the page can't promise something no gate enforces.
 */
export const PRICING_PAGE_FEATURES: Record<string, Feature | "tenders" | null> = {
  fUnlimitedTenders: "tenders",
  fMarketplace: "marketplace",
  fVendorBase: null, // every requester already sees the vendors who bid on their tenders
  fAiBuilder: "aiBuilder",
  fTemplates: "ownTemplates",
  fQa: "qa",
  fTraction: "traction",
  fEverythingPro: null,
  fAnalyser: "aiAnalysis",
  fCompare: "comparison",
  fAnalytics: null, // not built yet ("Coming soon" on the page)
  fApi: "api",
};

/** The body of the 403 every gate returns, and what the client keys its upgrade dialog on. */
export interface PlanRequiredBody {
  code: "PLAN_REQUIRED";
  /** A Feature, or "tenders" for the free-tender limit. */
  feature: Feature | "tenders";
  requiredPlan: Exclude<PlanTier, "free">;
  message: string;
}

/** What GET /api/entitlements returns. */
export interface EntitlementsSummary {
  tier: PlanTier;
  /** False for team and individual workspaces: nothing is gated for them. */
  gated: boolean;
  tendersUsed: number;
  tenderLimit: number | null; // null = unlimited
  canCreateTender: boolean;
  seatsUsed: number; // active members + pending invitations
  seatLimit: number | null;
  features: Record<Feature, boolean>;
  /** True when the caller may start an upgrade (owner or admin). */
  canManageBilling: boolean;
}
