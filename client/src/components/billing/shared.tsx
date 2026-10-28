// Pieces shared by Settings → Plans & Billing and the /upgrade page.

import type { BillingTerm, PaidPlan } from "@shared/billing-plans";
import type { BillingDetailField, ResolvedBillingDetails } from "@shared/billing-details";

export type BillingDetails = ResolvedBillingDetails & { applicable: BillingDetailField[] };

/** GET /api/billing */
export interface BillingSummary {
  subscription: {
    plan: PaidPlan;
    term: BillingTerm;
    status: string;
    live: boolean;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  /** The company's free trial (no card, nothing at StreamPay), active or over. */
  trial: { plan: PaidPlan; startsAt: string; endsAt: string; active: boolean; daysLeft: number } | null;
  details: BillingDetails;
  openCheckout: { id: string; plan: PaidPlan; term: BillingTerm; status: string } | null;
  canManage: boolean;
}

export interface InvoiceRow {
  id: string;
  number: number | null;
  status: "paid" | "open" | "failed";
  total: string | null;
  vat: string | null;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string | null;
  url: string | null;
}

/** SAR amounts always in Western digits, like the pricing page. */
export function sar(n: number) {
  const s = n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return <span dir="ltr" className="tabular-nums">SAR {s}</span>;
}

/** "5 days", "يومين"… for a count of days in running text. */
export function dayCount(n: number, language: string) {
  if (language === "ar") return n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يومًا`;
  return n === 1 ? "1 day" : `${n} days`;
}

/** A date in running text: "26 November 2026" (Western digits in Arabic too, like prices). */
export function longDate(iso: string | Date, language: string) {
  return new Date(iso).toLocaleDateString(language === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
}
