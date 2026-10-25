// An offer's price as every reader should show it (PB-4). Itemized offers use
// the totals Bid stored at submission — computed on the server from the item
// prices, never typed by the vendor — and keep their meaning: total including
// the vendor-declared VAT, the subtotal before VAT, and how many optional
// alternatives exist (those are scenarios, never part of the total). A total of
// 0.00 is a real price. Legacy offers keep their single quoted price.

export interface OfferPriceSource {
  quotePrice?: number | null;
  pricingTotal?: string | null;
  pricingSubtotal?: string | null;
  pricingVat?: string | null;
  vatApplied?: boolean | null;
  vatRateBp?: number | null;
  pricingSnapshot?: unknown;
}

export type OfferPrice =
  | { kind: "itemized"; total: string; subtotal: string | null; vat: string | null; vatApplied: boolean; vatRateBp: number; alternatives: number; replacements: number; currency: "SAR" }
  | { kind: "quote"; amount: number; currency: "SAR" };

interface SnapshotTotals { lines?: { alternativeRole?: string | null }[] }

export function offerPrice(o: OfferPriceSource | null | undefined): OfferPrice | null {
  if (!o) return null;
  if (o.pricingTotal !== null && o.pricingTotal !== undefined && o.pricingTotal !== "") {
    const lines = ((o.pricingSnapshot as { totals?: SnapshotTotals } | null)?.totals?.lines) ?? [];
    return {
      kind: "itemized",
      total: o.pricingTotal,
      subtotal: o.pricingSubtotal ?? null,
      vat: o.pricingVat ?? null,
      vatApplied: o.vatApplied === true,
      vatRateBp: o.vatRateBp ?? 0,
      alternatives: lines.filter((l) => l.alternativeRole === "optional").length,
      replacements: lines.filter((l) => l.alternativeRole === "replacement").length,
      currency: "SAR",
    };
  }
  // Legacy: a missing or zero quote was never shown as a price (unchanged).
  if (o.quotePrice) return { kind: "quote", amount: o.quotePrice, currency: "SAR" };
  return null;
}

/** "10,511.00" from a stored decimal string — grouping only, never rounding. */
export function groupDecimal(v: string): string {
  const neg = v.startsWith("-");
  const [i, f = ""] = v.replace("-", "").split(".");
  return `${neg ? "-" : ""}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${f ? `.${f.padEnd(2, "0")}` : ""}`;
}

/** The amount as a display string with currency ("SAR 10,511.00" / "SAR 25,000"). */
export function formatOfferAmount(p: OfferPrice): string {
  return p.kind === "itemized" ? `SAR ${groupDecimal(p.total)}` : `SAR ${p.amount.toLocaleString("en-US")}`;
}

/** A sortable number for ranking views (display always uses the exact string). */
export function offerPriceValue(p: OfferPrice | null): number | null {
  if (!p) return null;
  return p.kind === "itemized" ? Number(p.total) : p.amount;
}

/** Plain-language context for the AI analysis prompt; states what the number means. */
export function offerPriceContext(p: OfferPrice | null): string | null {
  if (!p) return null;
  if (p.kind === "quote") return `Quoted Price: ${p.amount} SAR`;
  const vat = p.vatApplied ? `VAT ${p.vat ?? "?"} SAR at ${p.vatRateBp / 100}% as declared by the vendor (not verified by Bid)` : "no VAT applied (vendor declaration)";
  const extras = [
    p.replacements ? `${p.replacements} unavailable item(s) are priced through a replacement that is included in this total` : null,
    p.alternatives ? `${p.alternatives} optional alternative(s) were proposed; they are separate scenarios and are NOT included in this total` : null,
  ].filter(Boolean).join("; ");
  return `Submitted Offer Total (computed by Bid from the vendor's item prices; authoritative): ${p.total} SAR including VAT. Subtotal before VAT: ${p.subtotal ?? "?"} SAR; ${vat}.${extras ? ` ${extras}.` : ""}`;
}
