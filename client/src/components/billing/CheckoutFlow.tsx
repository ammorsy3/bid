// Pick a plan → confirm billing details → StreamPay checkout → come back.
// Used by Settings → Plans & Billing and by the /upgrade page.
//
// The details step is pre-filled from what Bid already knows; only missing
// fields are shown as inputs, and each one auto-saves while it's typed, so
// nothing is lost if the payer wanders off (and the follow-up email can bring
// them back to exactly where they were).
//
// It also owns the return from StreamPay (?checkout=<id>): confirm with the
// server — which re-reads StreamPay, never trusting the URL — and say plainly
// whether it worked.
//
// URL params it reacts to: plan & term (from /pricing or /upgrade links),
// checkout (StreamPay return, plus StreamPay's own status/message), resume
// (follow-up email).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, Check, CheckCircle2, Loader2, Pencil, ShieldCheck, XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  PAID_PLANS, isBillingTerm, isPaidPlan, monthlyRate, periodPrice, priceWithVat,
  type BillingTerm, type PaidPlan,
} from "@shared/billing-plans";
import {
  REQUIRED_BILLING_FIELDS, billingDetailsPatchSchema, type BillingDetailField,
} from "@shared/billing-details";
import { sar, type BillingDetails as Details, type BillingSummary } from "./shared";

type ReturnState =
  | { kind: "checking" }
  | { kind: "paid"; plan: PaidPlan }
  | { kind: "pending" }
  | { kind: "failed"; reason: string | null };

type FieldStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 700;
const CONFIRM_POLLS = 6;
const CONFIRM_POLL_GAP_MS = 2500;

function stripParams(keep: Record<string, string>) {
  const url = new URL(window.location.href);
  url.search = new URLSearchParams(keep).toString();
  window.history.replaceState(window.history.state, "", url.toString());
}

interface Props {
  /** Which Bid page StreamPay sends the payer back to. */
  returnTo: "settings" | "upgrade";
  summary: BillingSummary;
  /** Refetch /api/billing after something changed server-side. */
  onSummaryChanged: () => void | Promise<unknown>;
  /** URL params to keep when tidying the address bar ({ tab: "billing" } on Settings). */
  keepParams?: Record<string, string>;
  /** Pre-selected plan in the picker. */
  defaultPlan?: PaidPlan;
  /** The page draws its own plan cards (/upgrade), so skip step 1's picker. */
  hidePicker?: boolean;
  /** Open the details step for this plan; a new `key` opens it again. */
  request?: { plan: PaidPlan; term: BillingTerm; key: number } | null;
  /** Which step is showing, so a page with its own plan cards can hide them. */
  onStepChange?: (step: "pick" | "opening" | "details") => void;
}

export function CheckoutFlow({
  returnTo, summary, onSummaryChanged, keepParams = {}, defaultPlan = "business", hidePicker = false, request, onStepChange,
}: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [term, setTerm] = useState<BillingTerm>("monthly");
  const [plan, setPlan] = useState<PaidPlan>(defaultPlan);
  const [checkout, setCheckout] = useState<{ id: string; plan: PaidPlan; term: BillingTerm } | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [opening, setOpening] = useState(false);
  const [paying, setPaying] = useState(false);
  const [returnState, setReturnState] = useState<ReturnState | null>(null);

  const planName = (p: PaidPlan) => t(p === "pro" ? "billing.planPro" : "billing.planBusiness");
  const termName = (x: BillingTerm) => t(x === "yearly" ? "billing.termYearly" : "billing.termMonthly");

  const handleApiError = useCallback((err: unknown) => {
    const code = err instanceof ApiError ? err.code : undefined;
    const description =
      code === "NOT_CONFIGURED" || code === "PRODUCTS_MISSING" ? t("billing.notConfigured")
      : code === "ALREADY_SUBSCRIBED" ? t("billing.alreadySubscribed")
      : code === "DETAILS_MISSING" ? t("billing.detailsMissing")
      : t("billing.genericError");
    toast({ title: t("billing.errorTitle"), description, variant: "destructive" });
    if (code === "ALREADY_SUBSCRIBED") void onSummaryChanged();
  }, [t, toast, onSummaryChanged]);

  const refreshEverything = useCallback(async () => {
    // Plan state changed: the summary, and every lock that reads entitlements.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/entitlements"] }),
    ]);
  }, [queryClient]);

  const openCheckout = useCallback(async (p: PaidPlan, x: BillingTerm) => {
    setOpening(true);
    try {
      const res = await apiRequest("POST", "/api/billing/checkouts", { plan: p, term: x });
      const body = await res.json() as { checkoutId: string; plan: PaidPlan; term: BillingTerm; details: Details };
      setPlan(body.plan);
      setTerm(body.term);
      setDetails(body.details);
      setCheckout({ id: body.checkoutId, plan: body.plan, term: body.term });
    } catch (err) {
      handleApiError(err);
    } finally {
      setOpening(false);
    }
  }, [handleApiError]);

  useEffect(() => {
    if (request) void openCheckout(request.plan, request.term);
    // Only when the page asks again (new key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.key]);

  const step = checkout && details ? "details" : opening ? "opening" : "pick";
  useEffect(() => { onStepChange?.(step); }, [step, onStepChange]);

  // --- URL params: return from StreamPay, resume link, or plan from a link ---
  const handledParams = useRef(false);
  useEffect(() => {
    if (handledParams.current) return;
    handledParams.current = true;
    const params = new URLSearchParams(window.location.search);
    const returnedId = params.get("checkout");
    const resumeId = params.get("resume");
    const wantPlan = params.get("plan");
    const wantTerm = params.get("term");
    const keepReason = params.get("reason");
    const keep = keepReason ? { ...keepParams, reason: keepReason } : keepParams;

    if (returnedId) {
      const hint = { status: params.get("status") ?? undefined, message: params.get("message") ?? undefined };
      stripParams(keep);
      setReturnState({ kind: "checking" });
      void (async () => {
        for (let i = 0; i < CONFIRM_POLLS; i++) {
          try {
            const res = await apiRequest("POST", `/api/billing/checkouts/${encodeURIComponent(returnedId)}/confirm`, hint);
            const body = await res.json() as { status: string; failureReason: string | null; plan: PaidPlan };
            if (body.status === "paid") {
              setReturnState({ kind: "paid", plan: body.plan });
              await refreshEverything();
              return;
            }
            if (body.status === "failed") {
              setReturnState({ kind: "failed", reason: body.failureReason });
              await refreshEverything();
              return;
            }
          } catch {
            // Network hiccup: keep polling; the webhook will settle it anyway.
          }
          await new Promise((r) => setTimeout(r, CONFIRM_POLL_GAP_MS));
        }
        setReturnState({ kind: "pending" });
        await refreshEverything();
      })();
      return;
    }

    if (summary.subscription?.live || !summary.canManage) {
      if (resumeId || wantPlan) stripParams(keep);
      return;
    }

    if (resumeId && summary.openCheckout?.id === resumeId) {
      stripParams(keep);
      void openCheckout(summary.openCheckout.plan, summary.openCheckout.term);
      return;
    }
    if (isPaidPlan(wantPlan)) {
      stripParams(keep);
      const x = isBillingTerm(wantTerm) ? wantTerm : "monthly";
      setPlan(wantPlan);
      setTerm(x);
      void openCheckout(wantPlan, x);
    } else if (resumeId) {
      stripParams(keep);
    }
    // Runs once, on first render with the summary in hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- details step: which fields are inputs, and their auto-save ----------
  // Decided once when the step opens, so a field doesn't jump from input to
  // summary the moment it saves.
  const [inputFields, setInputFields] = useState<BillingDetailField[]>([]);
  const [values, setValues] = useState<Partial<Record<BillingDetailField, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<BillingDetailField, boolean>>>({});
  const [status, setStatus] = useState<Partial<Record<BillingDetailField, FieldStatus>>>({});
  const timers = useRef<Partial<Record<BillingDetailField, ReturnType<typeof setTimeout>>>>({});
  const inflight = useRef(new Set<Promise<unknown>>());

  useEffect(() => {
    if (!checkout || !details) return;
    setInputFields(details.missing);
    setValues(Object.fromEntries(details.applicable.map((f) => [f, details.values[f] ?? ""])));
    setTouched({});
    setStatus({});
    // Only when a new checkout opens — not on every details refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout?.id]);

  const fieldError = (f: BillingDetailField): string | null => {
    const v = values[f] ?? "";
    if (!v.trim()) return REQUIRED_BILLING_FIELDS.includes(f) ? "required" : null;
    const r = billingDetailsPatchSchema.safeParse({ [f]: v });
    return r.success ? null : r.error.issues[0]?.message ?? "invalid";
  };

  const saveField = useCallback((f: BillingDetailField, value: string) => {
    if (!checkout) return;
    const parsed = billingDetailsPatchSchema.safeParse({ [f]: value });
    if (!parsed.success) return; // shown inline; never saved
    setStatus((s) => ({ ...s, [f]: "saving" }));
    const p = apiRequest("PATCH", "/api/billing/details", { checkoutId: checkout.id, [f]: value })
      .then((r) => r.json())
      .then((body: { details: Details }) => {
        setDetails(body.details);
        setStatus((s) => ({ ...s, [f]: "saved" }));
      })
      .catch(() => setStatus((s) => ({ ...s, [f]: "error" })))
      .finally(() => inflight.current.delete(p));
    inflight.current.add(p);
  }, [checkout]);

  const onFieldChange = (f: BillingDetailField, value: string) => {
    setValues((v) => ({ ...v, [f]: value }));
    setStatus((s) => ({ ...s, [f]: "idle" }));
    clearTimeout(timers.current[f]);
    timers.current[f] = setTimeout(() => saveField(f, value), AUTOSAVE_DELAY_MS);
  };

  const onFieldBlur = (f: BillingDetailField) => {
    setTouched((x) => ({ ...x, [f]: true }));
    if (timers.current[f]) {
      clearTimeout(timers.current[f]);
      timers.current[f] = undefined;
      saveField(f, values[f] ?? "");
    }
  };

  useEffect(() => () => Object.values(timers.current).forEach((id) => clearTimeout(id)), []);

  const blocking = useMemo(() => {
    if (!details) return true;
    return details.applicable.some((f) => inputFields.includes(f) && fieldError(f) !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details, inputFields, values]);

  const pay = async () => {
    if (!checkout) return;
    setPaying(true);
    try {
      // Flush anything still waiting on the debounce, then wait for saves.
      for (const f of Object.keys(timers.current) as BillingDetailField[]) {
        if (timers.current[f]) {
          clearTimeout(timers.current[f]);
          timers.current[f] = undefined;
          saveField(f, values[f] ?? "");
        }
      }
      await Promise.allSettled([...inflight.current]);
      const res = await apiRequest("POST", `/api/billing/checkouts/${encodeURIComponent(checkout.id)}/pay`, { returnTo });
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (err) {
      handleApiError(err);
      setPaying(false);
    }
  };

  const live = !!summary.subscription?.live;

  return (
    <div className="space-y-6" data-testid="checkout-flow">
      {returnState && (
        <ReturnBanner
          state={returnState}
          planName={planName}
          onRetry={() => {
            setReturnState(null);
            if (summary.openCheckout) void openCheckout(summary.openCheckout.plan, summary.openCheckout.term);
          }}
        />
      )}

      {!live && !summary.canManage && (
        <p className="text-sm text-muted-foreground" data-testid="billing-only-admins">{t("billing.onlyAdmins")}</p>
      )}

      {/* Step 1 — pick a plan */}
      {!live && summary.canManage && !checkout && !hidePicker && (
        <Card data-testid="billing-plan-picker">
          <CardContent className="p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display font-black text-lg tracking-[-0.02em]">{t("billing.choosePlan")}</h2>
              <TermToggle term={term} onChange={setTerm} t={t} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("billing.choosePlan")}>
              {PAID_PLANS.map((p) => {
                const selected = plan === p;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPlan(p)}
                    className={`text-start rounded-xl border-2 p-4 transition-colors ${
                      selected ? "border-[#FE3C01] bg-[#FE3C01]/5" : "border-border hover:border-foreground/30"
                    }`}
                    data-testid={`billing-plan-${p}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{planName(p)}</span>
                      <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${selected ? "border-[#FE3C01]" : "border-muted-foreground/40"}`}>
                        {selected && <span className="h-2 w-2 rounded-full bg-[#FE3C01]" />}
                      </span>
                    </div>
                    <div className="mt-2 text-xl font-bold">
                      {sar(monthlyRate(p, term))}
                      <span className="text-sm font-normal text-muted-foreground"> {t("billing.perMonth")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {term === "yearly"
                        ? <>{sar(periodPrice(p, term))} {t("billing.billedYearly")} · {t("billing.plusVat")}</>
                        : t("billing.plusVat")}
                    </p>
                  </button>
                );
              })}
            </div>

            <PriceBreakdown plan={plan} term={term} t={t} />

            <Button
              className="w-full sm:w-auto bg-[#FE3C01] hover:bg-[#FE3C01]/90 text-white"
              onClick={() => openCheckout(plan, term)}
              disabled={opening}
              data-testid="billing-continue"
            >
              {opening && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("billing.upgradeTo", { plan: planName(plan) })}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — billing details (auto-saved), then pay */}
      {!live && summary.canManage && checkout && details && (
        <Card data-testid="billing-details-step">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display font-black text-lg tracking-[-0.02em]">{t("billing.detailsTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {inputFields.length === 0 ? t("billing.detailsAllSet") : t("billing.detailsDesc")}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCheckout(null)} data-testid="billing-change-plan">
                {t("billing.changePlan")}
              </Button>
            </div>

            <div className="rounded-xl border divide-y">
              {details.applicable.map((f) => {
                const isInput = inputFields.includes(f);
                const label = t(`billing.field_${f}${f === "billingName" && details.applicable.includes("crNumber") ? "Company" : ""}`);
                const optional = !REQUIRED_BILLING_FIELDS.includes(f);

                if (!isInput) {
                  const src = details.sources[f];
                  return (
                    <div key={f} className="flex items-center justify-between gap-3 px-4 py-3" data-testid={`billing-summary-${f}`}>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium truncate" dir={f === "billingName" || f === "address" || f === "city" ? undefined : "ltr"} style={{ textAlign: "start" }}>
                          {details.values[f]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {src && <span className="hidden sm:inline text-[11px] text-muted-foreground">{t(`billing.from_${src}`)}</span>}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setInputFields((x) => [...x, f])}
                          aria-label={`${t("billing.edit")} — ${label}`}
                          data-testid={`billing-edit-${f}`}
                        >
                          <Pencil className="h-3.5 w-3.5 sm:me-1" />
                          <span className="hidden sm:inline">{t("billing.edit")}</span>
                        </Button>
                      </div>
                    </div>
                  );
                }

                const err = fieldError(f);
                const showErr = touched[f] && err;
                const st = status[f];
                const isTextField = f === "billingName" || f === "address" || f === "city";
                return (
                  <div key={f} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`billing-${f}`} className="text-sm">
                        {label}
                        {optional && <span className="text-muted-foreground font-normal"> · {t("billing.optional")}</span>}
                      </Label>
                      <span className="text-xs text-muted-foreground h-4 flex items-center gap-1" aria-live="polite">
                        {st === "saving" && <><Loader2 className="h-3 w-3 animate-spin" />{t("billing.saving")}</>}
                        {st === "saved" && <><Check className="h-3 w-3 text-green-600" />{t("billing.saved")}</>}
                        {st === "error" && <span className="text-destructive">{t("billing.saveFailed")}</span>}
                      </span>
                    </div>
                    <Input
                      id={`billing-${f}`}
                      value={values[f] ?? ""}
                      onChange={(e) => onFieldChange(f, e.target.value)}
                      onBlur={() => onFieldBlur(f)}
                      placeholder={t(`billing.ph_${f}`)}
                      inputMode={f === "billingPhone" ? "tel" : f === "vatNumber" || f === "crNumber" ? "numeric" : f === "billingEmail" ? "email" : undefined}
                      type={f === "billingEmail" ? "email" : "text"}
                      autoComplete={f === "billingEmail" ? "email" : f === "billingPhone" ? "tel" : f === "billingName" ? "organization" : f === "address" ? "street-address" : f === "city" ? "address-level2" : "off"}
                      dir={isTextField ? undefined : "ltr"}
                      className={`${isTextField ? "" : "text-start"} ${showErr ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      aria-invalid={!!showErr}
                      aria-describedby={showErr ? `billing-${f}-err` : undefined}
                      data-testid={`billing-input-${f}`}
                    />
                    {showErr ? (
                      <p id={`billing-${f}-err`} className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />{t(`billing.err_${err}`)}
                      </p>
                    ) : f === "vatNumber" || f === "address" ? (
                      <p className="text-xs text-muted-foreground">{t(f === "address" ? "billing.addressHint" : "billing.vatHint")}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* A company that leaves the address or city empty is invoiced as an
                individual (no VAT / CR on the invoice), so say so before it pays. */}
            {details.applicable.includes("crNumber") && (!(values.address ?? "").trim() || !(values.city ?? "").trim()) && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" data-testid="billing-invoice-notice">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <p>{t("billing.invoiceNotice")}</p>
              </div>
            )}

            <PriceBreakdown plan={checkout.plan} term={checkout.term} t={t} planName={planName} termName={termName} />

            <div className="space-y-3">
              <Button
                className="w-full bg-[#FE3C01] hover:bg-[#FE3C01]/90 text-white h-11"
                onClick={pay}
                disabled={paying || blocking}
                data-testid="billing-pay"
              >
                {paying ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("billing.redirecting")}</> : t("billing.continueToPayment")}
              </Button>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {t("billing.securedBy")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TermToggle({ term, onChange, t }: { term: BillingTerm; onChange: (x: BillingTerm) => void; t: (k: string) => string }) {
  return (
    <div className="inline-flex rounded-full border p-1 text-sm" role="radiogroup" aria-label={t("billing.billingTerm")}>
      {(["monthly", "yearly"] as const).map((x) => (
        <button
          key={x}
          type="button"
          role="radio"
          aria-checked={term === x}
          onClick={() => onChange(x)}
          className={`rounded-full px-3 py-1 transition-colors ${term === x ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          data-testid={`billing-term-${x}`}
        >
          {t(x === "yearly" ? "billing.termYearly" : "billing.termMonthly")}
          {x === "yearly" && <span className={`ms-1.5 text-[11px] font-semibold ${term === x ? "" : "text-green-600"}`}>{t("billing.save20")}</span>}
        </button>
      ))}
    </div>
  );
}

function PriceBreakdown({
  plan, term, t, planName, termName,
}: {
  plan: PaidPlan;
  term: BillingTerm;
  t: (k: string, v?: Record<string, string | number>) => string;
  planName?: (p: PaidPlan) => string;
  termName?: (x: BillingTerm) => string;
}) {
  const { subtotal, vat, total } = priceWithVat(plan, term);
  return (
    <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-2" data-testid="billing-breakdown">
      {planName && termName && (
        <div className="flex justify-between gap-3 font-medium">
          <span>{planName(plan)} · {termName(term)}</span>
          <span>{sar(subtotal)}</span>
        </div>
      )}
      {!planName && (
        <div className="flex justify-between gap-3 text-muted-foreground">
          <span>{t("billing.subtotal")}</span>
          <span>{sar(subtotal)}</span>
        </div>
      )}
      <div className="flex justify-between gap-3 text-muted-foreground">
        <span>{t("billing.vat")}</span>
        <span>{sar(vat)}</span>
      </div>
      <div className="flex justify-between gap-3 border-t pt-2 font-semibold">
        <span>{t("billing.totalToday")}</span>
        <span>{sar(total)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t(term === "yearly" ? "billing.renewsYearly" : "billing.renewsMonthly")}</p>
    </div>
  );
}

function ReturnBanner({ state, planName, onRetry }: { state: ReturnState; planName: (p: PaidPlan) => string; onRetry: () => void }) {
  const { t } = useI18n();
  const tone =
    state.kind === "paid" ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200"
    : state.kind === "failed" ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
    : "border-border bg-muted/50";
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${tone}`} role="status" data-testid={`billing-return-${state.kind}`}>
      {state.kind === "checking" && <Loader2 className="h-5 w-5 animate-spin shrink-0 mt-0.5" />}
      {state.kind === "paid" && <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />}
      {state.kind === "pending" && <Loader2 className="h-5 w-5 shrink-0 mt-0.5" />}
      {state.kind === "failed" && <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {state.kind === "checking" && t("billing.returnChecking")}
          {state.kind === "paid" && t("billing.returnSuccessTitle", { plan: planName(state.plan) })}
          {state.kind === "pending" && t("billing.returnPendingTitle")}
          {state.kind === "failed" && t("billing.returnFailedTitle")}
        </p>
        {state.kind !== "checking" && (
          <p className="text-sm mt-0.5 opacity-90">
            {state.kind === "paid" && t("billing.returnSuccessDesc")}
            {state.kind === "pending" && t("billing.returnPendingDesc")}
            {state.kind === "failed" && t("billing.returnFailedDesc")}
          </p>
        )}
        {state.kind === "failed" && state.reason && (
          <p className="text-xs mt-1 opacity-75" dir="auto">{t("billing.reasonLabel", { reason: state.reason })}</p>
        )}
        {state.kind === "failed" && (
          <Button size="sm" variant="outline" className="mt-3" onClick={onRetry} data-testid="billing-retry">{t("billing.tryAgain")}</Button>
        )}
      </div>
    </div>
  );
}

export default CheckoutFlow;
