// Quantities (deliverables and, later, bill-of-quantities items).
//
// Rule (product decision P6, applied to every quantity): greater than zero, at
// most 1,000,000,000, at most 4 decimal places. Input is NEVER rounded: a value
// with too many decimals is an error, not a rounded number. Arabic-Indic and
// Eastern Arabic digits and the Arabic decimal separator are accepted and
// normalised to ASCII; signs, exponents, thousands separators and spaces inside
// the number are rejected.

export const QUANTITY_MAX = 1_000_000_000;
export const QUANTITY_DECIMALS = 4;

export type QuantityError = "empty" | "invalid" | "precision" | "nonPositive" | "range";

export type QuantityResult =
  | { ok: true; text: string; value: number }
  | { ok: false; error: QuantityError };

const DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

/** Arabic-Indic / Eastern Arabic digits → ASCII, Arabic decimal separator (٫) → ".". */
export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => DIGITS[d]).replace(/٫/g, ".");
}

/**
 * Parse a quantity typed by a person or sent by a client. Numbers are accepted
 * only when their shortest decimal form is plain (no exponent).
 */
export function parseQuantity(input: unknown): QuantityResult {
  let text: string;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return { ok: false, error: "invalid" };
    text = String(input);
  } else if (typeof input === "string") {
    text = normalizeDigits(input).trim();
  } else if (input == null) {
    return { ok: false, error: "empty" };
  } else {
    return { ok: false, error: "invalid" };
  }
  if (text === "") return { ok: false, error: "empty" };
  const m = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!m) return { ok: false, error: /^-/.test(text) ? "nonPositive" : "invalid" };
  if ((m[2]?.length ?? 0) > QUANTITY_DECIMALS) return { ok: false, error: "precision" };
  // Canonical text: no leading zeros (except "0.x"), no trailing fractional zeros.
  const intPart = m[1].replace(/^0+(?=\d)/, "");
  const frac = (m[2] ?? "").replace(/0+$/, "");
  const canonical = frac ? `${intPart}.${frac}` : intPart;
  const value = Number(canonical);
  if (value <= 0) return { ok: false, error: "nonPositive" };
  if (value > QUANTITY_MAX) return { ok: false, error: "range" };
  return { ok: true, text: canonical, value };
}

/** i18n key + variables for a quantity error (copy supplied in the RFQ brief). */
export function quantityErrorMessage(error: QuantityError): { key: string; vars?: Record<string, string> } {
  switch (error) {
    case "precision":
      return { key: "validation.quantityPrecision" };
    case "range":
      return { key: "validation.valueOutOfRange", vars: { min: "0.0001", max: "1,000,000,000" } };
    default:
      return { key: "boq.quantityInvalid" };
  }
}
