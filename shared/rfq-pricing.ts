// Vendor responses to RFQ items: validation and totals (proposal §4, decisions
// P1 Policy A, P2, P4/A3). Used by the pricing page and, authoritatively, by the
// server's submission transaction — client totals are never trusted.
//
// Policy A: every item gets a response. Either the original is priced
// ("priced", optionally with an OPTIONAL alternative), or it is marked
// "unavailable" with a complete priced REPLACEMENT and a reason. The submitted
// total uses the original price, or the replacement's for unavailable items.
// An optional alternative never enters the submitted total: it is a separate
// scenario. Original and alternative are never added together.

import { lineTotal, money, parseBoqQuantity, parsePrice, sumLines, TotalOutOfRangeError, vatAmount, MAX_ITEMS, type MoneyError } from "./boq-money";
import { rateBpFor, type TaxDeclaration } from "./procurement-tax";

export const RESPONSE_STATES = ["priced", "unavailable"] as const;
export type ResponseState = (typeof RESPONSE_STATES)[number];

export const ALT_LIMITS = { name: 300, description: 2000, unit: 40, reason: 2000 } as const;

export interface RfqItemSpec {
  id: string;
  name: string;
  description?: string | null;
  unit: string;
  /** Decimal string, ≤ 4 dp. */
  quantity: string;
}

export interface AlternativeInput {
  name?: string | null;
  description?: string | null;
  unit?: string | null;
  quantity?: string | null;
  unitPrice?: string | null;
  reason?: string | null;
  imageUrl?: string | null;
}

export interface ItemResponseInput {
  itemId: string;
  state?: ResponseState | null;
  unitPrice?: string | null;
  alternative?: AlternativeInput | null;
}

export type ResponseIssue =
  | { code: "MISSING_RESPONSE"; itemId: string }
  | { code: "DUPLICATE_RESPONSE"; itemId: string }
  | { code: "UNKNOWN_ITEM"; itemId: string }
  | { code: "PRICE_INVALID"; itemId: string; error: MoneyError; field: "unitPrice" | "alternative.unitPrice" }
  | { code: "ALT_QUANTITY_INVALID"; itemId: string; error: MoneyError }
  | { code: "ALT_FIELD_REQUIRED"; itemId: string; field: "name" | "unit" | "quantity" | "unitPrice" }
  | { code: "ALT_FIELD_TOO_LONG"; itemId: string; field: keyof typeof ALT_LIMITS }
  | { code: "ALT_REASON_REQUIRED"; itemId: string }
  | { code: "REPLACEMENT_REQUIRED"; itemId: string }
  | { code: "STATE_REQUIRED"; itemId: string }
  | { code: "TAX_TREATMENT_UNSUPPORTED" }
  | { code: "TOO_MANY_ITEMS" }
  | { code: "TOTAL_OUT_OF_RANGE" };

export interface LineResult {
  itemId: string;
  state: ResponseState;
  /** Line counted in the submitted total (original, or replacement if unavailable). */
  countedLine: bigint;
  originalLine: bigint | null;
  alternativeLine: bigint | null;
  alternativeRole: "optional" | "replacement" | null;
}

export interface Scenario {
  itemId: string;
  subtotal: bigint;
  vat: bigint;
  total: bigint;
  /** Including VAT, against the submitted total (negative = cheaper). */
  difference: bigint;
}

export interface PricingResult {
  issues: ResponseIssue[];
  /** True when every item has a complete response (Policy A) and no issue blocks submission. */
  complete: boolean;
  completedCount: number;
  lines: LineResult[];
  subtotal: bigint | null;
  vat: bigint | null;
  total: bigint | null;
  rateBp: number;
  /** One scenario per OPTIONAL alternative (a replacement is already in the submitted total). */
  scenarios: Scenario[];
  /** False when any original is unpriced: an original-only total must not be shown (pricing.originalTotalIncomplete). */
  originalTotalComplete: boolean;
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function checkAlternative(itemId: string, alt: AlternativeInput, issues: ResponseIssue[]): bigint | null {
  for (const field of ["name", "unit"] as const) if (!text(alt[field])) issues.push({ code: "ALT_FIELD_REQUIRED", itemId, field });
  for (const field of Object.keys(ALT_LIMITS) as (keyof typeof ALT_LIMITS)[]) {
    if (text(alt[field]).length > ALT_LIMITS[field]) issues.push({ code: "ALT_FIELD_TOO_LONG", itemId, field });
  }
  if (!text(alt.reason)) issues.push({ code: "ALT_REASON_REQUIRED", itemId });
  const q = parseBoqQuantity(alt.quantity ?? null);
  if (!q.ok) issues.push(q.error === "empty" ? { code: "ALT_FIELD_REQUIRED", itemId, field: "quantity" } : { code: "ALT_QUANTITY_INVALID", itemId, error: q.error });
  const p = parsePrice(alt.unitPrice ?? null);
  if (!p.ok) issues.push(p.error === "empty" ? { code: "ALT_FIELD_REQUIRED", itemId, field: "unitPrice" } : { code: "PRICE_INVALID", itemId, error: p.error, field: "alternative.unitPrice" });
  return q.ok && p.ok ? lineTotal(q.scaled, p.scaled) : null;
}

/**
 * Validate responses against exactly these items and compute totals.
 * `final` adds the submission-only rules (every item answered, no mixed tax).
 */
export function priceOffer(items: RfqItemSpec[], responses: ItemResponseInput[], tax: TaxDeclaration, { final }: { final: boolean }): PricingResult {
  const issues: ResponseIssue[] = [];
  const rateBp = rateBpFor(tax);
  if (items.length > MAX_ITEMS || responses.length > MAX_ITEMS) issues.push({ code: "TOO_MANY_ITEMS" });

  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Map<string, ItemResponseInput>();
  for (const r of responses) {
    if (!byId.has(r.itemId)) issues.push({ code: "UNKNOWN_ITEM", itemId: String(r.itemId) });
    else if (seen.has(r.itemId)) issues.push({ code: "DUPLICATE_RESPONSE", itemId: r.itemId });
    else seen.set(r.itemId, r);
  }

  const lines: LineResult[] = [];
  let completedCount = 0;
  let originalTotalComplete = true;
  try {
    for (const item of items) {
      const r = seen.get(item.id);
      const before = issues.length;
      if (!r || !r.state) {
        if (r && !r.state && (r.unitPrice || r.alternative)) issues.push({ code: "STATE_REQUIRED", itemId: item.id });
        else if (final) issues.push({ code: "MISSING_RESPONSE", itemId: item.id });
        originalTotalComplete = false;
        continue;
      }
      const qty = parseBoqQuantity(item.quantity);
      if (!qty.ok) throw new Error(`stored quantity invalid for item ${item.id}`);
      if (r.state === "priced") {
        const p = parsePrice(r.unitPrice ?? null);
        if (!p.ok) {
          // An empty price on a draft is just "not yet answered".
          if (p.error !== "empty" || final) issues.push({ code: "PRICE_INVALID", itemId: item.id, error: p.error, field: "unitPrice" });
          originalTotalComplete = false;
          continue;
        }
        const originalLine = lineTotal(qty.scaled, p.scaled);
        let alternativeLine: bigint | null = null;
        if (r.alternative) alternativeLine = checkAlternative(item.id, r.alternative, issues);
        if (issues.length === before) {
          completedCount++;
          lines.push({ itemId: item.id, state: "priced", countedLine: originalLine, originalLine, alternativeLine, alternativeRole: r.alternative ? "optional" : null });
        }
      } else {
        originalTotalComplete = false;
        if (!r.alternative) { issues.push({ code: "REPLACEMENT_REQUIRED", itemId: item.id }); continue; }
        // An unavailable original carries no price of its own.
        const replacementLine = checkAlternative(item.id, r.alternative, issues);
        if (issues.length === before && replacementLine !== null) {
          completedCount++;
          lines.push({ itemId: item.id, state: "unavailable", countedLine: replacementLine, originalLine: null, alternativeLine: replacementLine, alternativeRole: "replacement" });
        }
      }
    }
  } catch (err) {
    if (!(err instanceof TotalOutOfRangeError)) throw err;
    issues.push({ code: "TOTAL_OUT_OF_RANGE" });
  }

  if (final && tax.mixedTreatment) issues.push({ code: "TAX_TREATMENT_UNSUPPORTED" });
  const answeredAll = completedCount === items.length && items.length > 0;
  const complete = answeredAll && issues.length === 0;

  // Totals only for a complete set of responses: a partial sum is never a comparable offer.
  let subtotal: bigint | null = null, vat: bigint | null = null, total: bigint | null = null;
  const scenarios: Scenario[] = [];
  if (answeredAll && !issues.some((i) => i.code === "TOTAL_OUT_OF_RANGE")) {
    try {
      subtotal = sumLines(lines.map((l) => l.countedLine));
      vat = tax.mixedTreatment ? null : vatAmount(subtotal, rateBp);
      total = vat === null ? null : subtotal + vat;
      if (total !== null) {
        for (const l of lines) {
          if (l.alternativeRole !== "optional" || l.alternativeLine === null) continue;
          const s = sumLines([subtotal - l.countedLine, l.alternativeLine]);
          const v = vatAmount(s, rateBp);
          scenarios.push({ itemId: l.itemId, subtotal: s, vat: v, total: s + v, difference: s + v - total });
        }
      }
    } catch (err) {
      if (!(err instanceof TotalOutOfRangeError)) throw err;
      issues.push({ code: "TOTAL_OUT_OF_RANGE" });
      subtotal = vat = total = null;
    }
  }
  return { issues, complete: complete && !issues.length, completedCount, lines, subtotal, vat, total, rateBp, scenarios, originalTotalComplete };
}

/** JSON-safe form of the computed totals (for responses and the snapshot). */
export function serializeTotals(r: PricingResult) {
  const m = (v: bigint | null) => (v === null ? null : money(v));
  return {
    subtotal: m(r.subtotal),
    vat: m(r.vat),
    total: m(r.total),
    rateBp: r.rateBp,
    originalTotalComplete: r.originalTotalComplete,
    lines: r.lines.map((l) => ({ itemId: l.itemId, state: l.state, countedLine: money(l.countedLine), originalLine: m(l.originalLine), alternativeLine: m(l.alternativeLine), alternativeRole: l.alternativeRole })),
    scenarios: r.scenarios.map((s) => ({ itemId: s.itemId, subtotal: money(s.subtotal), vat: money(s.vat), total: money(s.total), difference: (s.difference < 0n ? "-" : "") + money(s.difference < 0n ? -s.difference : s.difference) })),
  };
}
