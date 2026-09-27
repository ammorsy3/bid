// The paid plans and what they cost — the one place prices live.
//
// Read by the pricing page, the billing settings tab, the server (to map a
// StreamPay product back to a plan) and scripts/streampay-setup-products.ts
// (which creates the matching products in StreamPay). If a price changes here,
// the StreamPay product must change too: re-run that script, which reports any
// product whose price no longer matches.
//
// Prices are whole SAR, charged per company (not per seat), and EXCLUDE VAT —
// StreamPay adds 15% on top at checkout. See docs/pricing-and-packaging.md.

export const PAID_PLANS = ["pro", "business"] as const;
export type PaidPlan = typeof PAID_PLANS[number];

export const BILLING_TERMS = ["monthly", "yearly"] as const;
export type BillingTerm = typeof BILLING_TERMS[number];

export const VAT_RATE = 0.15;
export const BILLING_CURRENCY = "SAR";

/** Monthly list price, before VAT. Yearly is 20% off, rounded to whole riyals per month. */
export const MONTHLY_PRICE: Record<PaidPlan, number> = { pro: 79, business: 179 };
export const YEARLY_DISCOUNT = 0.2;

/** The effective monthly rate shown on the card, whole riyals. */
export function monthlyRate(plan: PaidPlan, term: BillingTerm): number {
  const base = MONTHLY_PRICE[plan];
  return term === "yearly" ? Math.round(base * (1 - YEARLY_DISCOUNT)) : base;
}

/** What one billing period charges, before VAT: 79 monthly, 756 yearly for Pro. */
export function periodPrice(plan: PaidPlan, term: BillingTerm): number {
  const rate = monthlyRate(plan, term);
  return term === "yearly" ? rate * 12 : rate;
}

/** Subtotal, VAT and total for one period, rounded to halalas. */
export function priceWithVat(plan: PaidPlan, term: BillingTerm) {
  const subtotal = periodPrice(plan, term);
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  return { subtotal, vat, total: Math.round((subtotal + vat) * 100) / 100 };
}

/**
 * The key tagging a plan's StreamPay product (external_metadata.bid_plan_key).
 * Never rename these: existing subscriptions point at the products carrying them.
 */
export function productExternalId(plan: PaidPlan, term: BillingTerm): string {
  return `bid-${plan}-${term}`;
}

export function parseProductExternalId(externalId: string | null | undefined): { plan: PaidPlan; term: BillingTerm } | null {
  const m = /^bid-(pro|business)-(monthly|yearly)$/.exec(externalId ?? "");
  return m ? { plan: m[1] as PaidPlan, term: m[2] as BillingTerm } : null;
}

export function isPaidPlan(v: unknown): v is PaidPlan {
  return typeof v === "string" && (PAID_PLANS as readonly string[]).includes(v);
}

export function isBillingTerm(v: unknown): v is BillingTerm {
  return typeof v === "string" && (BILLING_TERMS as readonly string[]).includes(v);
}
