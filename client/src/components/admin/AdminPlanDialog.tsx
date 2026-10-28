// Admin plan management for ONE company (BID-UX-BUGFIX item 7). Verification
// and the paid subscription are shown separately from the administrative grant;
// a grant never creates a payment or an invoice. The server re-checks the admin,
// the target company (confirmCompanyId) and the grant this view was built on
// (expectedGrantId) — see server/routes/admin-plans.ts.

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { formatLocalDate } from "@/lib/admin-date";
import { GRANT_DURATIONS, GRANT_PLANS, type GrantDuration, type GrantPlan } from "@shared/plan-grants";

interface PlanView {
  company: { id: string; name: string; accountType: string; verificationStatus: string };
  subscription: { plan: string; term: string; status: string; live: boolean; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  grant: { id: string; plan: string; reason: string; startsAt: string; endsAt: string | null; active: boolean } | null;
  effectiveTier: "free" | "pro" | "business" | null;
  trial?: { plan: string; startsAt: string; endsAt: string; active: boolean } | null;
  planSource: "free" | "subscription" | "grant" | "trial" | null;
  history: { id: string; plan: string; reason: string; startsAt: string; endsAt: string | null; revokedAt: string | null; revokeReason: string | null }[];
}

const planKey = (p: string) => (p === "business" ? "billing.planBusiness" : p === "pro" ? "billing.planPro" : "adminPlans.planFree");

export function AdminPlanDialog({ companyId, onClose }: { companyId: string | null; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const key = ["/api/admin/companies", companyId, "plan"];
  const { data, isLoading, isError } = useQuery<PlanView>({
    queryKey: key,
    queryFn: async () => (await apiRequest("GET", `/api/admin/companies/${companyId}/plan`)).json(),
    enabled: !!companyId,
  });

  const [plan, setPlan] = useState<GrantPlan>("pro");
  const [duration, setDuration] = useState<GrantDuration>("90d");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState<"grant" | "revoke" | null>(null);
  useEffect(() => { setReason(""); setConfirming(null); setPlan("pro"); setDuration("90d"); }, [companyId]);

  const onError = (error: unknown) => {
    const code = error instanceof ApiError ? error.code : undefined;
    toast({
      title: t("common.error"),
      description: code === "GRANT_CHANGED" ? t("adminPlans.changedElsewhere") : error instanceof Error ? error.message : t("adminPlans.failed"),
      variant: "destructive",
    });
    if (code === "GRANT_CHANGED") queryClient.invalidateQueries({ queryKey: key });
    setConfirming(null);
  };
  const onDone = (view: PlanView, message: string) => {
    queryClient.setQueryData(key, view);
    queryClient.invalidateQueries({ queryKey: ["/api/entitlements"] });
    toast({ title: message });
    setReason("");
    setConfirming(null);
  };

  const grantMutation = useMutation({
    mutationFn: async () => (await apiRequest("PUT", `/api/admin/companies/${companyId}/plan-grant`, {
      plan, duration, reason: reason.trim(), expectedGrantId: data?.grant?.id ?? null, confirmCompanyId: companyId,
    })).json() as Promise<PlanView>,
    onSuccess: (view) => onDone(view, t("adminPlans.granted")),
    onError,
  });
  const revokeMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/admin/companies/${companyId}/plan-grant/revoke`, {
      reason: reason.trim(), expectedGrantId: data?.grant?.id, confirmCompanyId: companyId,
    })).json() as Promise<PlanView>,
    onSuccess: (view) => onDone(view, t("adminPlans.revoked")),
    onError,
  });

  const reasonOk = reason.trim().length >= 3 && reason.trim().length <= 500;
  const isCompany = data?.company.accountType === "company";
  const date = (d: string | null) => (d ? formatLocalDate(new Date(d), "d MMM yyyy") : t("adminPlans.noEnd"));
  const busy = grantMutation.isPending || revokeMutation.isPending;

  return (
    <Dialog open={!!companyId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto" data-testid="admin-plan-dialog">
        <DialogHeader>
          <DialogTitle>{t("adminPlans.title")}</DialogTitle>
          <DialogDescription>{data ? t("adminPlans.subtitle", { company: data.company.name }) : t("adminPlans.loading")}</DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">{t("adminPlans.loading")}</p>}
        {isError && <p className="text-sm text-red-600" role="alert">{t("adminPlans.failed")}</p>}

        {data && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-border p-3">
              <dt className="text-muted-foreground">{t("adminPlans.company")}</dt>
              <dd className="font-medium min-w-0 break-words">{data.company.name} <span dir="ltr" className="text-xs text-muted-foreground">({data.company.id})</span></dd>
              <dt className="text-muted-foreground">{t("adminPlans.verification")}</dt>
              <dd data-testid="admin-plan-verification"><Badge variant="outline">{t(`adminPlans.verification_${data.company.verificationStatus}`)}</Badge></dd>
              <dt className="text-muted-foreground">{t("adminPlans.subscription")}</dt>
              <dd data-testid="admin-plan-subscription">
                {data.subscription
                  ? <>{t(planKey(data.subscription.plan))} · {data.subscription.live ? t("adminPlans.subscriptionLive") : t("adminPlans.subscriptionNotLive")}</>
                  : t("adminPlans.noSubscription")}
              </dd>
              <dt className="text-muted-foreground">{t("adminPlans.adminGrant")}</dt>
              <dd data-testid="admin-plan-grant">
                {data.grant
                  ? <>{t(planKey(data.grant.plan))} · {t("adminPlans.until", { date: date(data.grant.endsAt) })}{!data.grant.active && <> · {t("adminPlans.grantInactive")}</>}</>
                  : t("adminPlans.noGrant")}
              </dd>
              <dt className="text-muted-foreground">{t("adminPlans.effective")}</dt>
              <dd className="font-semibold" data-testid="admin-plan-effective">
                {data.effectiveTier ? <>{t(planKey(data.effectiveTier))}{data.planSource !== "free" && <> · {t(`adminPlans.source_${data.planSource}`)}</>}</> : t("adminPlans.notGated")}
              </dd>
            </dl>

            {!isCompany ? (
              <p className="text-muted-foreground" data-testid="admin-plan-not-company">{t("adminPlans.notCompanyWorkspace")}</p>
            ) : (
              <>
                <fieldset className="space-y-3" disabled={busy}>
                  <legend className="font-semibold mb-1">{data.grant ? t("adminPlans.changeGrant") : t("adminPlans.giveGrant")}</legend>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("adminPlans.plan")}>
                    {GRANT_PLANS.map((p) => (
                      <Button key={p} type="button" role="radio" aria-checked={plan === p} variant={plan === p ? "default" : "outline"} className="min-h-11" onClick={() => setPlan(p)} data-testid={`admin-plan-choose-${p}`}>
                        {t(planKey(p))}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={t("adminPlans.duration")}>
                    {GRANT_DURATIONS.map((d) => (
                      <Button key={d} type="button" role="radio" aria-checked={duration === d} variant={duration === d ? "default" : "outline"} className="min-h-11" onClick={() => setDuration(d)} data-testid={`admin-plan-duration-${d}`}>
                        {t(`adminPlans.duration_${d}`)}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-plan-reason">{t("adminPlans.reason")}</Label>
                    <Textarea id="admin-plan-reason" dir="auto" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("adminPlans.reasonPlaceholder")} data-testid="admin-plan-reason" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("adminPlans.effectExplainer")}</p>
                </fieldset>

                {confirming && (
                  <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200" data-testid="admin-plan-confirm">
                    {confirming === "grant"
                      ? duration === "open"
                        ? t("adminPlans.confirmGrantOpen", { plan: t(planKey(plan)), company: data.company.name })
                        : t("adminPlans.confirmGrant", { plan: t(planKey(plan)), company: data.company.name, until: t(`adminPlans.duration_${duration}`) })
                      : t("adminPlans.confirmRevoke", { company: data.company.name })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
          <Button variant="outline" className="min-h-11" onClick={confirming ? () => setConfirming(null) : onClose}>
            {confirming ? t("adminPlans.back") : t("adminPlans.close")}
          </Button>
          {data && isCompany && data.grant && confirming !== "grant" && (
            <Button variant="outline" className="min-h-11 border-red-300 text-red-700" disabled={!reasonOk || busy}
              onClick={() => (confirming === "revoke" ? revokeMutation.mutate() : setConfirming("revoke"))} data-testid="admin-plan-revoke">
              {confirming === "revoke" ? t("adminPlans.confirmRevokeAction") : t("adminPlans.revoke")}
            </Button>
          )}
          {data && isCompany && confirming !== "revoke" && (
            <Button className="min-h-11" disabled={!reasonOk || busy}
              onClick={() => (confirming === "grant" ? grantMutation.mutate() : setConfirming("grant"))} data-testid="admin-plan-apply">
              {confirming === "grant" ? t("adminPlans.confirmGrantAction") : data.grant ? t("adminPlans.changeGrant") : t("adminPlans.giveGrant")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
