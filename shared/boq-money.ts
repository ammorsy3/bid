// Structured RFQ pricing: exact decimal arithmetic shared by client and server
// (proposal §3, decisions P2/P6). BigInt only — the worst intermediate product
// (≈10²⁵) is far beyond Number.MAX_SAFE_INTEGER.
//
//   quantity  0 < q ≤ 1,000,000,000, ≤ 4 dp      scaled ×10⁴
//   price     0 ≤ p ≤ 1,000,000,000.00, ≤ 2 dp   scaled ×10² (halalas)
//   line      roundHalfUp(q₄ × p₂ / 10⁴)  ≤ 100,000,000,000.00
//   subtotal  Σ lines                     ≤ 100,000,000,000.00
//   VAT       roundHalfUp(subtotal × bp / 10,000); total = subtotal + VAT
//
// Values travel as ASCII decimal strings. Input is never rounded: too many
// decimals is an error. 0.00 is a price ("no charge"); empty is "missing".

import { normalizeDigits } from "./quantity";

export const QTY_SCALE = 10_000n;
export const PRICE_SCALE = 100n;
export const MAX_QUANTITY = 1_000_000_000n * QTY_SCALE;
export const MAX_PRICE = 1_000_000_000n * PRICE_SCALE;
export const MAX_LINE = 100_000_000_000n * PRICE_SCALE;
export const MAX_SUBTOTAL = 100_000_000_000n * PRICE_SCALE;
export const MAX_ITEMS = 2000;

export type MoneyError = "empty" | "invalid" | "precision" | "range" | "nonPositive";
export type Parsed = { ok: true; scaled: bigint; text: string } | { ok: false; error: MoneyError };

/** Strict API form: plain ASCII decimal string, no sign, exponent or separators. */
const API_QTY = /^\d{1,10}(\.\d{1,4})?$/;
const API_PRICE = /^\d{1,10}(\.\d{1,2})?$/;

function parseScaled(raw: unknown, decimals: number, opts: { lenient: boolean }): { ok: true; scaled: bigint } | { ok: false; error: MoneyError } {
  if (raw === null || raw === undefined) return { ok: false, error: "empty" };
  if (typeof raw !== "string") return { ok: false, error: "invalid" };
  const text = opts.lenient ? normalizeDigits(raw).trim() : raw;
  if (text === "") return { ok: false, error: "empty" };
  const m = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!m) return { ok: false, error: /^-\d/.test(text) ? "nonPositive" : "invalid" };
  const frac = m[2] ?? "";
  if (frac.length > decimals) return { ok: false, error: "precision" };
  if (m[1].replace(/^0+/, "").length > 10) return { ok: false, error: "range" };
  return { ok: true, scaled: BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt((frac + "0".repeat(decimals)).slice(0, decimals) || "0") };
}

/** Canonical decimal text of a scaled value with exactly `decimals` places (quantity: trailing zeros trimmed). */
export function formatScaled(scaled: bigint, decimals: number, trim = false): string {
  const s = 10n ** BigInt(decimals);
  const int = scaled / s;
  let frac = (scaled % s).toString().padStart(decimals, "0");
  if (trim) frac = frac.replace(/0+$/, "");
  return frac ? `${int}.${frac}` : `${int}`;
}

/**
 * A quantity. `lenient` accepts what a person types (Arabic-Indic digits, spaces
 * around); the API form (default) is the strict ASCII pattern from proposal §3.
 */
export function parseBoqQuantity(raw: unknown, lenient = false): Parsed {
  if (!lenient && typeof raw === "string" && raw !== "" && !API_QTY.test(raw)) {
    const r = parseScaled(raw, 4, { lenient: false });
    return r.ok ? { ok: false, error: "range" } : r;
  }
  const r = parseScaled(raw, 4, { lenient });
  if (!r.ok) return r;
  if (r.scaled <= 0n) return { ok: false, error: "nonPositive" };
  if (r.scaled > MAX_QUANTITY) return { ok: false, error: "range" };
  return { ok: true, scaled: r.scaled, text: formatScaled(r.scaled, 4, true) };
}

/** A unit price (vendor or reference). 0.00 is valid. */
export function parsePrice(raw: unknown, lenient = false): Parsed {
  if (!lenient && typeof raw === "string" && raw !== "" && !API_PRICE.test(raw)) {
    const r = parseScaled(raw, 2, { lenient: false });
    return r.ok ? { ok: false, error: "range" } : r;
  }
  const r = parseScaled(raw, 2, { lenient });
  if (!r.ok) return r;
  if (r.scaled > MAX_PRICE) return { ok: false, error: "range" };
  return { ok: true, scaled: r.scaled, text: formatScaled(r.scaled, 2) };
}

/** Half-up division of non-negative integers. */
export function divRoundHalfUp(n: bigint, d: bigint): bigint {
  return (n * 2n + d) / (2n * d);
}

export class TotalOutOfRangeError extends Error {
  readonly code = "TOTAL_OUT_OF_RANGE" as const;
  constructor() {
    super("The calculated total exceeds the supported limit.");
    this.name = "TotalOutOfRangeError";
  }
}

/** Line total in halalas: roundHalfUp(q₄ × p₂ / 10⁴). Throws past the line cap. */
export function lineTotal(quantity: bigint, price: bigint): bigint {
  const line = divRoundHalfUp(quantity * price, QTY_SCALE);
  if (line > MAX_LINE) throw new TotalOutOfRangeError();
  return line;
}

export function sumLines(lines: bigint[]): bigint {
  let s = 0n;
  for (const l of lines) {
    s += l;
    if (s > MAX_SUBTOTAL) throw new TotalOutOfRangeError();
  }
  return s;
}

/** VAT on a subtotal at `rateBp` basis points (1,500 = 15%). */
export function vatAmount(subtotal: bigint, rateBp: number): bigint {
  return divRoundHalfUp(subtotal * BigInt(rateBp), 10_000n);
}

export const money = (halalas: bigint) => formatScaled(halalas, 2);

/** Display "1,234.50" from halalas (grouping only; never rounds). */
export function groupMoney(halalas: bigint): string {
  const [int, frac] = money(halalas).split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac}`;
}

/** i18n key + vars for a money/quantity error (copy supplied in the RFQ brief). */
export function moneyErrorMessage(kind: "quantity" | "price", error: MoneyError): { key: string; vars?: Record<string, string> } {
  if (error === "precision") return { key: kind === "quantity" ? "validation.quantityPrecision" : "validation.pricePrecision" };
  if (kind === "quantity" && (error === "empty" || error === "nonPositive")) return { key: "boq.quantityInvalid" };
  if (kind === "quantity") return { key: "validation.valueOutOfRange", vars: { min: "0.0001", max: "1,000,000,000" } };
  return { key: "validation.valueOutOfRange", vars: { min: "0.00", max: "1,000,000,000.00" } };
}
