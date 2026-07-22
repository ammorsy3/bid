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

  const needsProfileSetup =
    (activeCompany as any)?.accountType === "individual" &&
    (activeCompany as any)?.onboardingState !== "completed";

  useEffect(() => {
    if (needsProfileSetup) setLocation("/onboarding/individual-profile");
  }, [needsProfileSetup, setLocation]);

  if (needsProfileSetup) return null;
  return <Dashboard />;
}
