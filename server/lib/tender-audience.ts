// What a tender looks like to someone outside the company that owns it.
//
// The owner sees the stored row. Everyone else — invited vendors, marketplace
// readers, token holders, vendors reading their own offers — gets the same view:
//   - with "show price to vendors" off, every field that states or adds up to the
//     price is null: budget, budgetRange, budgetMin, budgetMax and each milestone
//     amount (milestones keep their name, description and dates);
//   - the requester's cached AI requirement extraction (rfpRequirements,
//     rfpRequirementsAr) is removed: it is built from the full tender, including
//     a hidden budget, and nothing on the vendor side reads it.
// Keys are kept (as null) rather than dropped so existing clients keep their shape.

const HIDDEN_PRICE_FIELDS = ["budget", "budgetRange", "budgetMin", "budgetMax"] as const;
const REQUESTER_ONLY_FIELDS = ["rfpRequirements", "rfpRequirementsAr"] as const;

type TenderLike = {
  companyId?: string | null;
  showPriceToVendors?: boolean | null;
  milestones?: unknown;
};

export function isPriceHidden(tender: TenderLike): boolean {
  return tender.showPriceToVendors === false;
}

/** The non-owner view of a tender (see the header comment). Never mutates its input. */
export function tenderForAudience<T extends TenderLike>(tender: T, viewerCompanyId?: string | null): T {
  if (viewerCompanyId && tender.companyId && viewerCompanyId === tender.companyId) return tender;

  const out: Record<string, unknown> = { ...tender };
  for (const key of REQUESTER_ONLY_FIELDS) delete out[key];
  if (isPriceHidden(tender)) {
    for (const key of HIDDEN_PRICE_FIELDS) if (key in out) out[key] = null;
    if (Array.isArray(tender.milestones)) {
      out.milestones = tender.milestones.map((m) =>
        m && typeof m === "object" ? { ...(m as Record<string, unknown>), amount: null } : m,
      );
    }
  }
  return out as T;
}
