// /upgrade — the upgrade journey, outside Settings.
//
// People arrive here from the dashboard plan card, the upgrade dialog (when a
// limit stops them, with ?reason=<feature>), or the pricing page (with
// ?plan=&term=). It shows what each plan includes, highlights what sent them
// here, and runs the same checkout as Settings. After paying, it says what's
// now unlocked and sends them back to where they were.

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Check, Minus, PartyPopper } from "lucide-react";
import { BackPillButton } from "@/components/ui/back-pill-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutFlow } from "@/components/billing/CheckoutFlow";
import { type BillingSummary } from "@/components/billing/shared";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { usePlan } from "@/lib/usePlan";
import { clearReturnPath, takeReturnPath } from "@/lib/upgrade-return";
import {
  FEATURE_MIN_PLAN, FREE_TENDER_LIMIT, isFeature, planAllows, type Feature, type PlanTier,
} from "@shared/entitlements";
import type { PaidPlan } from "@shared/billing-plans";

/** The rows of the comparison, in the order the pricing page tells the story. */
const ROWS: (Feature | "tenders")[] = [
  "tenders", "seats", "marketplace", "aiBuilder", "ownTemplates", "qa", "traction", "aiAnalysis", "comparison", "api",
];

const TIERS: PlanTier[] = ["free", "pro", "business"];

function includes(tier: PlanTier, row: Feature | "tenders"): boolean {
  return row === "tenders" ? true : planAllows(tier, row);
}

export default function Upgrade() {
  const { t, isRtl } = useI18n();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { loaded, gated, tier, entitlements } = usePlan();

  const reasonParam = new URLSearchParams(window.location.search).get("reason");
  const reason: Feature | "tenders" | null =
    reasonParam === "tenders" ? "tenders" : isFeature(reasonParam) ? reasonParam : null;

  const queryKey = ["/api/billing", activeCompany?.id ?? "none"];
  const { data, refetch } = useQuery<BillingSummary>({
    queryKey,
    queryFn: async () => (await apiRequest("GET", "/api/billing")).json(),
    enabled: !!activeCompany?.id,
  });

  // Plans are for company workspaces; teams and individuals aren't gated.
  useEffect(() => {
    if (!user) setLocation("/login");
    else if (loaded && !gated) setLocation("/dashboard");
  }, [user, loaded, gated, setLocation]);

  if (!user || !activeCompany) return null;

  const goBack = () => {
    const to = takeReturnPath();
    clearReturnPath();
    setLocation(to);
  };

  const live = !!data?.subscription?.live;
  const defaultPlan: PaidPlan = reason && reason !== "tenders" && FEATURE_MIN_PLAN[reason] === "business" ? "business" : "pro";
  const planLabel = (p: PlanTier) => t(p === "business" ? "billing.planBusiness" : p === "pro" ? "billing.planPro" : "billing.planFree");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background" dir={isRtl ? "rtl" : "ltr"} data-testid="upgrade-page">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <BackPillButton onClick={goBack} data-testid="button-upgrade-back" />

        <div>
          <h1 className="font-display text-3xl font-black tracking-[-0.04em]">{t("upgrade.pageTitle")}</h1>
          <p className="mt-1 text-muted-foreground">{t("upgrade.pageSubtitle")}</p>
          {reason && !live && (
            <p className="mt-3 inline-block rounded-lg bg-[#FE3C01]/10 px-3 py-1.5 text-sm font-medium text-[#FE3C01]" data-testid="upgrade-reason">
              {t(`upgrade.title_${reason}`)}
            </p>
          )}
        </div>

        {!data ? (
          <>
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </>
        ) : (
          <>
            {/* After upgrading: what's unlocked, and the way back. */}
            {live && data.subscription && (
              <Card className="border-green-200 dark:border-green-900" data-testid="upgrade-unlocked">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <PartyPopper className="h-5 w-5 text-green-600" />
                    <h2 className="font-display text-xl font-black tracking-[-0.03em]">
                      {t("upgrade.unlockedTitle", { plan: planLabel(data.subscription.plan) })}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("upgrade.unlockedDesc")}</p>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {ROWS.filter((r) => r !== "tenders" && (entitlements ? entitlements.features[r] : planAllows(data.subscription!.plan, r))).map((r) => (
                      <li key={r} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-green-600" />{t(`upgrade.row_${r}`)}
                      </li>
                    ))}
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-600" />{t("upgrade.valUnlimitedTenders")}
                    </li>
                  </ul>
                  <Button className="bg-[#FE3C01] text-white hover:bg-[#FE3C01]/90" onClick={goBack} data-testid="upgrade-continue">
                    {t("upgrade.continue")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* What each plan includes */}
            <Card data-testid="upgrade-compare">
              <CardContent className="p-0">
                <div className="grid grid-cols-[1.6fr_repeat(3,1fr)] items-end gap-x-2 border-b px-3 py-3 text-center text-xs font-semibold sm:px-5 sm:text-sm">
                  <span className="text-start text-muted-foreground">{t("upgrade.compareTitle")}</span>
                  {TIERS.map((p) => (
                    <span key={p} className={tier === p ? "text-[#FE3C01]" : ""}>
                      {planLabel(p)}
                      {tier === p && <span className="block text-[10px] font-medium">{t("upgrade.current")}</span>}
                    </span>
                  ))}
                </div>
                <ul className="divide-y">
                  {ROWS.map((row) => (
                    <li
                      key={row}
                      className={`grid grid-cols-[1.6fr_repeat(3,1fr)] items-center gap-x-2 px-3 py-2.5 text-center text-sm sm:px-5 ${
                        reason === row ? "bg-[#FE3C01]/5" : ""
                      }`}
                      data-testid={`upgrade-row-${row}`}
                    >
                      <span className="text-start font-medium">{t(`upgrade.row_${row}`)}</span>
                      {TIERS.map((p) => (
                        <span key={p} className="flex justify-center" aria-label={`${planLabel(p)}: ${includes(p, row) ? t("upgrade.included") : t("upgrade.notIncluded")}`}>
                          {row === "tenders" ? (
                            <span className="text-xs font-semibold sm:text-sm">
                              {p === "free" ? `${FREE_TENDER_LIMIT}` : <span aria-label={t("upgrade.valUnlimited")}>∞</span>}
                            </span>
                          ) : row === "seats" && p === "free" ? (
                            <span className="text-xs font-semibold sm:text-sm">1</span>
                          ) : includes(p, row) ? (
                            <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
                          )}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
                <p className="border-t px-3 py-3 text-xs text-muted-foreground sm:px-5">{t("upgrade.compareNote")}</p>
              </CardContent>
            </Card>

            {/* Checkout (or the return from it) */}
            <CheckoutFlow
              returnTo="upgrade"
              summary={data}
              onSummaryChanged={refetch}
              keepParams={{}}
              defaultPlan={defaultPlan}
            />
          </>
        )}
      </div>
    </div>
  );
}
