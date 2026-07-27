import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import Dashboard from "@/pages/Dashboard";

// Buyer-only dashboard routes: individuals don't source vendors or own RFPs,
// so a direct URL to these should bounce them back rather than render an
// empty/broken tab.
const BUYER_ONLY_ROUTES = ["/rfps", "/vendors"];

// Individuals must finish creating their public profile before they can reach
// the dashboard. onboardingState flips to 'completed' when they first save
// their profile. Gating here (rather than inside Dashboard) keeps Dashboard's
// hooks from running partially, and avoids flashing the dashboard before the
// redirect. This also blocks skipping the step via a direct /dashboard URL.
export default function DashboardGuard() {
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();

  const isIndividual = (activeCompany as any)?.accountType === "individual";
  // Individuals must (1) finish their profile, then (2) submit ID verification
  // before reaching the dashboard. After submitting, they enter as "under review".
  const needsProfileSetup = isIndividual && (activeCompany as any)?.onboardingState !== "completed";
  const needsVerification =
    isIndividual && !needsProfileSetup && (activeCompany as any)?.verificationStatus === "not_verified";
  const isBuyerOnlyRoute = isIndividual && BUYER_ONLY_ROUTES.includes(location);

  const redirectTo = needsProfileSetup
    ? "/onboarding/individual-profile"
    : needsVerification
      ? "/onboarding/individual-verify"
      : isBuyerOnlyRoute
        ? "/dashboard"
        : null;

  useEffect(() => {
    if (!redirectTo) return;
    if (isBuyerOnlyRoute && !needsProfileSetup && !needsVerification) {
      toast({
        title: t("dashboard.individualRestrictedTitle"),
        description: t("dashboard.individualRestrictedDesc"),
      });
    }
    setLocation(redirectTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectTo, setLocation]);

  if (redirectTo) return null;
  return <Dashboard />;
}
