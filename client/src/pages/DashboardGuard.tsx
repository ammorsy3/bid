import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import Dashboard from "@/pages/Dashboard";

// Individuals must finish creating their public profile before they can reach
// the dashboard. onboardingState flips to 'completed' when they first save
// their profile. Gating here (rather than inside Dashboard) keeps Dashboard's
// hooks from running partially, and avoids flashing the dashboard before the
// redirect. This also blocks skipping the step via a direct /dashboard URL.
export default function DashboardGuard() {
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const [, setLocation] = useLocation();

  const isIndividual = (activeCompany as any)?.accountType === "individual";
  // Individuals must (1) finish their profile, then (2) submit ID verification
  // before reaching the dashboard. After submitting, they enter as "under review".
  const needsProfileSetup = isIndividual && (activeCompany as any)?.onboardingState !== "completed";
  const needsVerification =
    isIndividual && !needsProfileSetup && (activeCompany as any)?.verificationStatus === "not_verified";

  const redirectTo = needsProfileSetup
    ? "/onboarding/individual-profile"
    : needsVerification
      ? "/onboarding/individual-verify"
      : null;

  useEffect(() => {
    if (redirectTo) setLocation(redirectTo);
  }, [redirectTo, setLocation]);

  if (redirectTo) return null;
  return <Dashboard />;
}
