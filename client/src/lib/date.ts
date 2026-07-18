import { format } from "date-fns";
import type { Locale } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────
// UTC-safe date helpers.
//
// Calendar pickers return a Date at LOCAL midnight. Serializing that with
// `date.toISOString().split('T')[0]` converts to UTC first, so in any timezone
// ahead of UTC (e.g. Riyadh, UTC+3) the calendar day shifts back by one
// ("pick July 28 → stored 2026-07-27"). These helpers keep the picked day.
// ─────────────────────────────────────────────────────────────────────────

/** Serialize a picked Date to a `YYYY-MM-DD` string using LOCAL calendar
 *  components — the day the user actually clicked, never shifted by timezone. */
export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Parse a `YYYY-MM-DD` string as a LOCAL date (not UTC midnight), so it
 *  displays as the same calendar day in every timezone. Full ISO timestamps
 *  (containing a "T") are parsed normally. */
export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

/** Format a stored date value for display, parsing date-only strings as local
 *  so the shown day matches what was picked. */
export function formatDateDisplay(
  value: string | Date | null | undefined,
  fmt = "PPP",
  locale?: Locale,
): string {
  if (!value) return "";
  return format(parseDateOnly(value), fmt, locale ? { locale } : undefined);
}
