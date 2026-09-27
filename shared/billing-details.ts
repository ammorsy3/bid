// Billing details: the few facts StreamPay puts on the customer record and the
// tax invoice. Shared so the checkout form and the server reject exactly the
// same inputs — a value the form accepts must never be dropped by the server.

import { z } from "zod";

export const BILLING_DETAIL_FIELDS = [
  "billingName",
  "billingEmail",
  "billingPhone",
  "vatNumber",
  "crNumber",
  "address",
  "city",
] as const;
export type BillingDetailField = typeof BILLING_DETAIL_FIELDS[number];

/** Checkout cannot start without these; everything else is optional. */
export const REQUIRED_BILLING_FIELDS: BillingDetailField[] = ["billingName", "billingEmail"];

/**
 * Any Saudi mobile written the ways people write it → +9665XXXXXXXX.
 * "0501234567", "501234567", "966501234567", "00966 50 123 4567", "+966-50-123-4567".
 * Other countries pass through only when already in E.164 (+ and 8–15 digits).
 * Returns null for anything else — the caller then treats the phone as missing.
 */
export function normalizeSaudiPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  // Arabic-Indic and Persian digits → ASCII, so a phone typed on an Arabic keyboard still counts.
  const ascii = trimmed.replace(/[٠-٩۰-۹]/g, (d) =>
    String((d.charCodeAt(0) & 0xf) % 10),
  );
  const hadPlus = ascii.startsWith("+");
  let digits = ascii.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("966")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  else if (hadPlus) {
    // A non-Saudi number already in international form.
    return /^\d{8,15}$/.test(digits) ? `+${digits}` : null;
  }

  return /^5\d{8}$/.test(digits) ? `+966${digits}` : null;
}

/** Saudi VAT (ZATCA): 15 digits, first and last are 3. */
export function isValidSaudiVat(v: string | null | undefined): boolean {
  return !!v && /^3\d{13}3$/.test(v.trim());
}

/** Commercial Registration: 10 digits, same rule as company verification. */
export function isValidCr(v: string | null | undefined): boolean {
  return !!v && /^\d{10}$/.test(v.trim());
}

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().optional();

/**
 * One auto-save from the checkout form: any subset of the fields. An empty
 * string clears a field. Invalid values fail here and are not saved.
 */
export const billingDetailsPatchSchema = z.object({
  checkoutId: z.string().trim().max(64).optional(),
  billingName: optionalText(200).refine((v) => v == null || v.length >= 2, "nameTooShort"),
  billingEmail: optionalText(254).refine((v) => v == null || z.string().email().safeParse(v).success, "invalidEmail"),
  billingPhone: optionalText(32)
    .refine((v) => v == null || normalizeSaudiPhone(v) !== null, "invalidPhone")
    .transform((v) => (v == null ? v : normalizeSaudiPhone(v))),
  vatNumber: optionalText(32)
    .transform((v) => (v == null ? v : v.replace(/\s/g, "")))
    .refine((v) => v == null || isValidSaudiVat(v), "invalidVat"),
  crNumber: optionalText(32)
    .transform((v) => (v == null ? v : v.replace(/\s/g, "")))
    .refine((v) => v == null || isValidCr(v), "invalidCr"),
  address: optionalText(200).refine((v) => v == null || v.length >= 3, "addressTooShort"),
  city: optionalText(120),
});

export type BillingDetailsPatch = z.infer<typeof billingDetailsPatchSchema>;

/** What the checkout step shows, and where each value came from. */
export interface ResolvedBillingDetails {
  values: Record<BillingDetailField, string | null>;
  /** "billing" = typed at checkout; "account"/"company" = already in the app. */
  sources: Partial<Record<BillingDetailField, "billing" | "account" | "company">>;
  missing: BillingDetailField[];
}
