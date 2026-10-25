// The requester's view of an itemized offer (RFQ brief §7, AC8, AC9). Reads the
// stored values only (proposal §4 "Reproducibility"): the snapshot taken at
// submission and the stored totals. Alternatives are flagged with a red badge
// (text + icon, not colour alone), shown next to the original with the
// differences and the vendor's reason, and never accepted automatically.

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeftRight, Loader2, ShieldQuestion } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { UNIT_LABELS_AR } from "@/components/ui/smart-unit-dropdown";
import { BoqImage } from "./BoqImage";

interface SnapshotItem { id: string; position: number; name: string; description: string | null; unit: string; quantity: string; imageUrl: string | null }
interface SnapshotAlt { name: string; description?: string | null; unit: string; quantity: string; unitPrice: string; reason: string; imageUrl?: string | null }
interface SnapshotResponse { itemId: string; state: "priced" | "unavailable"; unitPrice?: string | null; alternative?: SnapshotAlt | null }
interface Totals {
  subtotal: string; vat: string; total: string; rateBp: number; originalTotalComplete: boolean;
  lines: { itemId: string; state: string; countedLine: string; originalLine: string | null; alternativeLine: string | null; alternativeRole: "optional" | "replacement" | null }[];
  scenarios: { itemId: string; subtotal: string; vat: string; total: string; difference: string }[];
}
interface OfferPricing {
  offerId: string; vatApplied: boolean; vatRateBp: number; subtotal: string; vat: string; total: string;
  alternativesCount: number; items: SnapshotItem[]; responses: (SnapshotResponse | null)[]; totals: Totals;
}

const fmt = (v: string | null | undefined) => {
  if (v === null || v === undefined) return "—";
  const neg = v.startsWith("-");
  const [i, f = "00"] = v.replace("-", "").split(".");
  return `${neg ? "−" : ""}SAR ${i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${f.padEnd(2, "0")}`;
};

export function AlternativesBadge({ count }: { count: number }) {
  const { t } = useI18n();
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white" data-testid="alternatives-badge">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      {t("alternative.badge", { count })}
    </span>
  );
}

export function ItemizedOfferReview({ offerId }: { offerId: string }) {
  const { t, isRtl } = useI18n();
  const { data, isLoading, isError } = useQuery<OfferPricing>({ queryKey: ["/api/offers", offerId, "pricing"] });
  const unit = (u: string) => (isRtl ? UNIT_LABELS_AR[u] ?? u : u);

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#FE3C01]" aria-label={t("common.loading")} /></div>;
  if (isError || !data) return <p className="text-sm text-red-600" role="alert">{t("pricingPage.loadFailed")}</p>;

  const responseFor = (id: string) => data.responses.find((r) => r?.itemId === id) ?? null;
  const lineFor = (id: string) => data.totals.lines.find((l) => l.itemId === id);
  const nameOf = (id: string) => data.items.find((i) => i.id === id)?.name ?? "";

  return (
    <div className="space-y-4" data-testid="itemized-offer-review">
      <div className="flex flex-wrap items-center gap-2">
        <AlternativesBadge count={data.alternativesCount} />
        {data.alternativesCount > 0 && <p className="text-xs text-muted-foreground">{t("alternative.reviewNotice")}</p>}
      </div>

      <ol className="space-y-3">
        {data.items.map((item, index) => {
          const r = responseFor(item.id);
          const line = lineFor(item.id);
          const alt = r?.alternative ?? null;
          const replacement = r?.state === "unavailable";
          const diffs = alt ? ([
            alt.name !== item.name && "name",
            alt.unit !== item.unit && "unit",
            alt.quantity !== item.quantity && "quantity",
          ].filter(Boolean) as string[]) : [];
          return (
            <li key={item.id} className={`rounded-xl border p-3 ${alt ? "border-red-300 dark:border-red-800" : "border-border"}`} data-testid={`review-item-${index + 1}`}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className={replacement ? "opacity-70" : ""}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{index + 1}. {t("alternative.original")}</p>
                  <div className="flex gap-2">
                    {item.imageUrl && <BoqImage path={item.imageUrl} alt={item.name} className="h-12 w-12" />}
                    <div className="min-w-0">
                      <p className="font-semibold break-words">{item.name}</p>
                      <p className="text-sm text-muted-foreground"><bdi dir="ltr">{item.quantity}</bdi> {unit(item.unit)}</p>
                    </div>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
                    <dt className="text-muted-foreground">{t("pricing.unitPrice")}</dt>
                    <dd className="text-end tabular-nums">{replacement ? <span className="font-semibold text-red-700 dark:text-red-400">{t("alternative.originalUnavailable")}</span> : <bdi dir="ltr">{fmt(r?.unitPrice)}</bdi>}</dd>
                    <dt className="text-muted-foreground">{t("pricing.itemTotal")}</dt>
                    <dd className="text-end tabular-nums font-semibold"><bdi dir="ltr">{fmt(line?.originalLine)}</bdi></dd>
                  </dl>
                </div>
                {alt && (
                  <div className="rounded-lg bg-red-50/60 dark:bg-red-900/10 p-2" data-testid={`review-alt-${index + 1}`}>
                    <p className="flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                      <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                      {replacement ? t("alternative.replacement") : t("alternative.proposed")}
                    </p>
                    <div className="flex gap-2">
                      {alt.imageUrl && <BoqImage path={alt.imageUrl} alt={alt.name} className="h-12 w-12" />}
                      <div className="min-w-0">
                        <p className="font-semibold break-words">{alt.name}</p>
                        <p className="text-sm text-muted-foreground"><bdi dir="ltr">{alt.quantity}</bdi> {unit(alt.unit)}</p>
                      </div>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
                      <dt className="text-muted-foreground">{t("pricing.unitPrice")}</dt>
                      <dd className="text-end tabular-nums"><bdi dir="ltr">{fmt(alt.unitPrice)}</bdi></dd>
                      <dt className="text-muted-foreground">{t("pricing.itemTotal")}</dt>
                      <dd className="text-end tabular-nums font-semibold"><bdi dir="ltr">{fmt(line?.alternativeLine)}</bdi></dd>
                    </dl>
                    {diffs.length > 0 && (
                      <p className="mt-2 text-xs"><span className="font-semibold">{t("alternative.differences")}:</span> {diffs.map((d) => t(d === "name" ? "boq.itemName" : d === "unit" ? "boq.unit" : "boq.quantity")).join(isRtl ? "، " : ", ")}</p>
                    )}
                    <p className="mt-2 text-sm"><span className="font-semibold">{t("alternative.reason")}:</span> <span className="break-words whitespace-pre-line">{alt.reason}</span></p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <section className="rounded-xl border border-border p-3" aria-label={t("pricing.submittedTotal")} data-testid="review-totals">
        <p className="font-semibold mb-1">{t("pricing.submittedTotal")}</p>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("pricing.subtotal")}</dt><dd className="tabular-nums"><bdi dir="ltr">{fmt(data.subtotal)}</bdi></dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{data.vatApplied ? `${t("pricing.vat")} (${data.vatRateBp / 100}%)` : t("tax.notApplied")}</dt><dd className="tabular-nums"><bdi dir="ltr">{fmt(data.vat)}</bdi></dd></div>
          <div className="flex justify-between gap-3 border-t border-border pt-1 font-semibold"><dt>{t("pricing.totalIncludingVat")}</dt><dd className="tabular-nums" data-testid="review-total"><bdi dir="ltr">{fmt(data.total)}</bdi></dd></div>
        </dl>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground" title={t("tax.vendorDeclaredHint")}>
          <ShieldQuestion className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span><span className="font-semibold">{t("tax.vendorDeclared")}.</span> {t("tax.vendorDeclaredHint")}</span>
        </p>
        {!data.totals.originalTotalComplete && (
          <p className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2 text-xs text-amber-900 dark:text-amber-200" data-testid="review-original-incomplete">{t("pricing.originalTotalIncomplete")}</p>
        )}
        {data.totals.scenarios.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-border pt-2 text-sm" data-testid="review-scenarios">
            {data.totals.scenarios.map((s) => (
              <li key={s.itemId} className="flex flex-wrap justify-between gap-x-3">
                <span className="text-muted-foreground">{t("pricing.alternativeScenario")} — {nameOf(s.itemId)}</span>
                <span className="tabular-nums"><bdi dir="ltr">{fmt(s.total)}</bdi> <span className="text-xs text-muted-foreground">(<bdi dir="ltr">{fmt(s.difference)}</bdi>)</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Count of alternatives in an offer's stored snapshot (for list badges). */
export function snapshotAlternativesCount(snapshot: unknown): number {
  const responses = (snapshot as { responses?: ({ alternative?: unknown } | null)[] } | null)?.responses;
  return Array.isArray(responses) ? responses.filter((r) => r?.alternative).length : 0;
}

