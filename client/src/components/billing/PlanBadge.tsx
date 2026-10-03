// A small "Pro" / "Business" pill with a lock, shown beside a control the
// current plan doesn't include. Pair it with usePlan().gate() so a click opens
// the upgrade dialog instead of starting the task.

import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { FEATURE_MIN_PLAN, type Feature } from "@shared/entitlements";

export function PlanBadge({ feature, className = "" }: { feature: Feature; className?: string }) {
  const { t } = useI18n();
  const plan = FEATURE_MIN_PLAN[feature];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[#FE3C01]/30 bg-[#FE3C01]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FE3C01] ${className}`}
      data-testid={`plan-badge-${feature}`}
    >
      <Lock className="h-2.5 w-2.5" aria-hidden="true" />
      {t(plan === "business" ? "upgrade.badgeBusiness" : "upgrade.badgePro")}
    </span>
  );
}
