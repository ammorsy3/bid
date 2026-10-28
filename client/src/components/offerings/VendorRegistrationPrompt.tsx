// Dashboard reminder while vendor registration is incomplete ('pending') or the
// organization predates classification ('legacy_unclassified'). It never blocks
// anything on the dashboard; the server is what enforces vendor capabilities.

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { offeringsQueryKey } from "@/lib/offering-catalogue";
import type { OfferingsResponse } from "./OfferingsEditor";

export function VendorRegistrationPrompt() {
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const companyId = activeCompany?.id;
  const { data } = useQuery<OfferingsResponse>({
    queryKey: offeringsQueryKey(companyId ?? "none"),
    queryFn: async () => (await apiRequest("GET", `/api/companies/${companyId}/offerings`)).json(),
    enabled: !!companyId,
    staleTime: 60_000,
    retry: false,
  });
  if (!data || (data.status !== "pending" && data.status !== "legacy_unclassified")) return null;
  const pending = data.status === "pending";

  return (
    <div role="region" aria-label={t("offerings.title")}
      className="rounded-2xl border border-[#FE3C01]/30 bg-[#FE3C01]/[0.05] p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="vendor-registration-prompt" data-status={data.status}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Layers className="h-5 w-5 text-[#FE3C01] shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-sm">{t(pending ? "offerings.promptPendingTitle" : "offerings.promptLegacyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t(pending ? "offerings.promptPendingBody" : "offerings.promptLegacyBody")}</p>
        </div>
      </div>
      {data.canEdit ? (
        <Button type="button" className="min-h-11 bg-[#FE3C01] hover:bg-[#E83501] shrink-0" onClick={() => setLocation("/settings/offerings")} data-testid="button-classify-offerings">
          {t("offerings.promptAction")}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">{t("offerings.promptAskAdmin")}</p>
      )}
    </div>
  );
}
