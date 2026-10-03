// Route guard for pages that start a gated task (e.g. the AI builder). If the
// plan lacks the feature, show the upgrade dialog and go back to the dashboard
// instead of letting someone type into a page the server will then refuse.
// While the plan is unknown it renders the page: the server still has the last word.

import { useEffect } from "react";
import { useLocation } from "wouter";
import { usePlan } from "@/lib/usePlan";
import { openUpgrade } from "@/lib/upgrade-store";
import type { Feature } from "@shared/entitlements";

export function RequirePlan({ feature, children }: { feature: Feature; children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { loaded, can } = usePlan();
  const blocked = loaded && !can(feature);

  useEffect(() => {
    if (!blocked) return;
    openUpgrade(feature);
    setLocation("/dashboard", { replace: true });
  }, [blocked, feature, setLocation]);

  if (blocked) return null;
  return <>{children}</>;
}
