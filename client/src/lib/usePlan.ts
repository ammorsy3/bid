// What the active workspace's plan includes, for locks, badges and the dashboard
// plan card. The server enforces every rule itself; this only lets the UI avoid
// sending someone into a task it will refuse (the rule: never block halfway).
//
// While it loads, everything reads as allowed — a lock must never flash on for
// someone who is entitled. The server still has the final say.

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { openUpgrade } from "@/lib/upgrade-store";
import { FREE_TENDER_LIMIT, type EntitlementsSummary, type Feature } from "@shared/entitlements";

export function usePlan() {
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const companyId = activeCompany?.id;

  const query = useQuery<EntitlementsSummary>({
    // The company id is in the key, so switching workspace refetches on its own.
    queryKey: ["/api/entitlements", companyId ?? "none"],
    queryFn: async () => (await apiRequest("GET", "/api/entitlements")).json(),
    enabled: !!companyId,
    // Short, because the tender count changes as people work; the wizard also
    // invalidates this key right after a tender is created.
    staleTime: 15_000,
  });
  const e = query.data;

  const can = useCallback((feature: Feature) => !e || e.features[feature], [e]);

  /** Run `fn` if the plan allows `feature`; otherwise open the upgrade dialog instead. */
  const gate = useCallback(
    (feature: Feature, fn: () => void) => (can(feature) ? fn() : openUpgrade(feature)),
    [can],
  );

  const canCreateTender = !e || e.canCreateTender;

  return {
    loaded: !!e,
    /** The query finished, successfully or not. Redirect decisions wait for this so a failed fetch can't strand anyone. */
    settled: query.isSuccess || query.isError,
    entitlements: e,
    /** False for team/individual workspaces: nothing is gated for them. */
    gated: e?.gated ?? false,
    tier: e?.tier ?? "free",
    tendersUsed: e?.tendersUsed ?? 0,
    tenderLimit: e ? e.tenderLimit : FREE_TENDER_LIMIT,
    canCreateTender,
    canManageBilling: e?.canManageBilling ?? false,
    can,
    gate,
    /** Open the upgrade dialog for the tender limit unless a tender can still be made. */
    gateCreateTender: (fn: () => void) => (canCreateTender ? fn() : openUpgrade("tenders")),
  };
}
