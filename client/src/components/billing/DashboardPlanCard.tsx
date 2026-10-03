// Where the dashboard shows the plan and the way to upgrade, so nobody has to go
// digging in Settings: a card in the sidebar (an icon when it's collapsed), an
// "Upgrade" chip in the mobile header, and a banner on the overview when the
// free tenders are nearly or fully used. All three are for company workspaces
// only (teams and individuals are never gated) and read usePlan().

import { useLocation } from "wouter";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";

export function SidebarPlanCard() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { loaded, gated, tier, tendersUsed, tenderLimit } = usePlan();
  if (!loaded || !gated) return null;

  const free = tier === "free";
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
            {free ? t("upgrade.planCardFree") : t(tier === "business" ? "billing.planBusiness" : "billing.planPro")}
          </p>
          {free && tenderLimit !== null && (
            <span className="text-[11px] tabular-nums text-muted-foreground" dir="ltr">{Math.min(tendersUsed, limit)}/{limit}</span>
          )}
        </div>

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
          {free ? t("upgrade.upgradeCta") : t("upgrade.planCardManage")}
        </Button>
      </div>
    </>
  );
}

/** Mobile header chip; the sidebar card isn't visible until the menu opens. */
export function MobileUpgradeChip() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { loaded, gated, tier } = usePlan();
  if (!loaded || !gated || tier !== "free") return null;
  return (
    <button
      type="button"
      onClick={() => setLocation("/upgrade")}
      className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-[#FE3C01] px-3 text-xs font-semibold text-white"
      data-testid="mobile-upgrade-chip"
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      {t("upgrade.upgradeCta")}
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
