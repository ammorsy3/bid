// Where the dashboard shows the plan and the way to upgrade, so nobody has to go
// digging in Settings: a card in the sidebar (an icon when it's collapsed), an
// "Upgrade" chip in the mobile header, and a banner on the overview when the
// free tenders are nearly or fully used. During a free trial the card says so,
// and in its last days the chip and a banner ask for payment. All of these are
// for company workspaces only (teams and individuals are never gated) and read usePlan().

import { useLocation } from "wouter";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import { dayCount, longDate } from "./shared";

const DAY_MS = 24 * 60 * 60 * 1000;
/** In a trial's last days the banner and chip ask for payment (the email goes at 5 days, server/lib/trials.ts). */
const TRIAL_NUDGE_DAYS = 7;

function trialDaysLeft(endsAt: string) {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / DAY_MS));
}

export function SidebarPlanCard() {
  const { t, language } = useI18n();
  const [, setLocation] = useLocation();
  const { loaded, gated, tier, tendersUsed, tenderLimit, trialEndsAt } = usePlan();
  if (!loaded || !gated) return null;

  const free = tier === "free";
  const planLabel = t(tier === "business" ? "billing.planBusiness" : "billing.planPro");
  const go = () => setLocation(free ? "/upgrade" : "/settings?tab=billing");
  const limit = tenderLimit ?? 0;

  return (
    <>
      {/* Collapsed sidebar: just the icon. */}
      <button
        type="button"
        onClick={go}
        className="mb-3 hidden h-8 w-8 items-center justify-center rounded-md bg-[#FE3C01]/10 text-[#FE3C01] group-data-[collapsible=icon]:flex"
        aria-label={free ? t("upgrade.upgradeCta") : t("upgrade.planCardManage")}
        data-testid="sidebar-plan-icon"
      >
        <Sparkles className="h-4 w-4" />
      </button>

      <div
        className="mb-3 rounded-lg border border-[#FE3C01]/20 bg-[#FE3C01]/5 px-3 py-2.5 group-data-[collapsible=icon]:hidden"
        data-testid="sidebar-plan-card"
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold" data-testid="sidebar-plan-name">
            {free ? t("upgrade.planCardFree") : trialEndsAt ? t("upgrade.planCardTrial", { plan: planLabel }) : planLabel}
          </p>
          {free && tenderLimit !== null && (
            <span className="text-[11px] tabular-nums text-muted-foreground" dir="ltr">{Math.min(tendersUsed, limit)}/{limit}</span>
          )}
        </div>

        {trialEndsAt && (
          <p className="mb-2 text-[11px] leading-snug text-muted-foreground" data-testid="sidebar-plan-trial">
            {t("billing.trialNote", { date: longDate(trialEndsAt, language), days: dayCount(trialDaysLeft(trialEndsAt), language) })}
          </p>
        )}

        {free && tenderLimit !== null && (
          <>
            <div className="mb-1.5 flex gap-1" role="img" aria-label={t("upgrade.planCardUsage", { used: Math.min(tendersUsed, limit), limit })}>
              {Array.from({ length: limit }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < tendersUsed ? "bg-[#FE3C01]" : "bg-[#FE3C01]/20"}`} />
              ))}
            </div>
            <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
              {t("upgrade.planCardUsage", { used: Math.min(tendersUsed, limit), limit })}
            </p>
          </>
        )}

        <Button
          size="sm"
          variant={free ? "default" : "outline"}
          className={`h-7 w-full text-xs ${free ? "bg-[#FE3C01] text-white hover:bg-[#FE3C01]/90" : ""}`}
          onClick={go}
          data-testid="sidebar-plan-cta"
        >
          {free ? t("upgrade.upgradeCta") : trialEndsAt ? t("billing.keepPlanCta", { plan: planLabel }) : t("upgrade.planCardManage")}
        </Button>
      </div>
    </>
  );
}

/** Mobile header chip; the sidebar card isn't visible until the menu opens. */
export function MobileUpgradeChip() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { loaded, gated, tier, trialEndsAt } = usePlan();
  if (!loaded || !gated) return null;
  // A trial in its last days asks for payment the same way.
  const trialEnding = !!trialEndsAt && trialDaysLeft(trialEndsAt) <= TRIAL_NUDGE_DAYS;
  if (tier !== "free" && !trialEnding) return null;
  return (
    <button
      type="button"
      onClick={() => setLocation(trialEnding ? "/settings?tab=billing" : "/upgrade")}
      className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-[#FE3C01] px-3 text-xs font-semibold text-white"
      data-testid="mobile-upgrade-chip"
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      {trialEnding ? t("billing.keepPlanCta", { plan: t(tier === "business" ? "billing.planBusiness" : "billing.planPro") }) : t("upgrade.upgradeCta")}
    </button>
  );
}

/** Overview banner: shown with one free tender left, and when none are. */
export function PlanUsageBanner() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { loaded, gated, tier, tendersUsed, tenderLimit, canManageBilling } = usePlan();
  if (!loaded || !gated || tier !== "free" || tenderLimit === null) return null;

  const left = tenderLimit - tendersUsed;
  if (left > 1) return null;
  const out = left <= 0;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 ${
        out ? "border-[#FE3C01]/40 bg-[#FE3C01]/10" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
      }`}
      data-testid={out ? "plan-banner-limit" : "plan-banner-one-left"}
    >
      <div className="min-w-0">
        <p className="font-semibold">
          {out ? t("upgrade.bannerLimitTitle", { limit: tenderLimit }) : t("upgrade.bannerOneLeftTitle")}
        </p>
        <p className="text-sm text-muted-foreground">
          {out ? t("upgrade.bannerLimitDesc") : t("upgrade.bannerOneLeftDesc")}
        </p>
      </div>
      <Button className="bg-[#FE3C01] text-white hover:bg-[#FE3C01]/90" onClick={() => setLocation("/upgrade?reason=tenders")} data-testid="plan-banner-cta">
        {canManageBilling ? t("upgrade.upgradeCta") : t("upgrade.seePlans")}
      </Button>
    </div>
  );
}

/** Overview banner in a free trial's last days: add payment to keep the plan. */
export function TrialEndingBanner() {
  const { t, language } = useI18n();
  const [, setLocation] = useLocation();
  const { loaded, gated, tier, trialEndsAt, canManageBilling } = usePlan();
  if (!loaded || !gated || !trialEndsAt || !canManageBilling) return null;
  const left = trialDaysLeft(trialEndsAt);
  if (left > TRIAL_NUDGE_DAYS) return null;
  const plan = t(tier === "business" ? "billing.planBusiness" : "billing.planPro");

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900 dark:bg-amber-950/30"
      data-testid="plan-banner-trial-ending"
    >
      <div className="min-w-0">
        <p className="font-semibold">
          {left <= 1 ? t("upgrade.trialBannerTitleLast", { plan }) : t("upgrade.trialBannerTitle", { plan, days: dayCount(left, language) })}
        </p>
        <p className="text-sm text-muted-foreground">{t("upgrade.trialBannerDesc", { plan, date: longDate(trialEndsAt, language) })}</p>
      </div>
      <Button className="bg-[#FE3C01] text-white hover:bg-[#FE3C01]/90" onClick={() => setLocation("/settings?tab=billing")} data-testid="plan-banner-trial-cta">
        {t("billing.keepPlanCta", { plan })}
      </Button>
    </div>
  );
}
