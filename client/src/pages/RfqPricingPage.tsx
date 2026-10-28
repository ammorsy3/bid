// Vendor pricing for an itemized request (RFQ brief §6–§7, decisions P1 Policy
// A, P2, P4/A3, P5). Requester item details are read-only; the vendor answers
// every item — a priced original (optionally with an alternative) or "Original
// Item Unavailable" with a priced replacement and a reason. Totals shown here
// use the same shared arithmetic as the server, which recomputes them on submit.
// The draft is shared by the company's members and saved with a version check.

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, Info, Loader2, Lock, Paperclip, RefreshCw, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { ApiError } from "@/lib/queryClient";
import { uploadObject } from "@/lib/upload-object";
import { BoqImage } from "@/components/boq/BoqImage";
import { UNIT_LABELS_AR } from "@/components/ui/smart-unit-dropdown";
import type { ItemColumn } from "@shared/boq-items";
import { priceOffer, type ItemResponseInput, type ResponseIssue, type AlternativeInput } from "@shared/rfq-pricing";
import { groupMoney, lineTotal, moneyErrorMessage, parseBoqQuantity, parsePrice } from "@shared/boq-money";
import { PROCUREMENT_VAT_RATE_BP } from "@shared/procurement-tax";
import { documentProblem, type PricingPayload } from "@shared/rfq-offer";
import { DraftSync, DraftConflictError, type SyncState } from "@/lib/draft-sync";

interface PricingItem {
  id: string;
  position: number;
  name: string;
  description: string | null;
  unit: string;
  quantity: string;
  imageUrl: string | null;
  referenceUnitPrice?: string | null;
  customValues: Record<string, string | null>;
}

interface PricingData {
  tender: { id: string; title: string; status: string; deadline: string; requestType: string; submissionType: string | null; videoRequired: boolean | null; itemsRevision: number; currency: string };
  columns: ItemColumn[];
  optional: { description: boolean; image: boolean; referenceUnitPrice: boolean };
  items: PricingItem[];
  draft: { version: number; itemsRevision: number; payload: PricingPayload; updatedAt: string } | null;
  /** The last submitted offer, when the requester reopened it and no newer draft exists (PB-6). */
  prefill?: PricingPayload | null;
  offer: { id: string; status: string; resubmissionAllowed: boolean; submittedAt: string; pricingTotal: string | null } | null;
  readOnlyReason: string | null;
}

type Docs = NonNullable<PricingPayload["documents"]>;

const emptyPayload = (): PricingPayload => ({ responses: [], tax: { applyVat: true, mixedTreatment: false }, notes: "", documents: {} });

async function api(method: string, url: string, invite: string | null, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(invite ? { "X-Invitation-Token": invite } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.message || res.statusText, res.status, json.code, json);
  return json;
}

const submissionKeyFor = (tenderId: string) => {
  const k = `rfq-submission-key:${tenderId}`;
  try {
    const existing = sessionStorage.getItem(k);
    if (existing) return existing;
    const fresh = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, "");
    sessionStorage.setItem(k, fresh);
    return fresh;
  } catch {
    return `${Date.now()}${Math.random()}`.replace(/[^A-Za-z0-9_-]/g, "");
  }
};

export default function RfqPricingPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t, isRtl } = useI18n();
  const { toast } = useToast();
  const invite = useMemo(() => new URLSearchParams(window.location.search).get("invite"), []);

  const { data, isLoading, error, refetch } = useQuery<PricingData>({
    queryKey: ["/api/tenders", id, "pricing"],
    queryFn: () => api("GET", `/api/tenders/${id}/pricing`, invite),
    retry: false,
  });

  const [payload, setPayload] = useState<PricingPayload>(emptyPayload);
  // Draft saving is coordinated by DraftSync (PB-2/PB-3): saves never overlap,
  // edits made during a save stay unsaved, and a conflict blocks saving and
  // submitting until the latest draft is reloaded.
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle", dirty: false, version: null });
  const syncRef = useRef<DraftSync<PricingPayload> | null>(null);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const dirty = syncState.dirty;
  const saving = syncState.status;
  const conflict = syncState.status === "conflict";
  const markEdited = () => syncRef.current?.edit();
  const [showErrors, setShowErrors] = useState(false);
  const [review, setReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ total: string | null } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const loadedFor = useRef<string | null>(null);

  // Load the shared draft once per fetch.
  useEffect(() => {
    if (!data) return;
    const key = `${data.tender.id}:${data.draft?.version ?? 0}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    // PB-6: with no shared draft, a reopened offer starts from what was submitted.
    const initial = data.draft?.payload ?? data.prefill ?? emptyPayload();
    payloadRef.current = initial;
    setPayload(initial);
    const tenderId = data.tender.id;
    const revision = data.tender.itemsRevision;
    syncRef.current = new DraftSync<PricingPayload>(
      async (body, baseVersion) => {
        try {
          const r = await api("PUT", `/api/tenders/${tenderId}/pricing-draft`, invite, { baseVersion, itemsRevision: revision, payload: body });
          return { version: r.draft.version };
        } catch (e) {
          if (e instanceof ApiError && e.code === "DRAFT_CONFLICT") throw new DraftConflictError();
          throw e;
        }
      },
      () => payloadRef.current,
      data.draft?.version ?? null,
      setSyncState,
    );
    setSyncState(syncRef.current.state);
    // A restored submission becomes the shared draft on the first save (never over a newer one).
    if (!data.draft && data.prefill && !data.readOnlyReason) syncRef.current.edit();
  }, [data, invite]);

  const readOnly = !!data?.readOnlyReason;
  const items = data?.items ?? [];
  const byId = useMemo(() => new Map(payload.responses.map((r) => [r.itemId, r])), [payload.responses]);
  const result = useMemo(() => priceOffer(items, payload.responses, payload.tax, { final: true }), [items, payload]);
  const issuesFor = (itemId: string) => result.issues.filter((i) => "itemId" in i && i.itemId === itemId);

  const setResponse = (itemId: string, patch: Partial<ItemResponseInput>) => {
    // An item being edited stays open; it must not fold away once it becomes valid.
    setOpen((o) => (itemId in o ? o : { ...o, [itemId]: true }));
    setPayload((p) => {
      const existing = p.responses.find((r) => r.itemId === itemId) ?? { itemId };
      const next = { ...existing, ...patch };
      return { ...p, responses: [...p.responses.filter((r) => r.itemId !== itemId), next].sort((a, b) => items.findIndex((i) => i.id === a.itemId) - items.findIndex((i) => i.id === b.itemId)) };
    });
    markEdited();
  };
  const setAlt = (itemId: string, patch: Partial<AlternativeInput>) =>
    setResponse(itemId, { alternative: { ...(byId.get(itemId)?.alternative ?? {}), ...patch } });

  // ── Saving (explicit, and quietly after a pause) ─────────────────────────────
  const save = async (quiet = false) => {
    if (!data || readOnly || !syncRef.current) return true;
    const ok = await syncRef.current.flush();
    if (!quiet) {
      if (ok) toast({ title: t("pricingPage.saved") });
      else if (syncRef.current.state.status !== "conflict") toast({ title: t("pricingPage.saveFailed"), variant: "destructive" });
    }
    return ok;
  };
  useEffect(() => {
    if (!dirty || readOnly || conflict) return;
    const timer = window.setTimeout(() => { void save(true); }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, dirty, readOnly, conflict]);

  const reloadLatest = async () => {
    loadedFor.current = null;
    await refetch();
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const docProblem = data ? documentProblem(data.tender.submissionType, data.tender.videoRequired, payload.documents) : null;
  const canSubmit = result.complete && !docProblem && !readOnly;

  const startReview = () => {
    if (!canSubmit) {
      setShowErrors(true);
      const firstItem = result.issues.find((i): i is ResponseIssue & { itemId: string } => "itemId" in i)?.itemId;
      if (firstItem) setOpen((o) => ({ ...o, [firstItem]: true }));
      requestAnimationFrame(() => (document.querySelector<HTMLElement>(`[data-item-id="${firstItem}"] [aria-invalid="true"], [data-item-id="${firstItem}"] button, [data-testid="pricing-blocked"]`))?.focus());
      return;
    }
    setReview(true);
  };
  const submit = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      // PB-2: submit only what the server holds. A failed or conflicting save stops here.
      const sync = syncRef.current!;
      if (!(await sync.flush())) {
        setReview(false);
        toast({ title: t("pricingPage.submitFailed"), description: t(sync.state.status === "conflict" ? "draft.concurrentUpdate" : "pricingPage.saveFailed"), variant: "destructive" });
        return;
      }
      const r = await api("POST", `/api/tenders/${id}/itemized-offers`, invite, {
        ...payloadRef.current, submissionKey: submissionKeyFor(data.tender.id), itemsRevision: data.tender.itemsRevision,
        draftVersion: sync.state.version,
      });
      try { sessionStorage.removeItem(`rfq-submission-key:${data.tender.id}`); } catch {}
      setReview(false);
      setSubmitted({ total: r.offer.pricingTotal });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      toast({ title: t("pricingPage.submitFailed"), description: code ? t(`pricingPage.err_${code}`, {}) || (e as Error).message : (e as Error).message, variant: "destructive" });
      if (code === "STALE_REVISION") await reloadLatest();
      if (code === "DRAFT_CONFLICT") { setReview(false); syncRef.current?.markConflict(); }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex min-h-[60dvh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#FE3C01]" aria-label={t("common.loading")} /></div>;
  if (error || !data) {
    const code = error instanceof ApiError ? error.code : undefined;
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center" data-testid="pricing-unavailable">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
        <p className="mt-4 text-foreground">{code ? t(`pricingPage.err_${code}`) : t("pricingPage.loadFailed")}</p>
        <Button className="mt-6 min-h-11" variant="outline" onClick={() => navigate(`/tenders/${id}`)}>{t("pricingPage.backToRequest")}</Button>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center" data-testid="pricing-submitted">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t("pricingPage.submittedTitle")}</h1>
        {submitted.total && <p className="mt-2 text-muted-foreground">{t("pricing.submittedTotal")}: <bdi dir="ltr" className="font-semibold tabular-nums">SAR {groupMoney(BigInt(submitted.total.replace(".", "")))}</bdi></p>}
        <Button className="mt-6 min-h-11" onClick={() => navigate(`/tenders/${id}`)}>{t("pricingPage.backToRequest")}</Button>
      </main>
    );
  }

  const unitLabel = (u: string) => (isRtl ? UNIT_LABELS_AR[u] ?? u : u);
  const sar = (v: bigint | null) => (v === null ? "—" : `SAR ${groupMoney(v)}`);
  const issueText = (i: ResponseIssue): string => {
    switch (i.code) {
      case "PRICE_INVALID": { const m = moneyErrorMessage("price", i.error); return t(m.key, m.vars); }
      case "ALT_QUANTITY_INVALID": { const m = moneyErrorMessage("quantity", i.error); return t(m.key, m.vars); }
      case "ALT_REASON_REQUIRED": return t("alternative.reasonRequired");
      case "ALT_FIELD_REQUIRED": return t(`pricingPage.altRequired_${i.field}`);
      case "REPLACEMENT_REQUIRED": return t("pricingPage.replacementRequired");
      case "MISSING_RESPONSE": case "STATE_REQUIRED": return t("pricingPage.responseRequired");
      default: return t("pricing.incomplete");
    }
  };
  const priceValueLine = (qty: string, price: string | null | undefined) => {
    const q = parseBoqQuantity(qty, true); const p = parsePrice(price ?? null, true);
    if (!q.ok || !p.ok) return null;
    try { return lineTotal(q.scaled, p.scaled); } catch { return null; }
  };
  const readOnlyText = data.readOnlyReason ? t(data.readOnlyReason === "REQUEST_CANCELLED" ? "request.cancelledReadOnly" : `pricingPage.ro_${data.readOnlyReason}`) : null;
  const completed = result.completedCount;
  const decimalField = "w-full min-h-11 rounded-md border bg-background px-3 text-sm text-end tabular-nums";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-40 md:pb-28" data-testid="rfq-pricing-page">
      <Button variant="ghost" className="-ms-2 mb-4 min-h-11" onClick={() => navigate(`/tenders/${id}`)}>
        <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" aria-hidden="true" />{t("pricingPage.backToRequest")}
      </Button>
      <header className="mb-5">
        <p className="text-sm font-semibold text-[#FE3C01]">{t("pricing.title")}</p>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground break-words">{data.tender.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite" data-testid="pricing-progress">
          {t("pricing.progress", { completed, total: items.length })}
        </p>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
          <div className="h-full bg-[#FE3C01] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${items.length ? (completed / items.length) * 100 : 0}%` }} />
        </div>
      </header>

      {readOnlyText && (
        <div role="note" className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200" data-testid="pricing-readonly">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" /><p>{readOnlyText}{data.readOnlyReason === "VENDOR_REGISTRATION_REQUIRED" && (
            <> <a href="/settings/offerings" className="underline font-medium" data-testid="link-complete-registration">{t("offerings.promptAction")}</a></>
          )}</p>
        </div>
      )}
      {conflict && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200" data-testid="pricing-conflict">
          <p>{t("draft.concurrentUpdate")}</p>
          <Button variant="outline" className="min-h-11" onClick={reloadLatest} data-testid="pricing-reload"><RefreshCw className="h-4 w-4 me-2" aria-hidden="true" />{t("pricingPage.reloadLatest")}</Button>
        </div>
      )}

      {/* Tax (uniform, vendor-declared; A3) */}
      <section className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3" aria-labelledby="tax-heading">
        <h2 id="tax-heading" className="font-semibold text-foreground">{t("pricing.vat")}</h2>
        <p className="text-sm text-muted-foreground flex items-start gap-2"><Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />{t("tax.excludingVatHint")}</p>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="tax-apply">{t("tax.applyVat")}</Label>
          <Switch id="tax-apply" checked={payload.tax.applyVat} disabled={readOnly} onCheckedChange={(v) => { setPayload((p) => ({ ...p, tax: { ...p.tax, applyVat: v } })); markEdited(); }} data-testid="tax-apply" />
        </div>
        <p className="text-sm text-muted-foreground" data-testid="tax-rate">
          {payload.tax.applyVat ? <>{t("tax.rate")}: <bdi dir="ltr">{PROCUREMENT_VAT_RATE_BP / 100}%</bdi></> : t("tax.notApplied")}
        </p>
        <label className="flex items-start gap-3 min-h-11 cursor-pointer">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[#FE3C01]" checked={payload.tax.mixedTreatment} disabled={readOnly}
            onChange={(e) => { const v = e.target.checked; setPayload((p) => ({ ...p, tax: { ...p.tax, mixedTreatment: v } })); markEdited(); }} data-testid="tax-mixed" />
          <span className="text-sm">{t("tax.hasMixedTreatment")}</span>
        </label>
        {payload.tax.mixedTreatment && (
          <p role="alert" tabIndex={-1} className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200" data-testid="pricing-blocked">{t("tax.mixedTreatmentBlocked")}</p>
        )}
      </section>

      {/* Items */}
      <ol className="space-y-3" aria-label={t("boq.title")}>
        {items.map((item, index) => {
          const r = byId.get(item.id);
          const state = r?.state ?? null;
          const issues = showErrors ? issuesFor(item.id) : [];
          const answered = result.lines.some((l) => l.itemId === item.id);
          const isOpen = open[item.id] ?? (!answered || issues.length > 0);
          const originalLine = state === "priced" ? priceValueLine(item.quantity, r?.unitPrice) : null;
          const alt = r?.alternative ?? null;
          const altLine = alt ? priceValueLine(alt.quantity ?? "", alt.unitPrice) : null;
          const fieldErr = (field: string) => issues.find((i) => ("field" in i && i.field === field) || (field === "reason" && i.code === "ALT_REASON_REQUIRED") || (field === "quantity" && i.code === "ALT_QUANTITY_INVALID"));
          const showAlt = state === "unavailable" || !!alt;
          return (
            <li key={item.id} data-item-id={item.id} className={`rounded-xl border bg-card ${issues.length ? "border-red-400" : answered ? "border-green-300 dark:border-green-800" : "border-border"}`} data-testid={`pricing-item-${index + 1}`}>
              <button type="button" className="flex w-full items-start gap-3 p-4 text-start min-h-11" aria-expanded={isOpen} aria-controls={`item-panel-${item.id}`} onClick={() => setOpen((o) => ({ ...o, [item.id]: !isOpen }))}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${answered ? "bg-green-600 text-white" : "bg-muted"}`}>
                  {answered ? <Check className="h-4 w-4" aria-label={t("pricingPage.itemDone")} /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground break-words">{item.name}</span>
                  <span className="block text-sm text-muted-foreground"><bdi dir="ltr">{item.quantity}</bdi> {unitLabel(item.unit)}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground"><bdi dir="ltr">{state === "unavailable" ? sar(altLine) : sar(originalLine)}</bdi></span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <div id={`item-panel-${item.id}`} hidden={!isOpen} className="border-t border-border p-4 space-y-4">
                {/* Requester's item, read-only */}
                <div className="flex gap-3">
                  {item.imageUrl && <BoqImage path={item.imageUrl} alt={item.name} invitationToken={invite} className="h-16 w-16" />}
                  <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm min-w-0">
                    {item.description && <><dt className="text-muted-foreground">{t("boq.description")}</dt><dd className="break-words whitespace-pre-line">{item.description}</dd></>}
                    {data.optional.referenceUnitPrice && item.referenceUnitPrice && <><dt className="text-muted-foreground">{t("boq.referencePrice")}</dt><dd><bdi dir="ltr">{item.referenceUnitPrice}</bdi></dd></>}
                    {data.columns.map((c) => item.customValues[c.id] ? <div key={c.id} className="contents"><dt className="text-muted-foreground break-words">{c.label}</dt><dd className="break-words">{item.customValues[c.id]}</dd></div> : null)}
                  </dl>
                </div>

                <fieldset disabled={readOnly} className="space-y-3">
                  <legend className="sr-only">{item.name}</legend>
                  <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={item.name}>
                    {(["priced", "unavailable"] as const).map((s) => (
                      <button key={s} type="button" role="radio" aria-checked={state === s}
                        onClick={() => setResponse(item.id, s === "priced" ? { state: s } : { state: s, unitPrice: null, alternative: { ...(alt ?? {}) } })}
                        className={`min-h-11 rounded-lg border-2 px-3 py-2 text-sm font-medium text-start ${state === s ? "border-[#FE3C01] bg-[#FE3C01]/5 text-foreground" : "border-border text-muted-foreground"}`}
                        data-testid={`pricing-state-${s}-${index + 1}`}>
                        {s === "priced" ? t("pricingPage.priceOriginal") : t("alternative.originalUnavailable")}
                      </button>
                    ))}
                  </div>
                  {issues.some((i) => i.code === "MISSING_RESPONSE" || i.code === "STATE_REQUIRED") && <p className="text-xs text-red-600" role="alert">{t("pricingPage.responseRequired")}</p>}

                  {state === "priced" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`price-${item.id}`}>{t("pricing.unitPrice")} <span className="text-xs text-muted-foreground">(SAR)</span></Label>
                        <input id={`price-${item.id}`} type="text" inputMode="decimal" dir="ltr" value={r?.unitPrice ?? ""}
                          onChange={(e) => setResponse(item.id, { unitPrice: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                          aria-invalid={!!fieldErr("unitPrice") || undefined} className={`${decimalField} ${fieldErr("unitPrice") ? "border-red-500" : "border-input"}`} data-testid={`pricing-price-${index + 1}`} />
                        {fieldErr("unitPrice") && <p className="mt-1 text-xs text-red-600" role="alert">{issueText(fieldErr("unitPrice")!)}</p>}
                      </div>
                      <div>
                        <span className="block text-sm font-medium">{t("pricing.itemTotal")}</span>
                        <p className="mt-1 min-h-11 flex items-center justify-end rounded-md bg-muted px-3 text-sm font-semibold tabular-nums" aria-live="polite" data-testid={`pricing-line-${index + 1}`}><bdi dir="ltr">{sar(originalLine)}</bdi></p>
                      </div>
                    </div>
                  )}

                  {state === "priced" && !alt && (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setResponse(item.id, { alternative: { quantity: item.quantity, unit: item.unit } })} data-testid={`pricing-propose-${index + 1}`}>
                      {t("alternative.propose")}
                    </Button>
                  )}

                  {showAlt && (
                    <div className="rounded-lg border-2 border-dashed border-amber-400 p-3 space-y-3" data-testid={`pricing-alt-${index + 1}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm">{state === "unavailable" ? t("alternative.replacement") : t("alternative.proposed")}</p>
                        {state === "priced" && <Button type="button" variant="ghost" className="min-h-11 text-red-600" onClick={() => setResponse(item.id, { alternative: null })}>{t("alternative.remove")}</Button>}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(["name", "unit"] as const).map((f) => (
                          <div key={f}>
                            <Label htmlFor={`alt-${f}-${item.id}`}>{t(f === "name" ? "boq.itemName" : "boq.unit")} *</Label>
                            <input id={`alt-${f}-${item.id}`} dir="auto" value={alt?.[f] ?? ""} onChange={(e) => setAlt(item.id, { [f]: e.target.value })}
                              aria-invalid={!!fieldErr(f) || undefined} className={`w-full min-h-11 rounded-md border bg-background px-3 text-sm ${fieldErr(f) ? "border-red-500" : "border-input"}`} data-testid={`alt-${f}-${index + 1}`} />
                            {fieldErr(f) && <p className="mt-1 text-xs text-red-600" role="alert">{issueText(fieldErr(f)!)}</p>}
                          </div>
                        ))}
                        <div>
                          <Label htmlFor={`alt-qty-${item.id}`}>{t("boq.quantity")} *</Label>
                          <input id={`alt-qty-${item.id}`} type="text" inputMode="decimal" dir="ltr" value={alt?.quantity ?? ""} onChange={(e) => setAlt(item.id, { quantity: e.target.value })}
                            aria-invalid={!!fieldErr("quantity") || undefined} className={`${decimalField} ${fieldErr("quantity") ? "border-red-500" : "border-input"}`} data-testid={`alt-quantity-${index + 1}`} />
                          {fieldErr("quantity") && <p className="mt-1 text-xs text-red-600" role="alert">{issueText(fieldErr("quantity")!)}</p>}
                        </div>
                        <div>
                          <Label htmlFor={`alt-price-${item.id}`}>{t("pricing.unitPrice")} *</Label>
                          <input id={`alt-price-${item.id}`} type="text" inputMode="decimal" dir="ltr" value={alt?.unitPrice ?? ""} onChange={(e) => setAlt(item.id, { unitPrice: e.target.value })}
                            aria-invalid={!!fieldErr("alternative.unitPrice") || undefined} className={`${decimalField} ${fieldErr("alternative.unitPrice") ? "border-red-500" : "border-input"}`} data-testid={`alt-price-${index + 1}`} />
                          {fieldErr("alternative.unitPrice") && <p className="mt-1 text-xs text-red-600" role="alert">{issueText(fieldErr("alternative.unitPrice")!)}</p>}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`alt-desc-${item.id}`}>{t("boq.description")}</Label>
                        <textarea id={`alt-desc-${item.id}`} dir="auto" rows={2} value={alt?.description ?? ""} onChange={(e) => setAlt(item.id, { description: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <Label htmlFor={`alt-reason-${item.id}`}>{t("alternative.reason")} *</Label>
                        <p className="text-xs text-muted-foreground mb-1">{t("alternative.reasonHint")}</p>
                        <textarea id={`alt-reason-${item.id}`} dir="auto" rows={2} value={alt?.reason ?? ""} onChange={(e) => setAlt(item.id, { reason: e.target.value })}
                          aria-invalid={!!fieldErr("reason") || undefined} className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${fieldErr("reason") ? "border-red-500" : "border-input"}`} data-testid={`alt-reason-${index + 1}`} />
                        {fieldErr("reason") && <p className="mt-1 text-xs text-red-600" role="alert">{t("alternative.reasonRequired")}</p>}
                      </div>
                      <p className="text-sm text-muted-foreground">{t("pricing.itemTotal")}: <bdi dir="ltr" className="font-semibold tabular-nums text-foreground">{sar(altLine)}</bdi></p>
                      {issues.some((i) => i.code === "REPLACEMENT_REQUIRED") && <p className="text-xs text-red-600" role="alert">{t("pricingPage.replacementRequired")}</p>}
                    </div>
                  )}
                </fieldset>
              </div>
            </li>
          );
        })}
      </ol>

      <DocumentsSection data={data} docs={payload.documents ?? {}} readOnly={readOnly} problem={showErrors ? docProblem : null}
        onChange={(d) => { setPayload((p) => ({ ...p, documents: d })); markEdited(); }} />

      <section className="mt-6 space-y-1.5">
        <Label htmlFor="pricing-notes">{t("pricingPage.notes")}</Label>
        <textarea id="pricing-notes" dir="auto" rows={3} maxLength={5000} disabled={readOnly} value={payload.notes ?? ""}
          onChange={(e) => { setPayload((p) => ({ ...p, notes: e.target.value })); markEdited(); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </section>

      {/* Totals */}
      <section className="mt-6 rounded-xl border border-border bg-card p-4" aria-labelledby="totals-heading" data-testid="pricing-totals">
        <h2 id="totals-heading" className="font-semibold text-foreground mb-2">{t("pricing.submittedTotal")}</h2>
        {result.total === null ? (
          <p className="text-sm text-muted-foreground">{payload.tax.mixedTreatment ? t("tax.mixedTreatmentBlocked") : t("pricing.incomplete")}</p>
        ) : (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("pricing.subtotal")}</dt><dd className="tabular-nums"><bdi dir="ltr">{sar(result.subtotal)}</bdi></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{payload.tax.applyVat ? `${t("pricing.vat")} (${PROCUREMENT_VAT_RATE_BP / 100}%)` : t("tax.notApplied")}</dt><dd className="tabular-nums"><bdi dir="ltr">{sar(result.vat)}</bdi></dd></div>
            <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-semibold"><dt>{t("pricing.totalIncludingVat")}</dt><dd className="tabular-nums text-base" data-testid="pricing-total"><bdi dir="ltr">{sar(result.total)}</bdi></dd></div>
          </dl>
        )}
        {result.scenarios.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm" data-testid="pricing-scenarios">
            {result.scenarios.map((s) => (
              <li key={s.itemId} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("pricing.alternativeScenario")} — {items.find((i) => i.id === s.itemId)?.name}</span>
                <span className="tabular-nums"><bdi dir="ltr">{sar(s.total)}</bdi></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Action bar */}
      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <span className="me-auto text-xs text-muted-foreground" aria-live="polite" data-testid="pricing-save-state">
              {saving === "saving" ? t("pricingPage.saving") : saving === "saved" && !dirty ? t("pricingPage.savedQuiet") : saving === "error" ? t("pricingPage.saveFailed") : ""}
            </span>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => save(false)} disabled={saving === "saving" || conflict} data-testid="pricing-save">
              <Save className="h-4 w-4 me-2" aria-hidden="true" />{t("pricing.saveDraft")}
            </Button>
            <Button type="button" className="min-h-11 bg-[#FE3C01] hover:bg-[#D44D3A] text-white" onClick={startReview} disabled={conflict} data-testid="pricing-review">
              {t("pricing.review")}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent className="sm:max-w-md" data-testid="pricing-review-dialog">
          <DialogHeader>
            <DialogTitle>{t("pricing.review")}</DialogTitle>
            <DialogDescription>{t("pricingPage.reviewDesc")}</DialogDescription>
          </DialogHeader>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("pricing.subtotal")}</dt><dd><bdi dir="ltr">{sar(result.subtotal)}</bdi></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{payload.tax.applyVat ? t("pricing.vat") : t("tax.notApplied")}</dt><dd><bdi dir="ltr">{sar(result.vat)}</bdi></dd></div>
            <div className="flex justify-between gap-3 font-semibold"><dt>{t("pricing.totalIncludingVat")}</dt><dd><bdi dir="ltr">{sar(result.total)}</bdi></dd></div>
          </dl>
          {result.lines.some((l) => l.alternativeRole) && <p className="text-xs text-muted-foreground">{t("alternative.badge", { count: result.lines.filter((l) => l.alternativeRole).length })}</p>}
          <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" className="min-h-11" onClick={() => setReview(false)}>{t("gallery.keepEditing")}</Button>
            <Button className="min-h-11 bg-[#FE3C01] hover:bg-[#D44D3A] text-white" onClick={submit} disabled={submitting} data-testid="pricing-submit">
              {submitting ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4 me-2 rtl:-scale-x-100" aria-hidden="true" />}
              {t("pricing.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function DocumentsSection({ data, docs, readOnly, problem, onChange }: { data: PricingData; docs: Docs; readOnly: boolean; problem: ReturnType<typeof documentProblem>; onChange: (d: Docs) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const type = data.tender.submissionType;
  if (!type || type === "itemized_only") return null;
  const wantsDocs = type === "tech_fin_proposal" || type === "tech_fin_with_video";
  const wantsVideo = type === "video_only" || type === "tech_fin_with_video";
  const upload = async (field: keyof Docs, file?: File) => {
    if (!file) return;
    setBusy(field);
    try { onChange({ ...docs, [field]: await uploadObject(file) }); }
    catch { toast({ title: t("pricingPage.uploadFailed"), variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const fileRow = (field: "combinedFileUrl" | "technicalFileUrl" | "financialFileUrl") => (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
      <span className="text-sm">{t(`pricingPage.doc_${field}`)}</span>
      {docs[field] ? (
        <span className="inline-flex items-center gap-2 text-sm text-green-700 dark:text-green-400"><Check className="h-4 w-4" aria-hidden="true" />{t("pricingPage.uploaded")}
          {!readOnly && <Button type="button" variant="ghost" className="min-h-11" onClick={() => onChange({ ...docs, [field]: null })}>{t("alternative.remove")}</Button>}
        </span>
      ) : (
        <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm ${readOnly ? "pointer-events-none opacity-50" : ""}`}>
          {busy === field ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Paperclip className="h-4 w-4" aria-hidden="true" />}
          {t("pricingPage.chooseFile")}
          <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => { upload(field, e.target.files?.[0]); e.target.value = ""; }} data-testid={`doc-${field}`} />
        </label>
      )}
    </div>
  );
  return (
    <section className="mt-6 space-y-3" aria-labelledby="docs-heading" data-testid="pricing-documents">
      <h2 id="docs-heading" className="font-semibold text-foreground">{t("pricingPage.documents")}</h2>
      {wantsDocs && <><p className="text-xs text-muted-foreground">{t("pricingPage.docsHint")}</p>{fileRow("combinedFileUrl")}{fileRow("technicalFileUrl")}{fileRow("financialFileUrl")}</>}
      {wantsVideo && (
        <div>
          <Label htmlFor="pricing-video">{t("pricingPage.videoUrl")}{type === "video_only" || data.tender.videoRequired ? " *" : ""}</Label>
          <input id="pricing-video" type="url" dir="ltr" disabled={readOnly} value={docs.videoUrl ?? ""} onChange={(e) => onChange({ ...docs, videoUrl: e.target.value })}
            className="w-full min-h-11 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://" />
        </div>
      )}
      {problem && <p className="text-sm text-red-600" role="alert" data-testid="pricing-doc-problem">{t(`pricingPage.err_${problem.code}`)}</p>}
    </section>
  );
}
