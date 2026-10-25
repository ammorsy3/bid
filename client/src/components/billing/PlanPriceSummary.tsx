// What a plan costs for one month, laid out so the payable amount is
// unmistakable: plan name, then base price, VAT and the total (BID-UX-BUGFIX
// item 8). Every number comes from shared/billing-plans.ts priceWithVat — the
// same calculation checkout uses — so the total shown here is the total charged.

import { useI18n } from "@/lib/i18n";
import { priceWithVat, type PaidPlan } from "@shared/billing-plans";

const sar = (amount: number) => amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PlanPriceSummary({ plan, className = "" }: { plan: PaidPlan; className?: string }) {
  const { t } = useI18n();
  const { subtotal, vat, total } = priceWithVat(plan, "monthly");
  return (
    <div className={`rounded-xl border border-border bg-muted/40 p-3 text-sm ${className}`} data-testid={`plan-price-${plan}`}>
      <p className="font-semibold text-foreground mb-2">
        {t(plan === "business" ? "billing.planBusiness" : "billing.planPro")}
      </p>
      <dl className="space-y-1">
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <dt>{t("billing.subtotal")}</dt>
          <dd dir="ltr" className="tabular-nums" data-testid="plan-price-subtotal">SAR {sar(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <dt>{t("billing.vat")}</dt>
          <dd dir="ltr" className="tabular-nums" data-testid="plan-price-vat">SAR {sar(vat)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-1.5 mt-1.5 font-semibold text-foreground">
          <dt>{t("billing.totalPerMonth")}</dt>
          <dd dir="ltr" className="tabular-nums text-base" data-testid="plan-price-total">SAR {sar(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
