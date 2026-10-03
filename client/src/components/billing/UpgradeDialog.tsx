// The one upgrade prompt. It opens (1) before a gated task, when the UI already
// knows the plan lacks the feature, and (2) the moment any request comes back
// 403 PLAN_REQUIRED (see lib/queryClient.ts). It says what's locked, which plan
// unlocks it and what that costs, then takes the person to /upgrade — and
// remembers where they were, so after paying they land right back there.

import { useLocation } from "wouter";
import { Lock, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import { useUpgradeStore } from "@/lib/upgrade-store";
import { rememberReturnPath } from "@/lib/upgrade-return";
import { FEATURE_MIN_PLAN } from "@shared/entitlements";
import { monthlyRate } from "@shared/billing-plans";

export function UpgradeDialog() {
  const { t } = useI18n();
  const [location, setLocation] = useLocation();
  const { feature, message, closeUpgrade } = useUpgradeStore();
  const { entitlements, canManageBilling } = usePlan();

  const plan = feature === "tenders" || feature === null ? "pro" : FEATURE_MIN_PLAN[feature];
  const planLabel = t(plan === "business" ? "billing.planBusiness" : "billing.planPro");
  const price = monthlyRate(plan, "monthly");
  // Until entitlements load, assume they can: a wrong "ask your owner" is worse than a wrong button.
  const canUpgrade = entitlements ? canManageBilling : true;

  const titleKey = feature ? `upgrade.title_${feature}` : "";
  const descKey = feature ? `upgrade.desc_${feature}` : "";
  const title = feature ? t(titleKey) : "";
  // If we have no wording for a new feature yet, fall back to the server's own message.
  const hasCopy = feature ? title !== titleKey : false;

  const seePlans = () => {
    if (!feature) return;
    rememberReturnPath(location);
    closeUpgrade();
    setLocation(`/upgrade?reason=${encodeURIComponent(feature)}`);
  };

  return (
    <Dialog open={feature !== null} onOpenChange={(open) => { if (!open) closeUpgrade(); }}>
      <DialogContent className="sm:max-w-md" data-testid="upgrade-dialog">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#FE3C01]/10 text-[#FE3C01]">
            {canUpgrade ? <Sparkles className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <DialogTitle className="font-display text-xl font-black tracking-[-0.03em]">
            {hasCopy ? title : t("upgrade.titleFallback")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {hasCopy ? t(descKey) : message}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-muted/60 p-3 text-center text-sm" data-testid="upgrade-dialog-plan">
          {t("upgrade.includedIn", { plan: planLabel })}
          <span className="font-semibold">
            {" · "}
            <span dir="ltr" className="tabular-nums">SAR {price}</span> {t("upgrade.perMonthPlusVat")}
          </span>
        </div>

        {!canUpgrade && (
          <p className="text-center text-sm text-muted-foreground" data-testid="upgrade-dialog-ask-owner">
            {t("upgrade.askOwner")}
          </p>
        )}

        <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
          {canUpgrade && (
            <Button className="w-full bg-[#FE3C01] text-white hover:bg-[#FE3C01]/90" onClick={seePlans} data-testid="upgrade-dialog-see-plans">
              {t("upgrade.seePlans")}
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={closeUpgrade} data-testid="upgrade-dialog-not-now">
            {t("upgrade.notNow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
