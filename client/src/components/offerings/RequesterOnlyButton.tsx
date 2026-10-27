// "We only request offers": a company that offers nothing says so explicitly
// (pending or legacy only — never discards a registered vendor's offerings).

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { offeringsQueryKey } from "@/lib/offering-catalogue";
import { useToast } from "@/hooks/use-toast";
import type { OfferingsResponse } from "./OfferingsEditor";

export function RequesterOnlyButton({ companyId, onDone }: { companyId: string; onDone?: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const current = queryClient.getQueryData<OfferingsResponse>(offeringsQueryKey(companyId));
  if (current && (!current.canEdit || (current.status !== "pending" && current.status !== "legacy_unclassified"))) return null;

  const run = async () => {
    setBusy(true);
    try {
      const res = await apiRequest("POST", `/api/companies/${companyId}/vendor-registration/requester-only`, { expectedRevision: current?.revision ?? 0 });
      queryClient.setQueryData(offeringsQueryKey(companyId), await res.json());
      onDone?.();
    } catch (e: any) {
      toast({ title: t("offerings.saveFailed"), description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button type="button" variant="ghost" className="min-h-11 text-muted-foreground" disabled={busy} onClick={run} data-testid="button-requester-only">
      {t("offerings.onlyRequest")}
    </Button>
  );
}
