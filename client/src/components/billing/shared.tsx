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
