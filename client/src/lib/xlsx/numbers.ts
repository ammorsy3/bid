// Exact numbers from worksheet XML text (Amendment A5 numeric rule): a numeric
// cell's text — plain or scientific ("1.5E-3") — becomes an exact decimal
// string by string arithmetic, never through JS Number. Mantissa ≤ 17
// significant digits, exponent within ±20; anything else is refused (null).

export function exactDecimal(text: string): string | null {
  const m = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text.trim());
  if (!m) return null;
  const [, sign, intPart, fracPart = "", expText] = m;
  const exp = expText ? parseInt(expText, 10) : 0;
  if (Math.abs(exp) > 20) return null;
  const all = intPart + fracPart;
  if (all.replace(/^0+/, "").replace(/0+$/, "").length > 17) return null;
  // Position of the decimal point within `all`, after applying the exponent.
  const point = intPart.length + exp;
  let int: string, frac: string;
  if (point <= 0) { int = "0"; frac = "0".repeat(-point) + all; }
  else if (point >= all.length) { int = all + "0".repeat(point - all.length); frac = ""; }
  else { int = all.slice(0, point); frac = all.slice(point); }
  int = int.replace(/^0+(?=\d)/, "");
  frac = frac.replace(/0+$/, "");
  const body = frac ? `${int}.${frac}` : int;
  return sign === "-" && body !== "0" ? `-${body}` : body;
}

/** An Excel date serial (integer part) → YYYY-MM-DD, honouring the 1904 system. */
export function serialToDate(serial: string, date1904: boolean): string | null {
  const n = Number(serial);
  if (!Number.isFinite(n) || n < 0 || n > 2958465) return null;
  let days = Math.floor(n);
  // 1900 system: Excel counts the non-existent 1900-02-29 (serial 60).
  if (!date1904) { if (days === 60) return null; if (days > 60) days -= 1; }
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31);
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}
