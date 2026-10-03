// Settings → Plans & Billing: see and manage the workspace's subscription.
//
//   - the current plan: status, when it renews or ends, what it costs
//   - cancel (takes effect at the end of the paid period) and resume
//   - the card, via StreamPay's secure portal
//   - invoices
//   - for a workspace with no live plan, the upgrade flow (<CheckoutFlow>)
//
// The plan state is our cache of StreamPay, which the server refreshes on
// return from checkout, by webhook, and on "Refresh". Cancel and resume go
// through StreamPay and re-read it, so what's shown is what StreamPay holds.

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { AlertTriangle, CreditCard, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { priceWithVat, type BillingTerm, type PaidPlan } from "@shared/billing-plans";
import { CheckoutFlow } from "@/components/billing/CheckoutFlow";
import { sar, type BillingSummary, type InvoiceRow } from "@/components/billing/shared";

/** StreamPay statuses where the plan is no longer being paid for. */
const PAYMENT_PROBLEM = new Set(["inactive", "frozen"]);

export function SettingsBilling() {
  const { t, language, isRtl } = useI18n();
  const { activeCompany } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dateLocale = language === "ar" ? arSA : enUS;
  const fmtDate = (iso: string) => format(new Date(iso), "d MMMM yyyy", { locale: dateLocale });

  const queryKey = ["/api/billing", activeCompany?.id ?? "none"];
  const { data, isLoading, refetch } = useQuery<BillingSummary>({
    queryKey,
    queryFn: async () => (await apiRequest("GET", "/api/billing")).json(),
    enabled: !!activeCompany?.id,
  });

  const planName = (p: PaidPlan) => t(p === "pro" ? "billing.planPro" : "billing.planBusiness");
  const termName = (x: BillingTerm) => t(x === "yearly" ? "billing.termYearly" : "billing.termMonthly");

  const sub = data?.subscription ?? null;
  const live = !!sub?.live;
  const canManage = !!data?.canManage;

  const { data: invoices, isLoading: invoicesLoading } = useQuery<InvoiceRow[]>({
    queryKey: ["/api/billing/invoices", activeCompany?.id ?? "none"],
    queryFn: async () => (await apiRequest("GET", "/api/billing/invoices")).json(),
    // Only workspaces that have started paying have a billing history to show.
    enabled: !!activeCompany?.id && canManage && !!sub,
  });

  const onError = useCallback((err: unknown) => {
    const code = err instanceof ApiError ? err.code : undefined;
    toast({
      title: t("billing.errorTitle"),
      description: code === "NOT_CONFIGURED" ? t("billing.notConfigured") : t("billing.genericError"),
      variant: "destructive",
    });
  }, [t, toast]);

  const applySummary = async (summary: Partial<BillingSummary>) => {
    queryClient.setQueryData(queryKey, (prev: BillingSummary | undefined) => (prev ? { ...prev, ...summary } : (summary as BillingSummary)));
    await queryClient.invalidateQueries({ queryKey: ["/api/entitlements"] });
  };

  const [portalLoading, setPortalLoading] = useState(false);
  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await (await apiRequest("POST", "/api/billing/portal")).json() as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      onError(err);
    } finally {
      setPortalLoading(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      await applySummary(await (await apiRequest("POST", "/api/billing/refresh")).json());
    } catch (err) {
      onError(err);
    } finally {
      setRefreshing(false);
    }
  };

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState<"cancel" | "resume" | null>(null);
  const changeSubscription = async (action: "cancel" | "resume") => {
    setBusy(action);
    try {
      const summary = await (await apiRequest("POST", `/api/billing/subscription/${action}`)).json() as BillingSummary;
      await applySummary(summary);
      const end = summary.subscription?.currentPeriodEnd;
      toast({
        title: t(action === "cancel" ? "billing.cancelledTitle" : "billing.resumedTitle"),
        description: end ? t(action === "cancel" ? "billing.cancelledDesc" : "billing.resumedDesc", { date: fmtDate(end) }) : undefined,
      });
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  };

  const header = (
    <div>
      <h1 className="font-display font-black text-3xl flex items-center gap-2 tracking-[-0.04em]">
        <CreditCard className="h-6 w-6" />
        {t("billing.title")}
      </h1>
      <p className="text-muted-foreground mt-1">{t("billing.subtitle")}</p>
    </div>
  );

  if (!activeCompany?.id) {
    return <div className="space-y-4">{header}<p className="text-sm text-muted-foreground">{t("billing.noWorkspace")}</p></div>;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        {header}
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const end = sub?.currentPeriodEnd ?? null;
  const cancelling = live && !!sub?.cancelAtPeriodEnd;
  const paymentProblem = !!sub && PAYMENT_PROBLEM.has(sub.status);

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"} data-testid="settings-billing">
      {header}

      {/* Current plan */}
      <Card data-testid="billing-current-plan">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("billing.currentPlan")}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-display font-black text-2xl tracking-[-0.03em]" data-testid="billing-plan-name">
                  {live && sub ? planName(sub.plan) : t("billing.planFree")}
                </span>
                {sub && (
                  <>
                    <Badge variant="secondary">{termName(sub.term)}</Badge>
                    <Badge
                      className={live && !cancelling ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300" : ""}
                      variant={live && !cancelling ? "default" : "outline"}
                      data-testid="billing-status"
                    >
                      {cancelling ? t("billing.status_cancelling") : t(`billing.status_${sub.status}`)}
                    </Badge>
                  </>
                )}
              </div>

              <p className="text-sm text-muted-foreground mt-1" data-testid="billing-plan-note">
                {live && sub && end && !cancelling && (
                  <>{t("billing.renewsOn", { date: fmtDate(end) })} · {sar(priceWithVat(sub.plan, sub.term).total)} <span className="text-xs">({t("billing.inclVat")})</span></>
                )}
                {cancelling && end && t("billing.endsOn", { date: fmtDate(end) })}
                {!live && sub && !paymentProblem && end && t("billing.endedOn", { date: fmtDate(end) })}
                {!live && !sub && t("billing.freeDesc")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {sub && (
                <Button variant="ghost" size="sm" onClick={refreshStatus} disabled={refreshing} data-testid="billing-refresh">
                  <RefreshCw className={`h-4 w-4 me-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  {t("billing.refresh")}
                </Button>
              )}
              {sub && canManage && (
                <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading} data-testid="billing-manage">
                  {portalLoading ? <Loader2 className="h-4 w-4 me-1.5 animate-spin" /> : <ExternalLink className="h-4 w-4 me-1.5" />}
                  {t("billing.updateCard")}
                </Button>
              )}
              {live && canManage && !cancelling && (
                <Button variant="outline" size="sm" onClick={() => setConfirmCancel(true)} disabled={busy !== null} data-testid="billing-cancel">
                  {t("billing.cancelPlan")}
                </Button>
              )}
              {cancelling && canManage && (
                <Button size="sm" onClick={() => changeSubscription("resume")} disabled={busy !== null} data-testid="billing-resume">
                  {busy === "resume" && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
                  {t("billing.resumePlan")}
                </Button>
              )}
            </div>
          </div>

          {paymentProblem && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" data-testid="billing-payment-problem">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{t("billing.paymentProblem")}</p>
            </div>
          )}
          {live && canManage && !cancelling && <p className="text-xs text-muted-foreground">{t("billing.manageBillingDesc")}</p>}
        </CardContent>
      </Card>

      {/* The return from checkout, and the upgrade flow when there's no live plan. */}
      <CheckoutFlow
        returnTo="settings"
        summary={data}
        onSummaryChanged={refetch}
        keepParams={{ tab: "billing" }}
      />

      {/* Invoices */}
      {sub && canManage && (
        <Card data-testid="billing-invoices">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-display font-black text-lg tracking-[-0.02em]">{t("billing.invoices")}</h2>
            {invoicesLoading ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : !invoices || invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("billing.noInvoices")}</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm" data-testid={`invoice-${inv.id}`}>
                    <div className="min-w-0">
                      <p className="font-medium">
                        {inv.createdAt ? fmtDate(inv.createdAt) : "—"}
                        {inv.number != null && <span className="text-muted-foreground font-normal"> · #{inv.number}</span>}
                      </p>
                      {inv.periodStart && inv.periodEnd && (
                        <p className="text-xs text-muted-foreground">{fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {inv.total != null && <span className="font-semibold">{sar(Number(inv.total))}</span>}
                      <Badge variant={inv.status === "paid" ? "default" : "outline"} className={inv.status === "paid" ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300" : ""}>
                        {t(`billing.invoice_${inv.status}`)}
                      </Badge>
                      {inv.url && (
                        <a
                          href={inv.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#FE3C01] hover:underline"
                          data-testid={`invoice-link-${inv.id}`}
                        >
                          {t("billing.viewInvoice")}<ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={(o) => { if (!busy) setConfirmCancel(o); }}>
        <AlertDialogContent data-testid="billing-cancel-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("billing.cancelConfirmTitle", { plan: sub ? planName(sub.plan) : "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {end ? t("billing.cancelConfirmDesc", { date: fmtDate(end) }) : t("billing.cancelConfirmDescNoDate")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null} data-testid="billing-cancel-keep">{t("billing.keepPlan")}</AlertDialogCancel>
            {/* A plain Button, not AlertDialogAction: that would close the dialog before the request finishes. */}
            <Button
              variant="destructive"
              onClick={() => changeSubscription("cancel")}
              disabled={busy !== null}
              data-testid="billing-cancel-confirm"
            >
              {busy === "cancel" && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("billing.confirmCancel")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SettingsBilling;
