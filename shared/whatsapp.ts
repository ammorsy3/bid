// WhatsApp contact for a request (BID-UX-BUGFIX item 5, decision D3).
//
// A requester enters a Saudi mobile number the way people write it — local
// "05XXXXXXXX", "5XXXXXXXX", or international "9665…", "+966 5…", "00966 5…",
// with spaces, dashes or dots, in ASCII or Arabic digits. It is stored as
// "9665XXXXXXXX" (country code + 9 digits, no "+"), which is exactly what
// wa.me expects, so the link is generated instead of typed.
// Anything else — too short, too long, a landline, another country, a URL — is
// rejected rather than guessed.

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

function asciiDigits(raw: string): string {
  return raw.replace(ARABIC_DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

/** "9665XXXXXXXX" for a valid Saudi mobile, otherwise null. */
export function normalizeSaudiMobile(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = asciiDigits(raw).trim();
  // Only digits, one leading "+", and spacing/grouping characters people type.
  if (!/^\+?[\d\s\-().]+$/.test(text)) return null;
  let digits = text.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("966")) digits = digits.slice(3).replace(/^0(?=5)/, "");
  else if (text.startsWith("+")) return null; // another country code
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return /^5\d{8}$/.test(digits) ? `966${digits}` : null;
}

/** "+966 5X XXX XXXX" for display; falls back to the stored text. */
export function formatSaudiMobile(stored: string | null | undefined): string {
  const n = normalizeSaudiMobile(stored ?? "");
  if (!n) return stored ?? "";
  const local = n.slice(3);
  return `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

/**
 * The wa.me link for a stored contact. New values are normalised numbers;
 * older requests may hold free text (a number with "+", or a wa.me URL), which
 * keeps working by using its digits as before.
 */
export function whatsappLink(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const n = normalizeSaudiMobile(stored);
  if (n) return `https://wa.me/${n}`;
  const digits = asciiDigits(stored).replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidContactEmail(raw: unknown): raw is string {
  return typeof raw === "string" && raw.trim().length <= 254 && EMAIL.test(raw.trim());
}

/**
 * The external-contact rule for a request: with inquiryType "email_whatsapp" the
 * requester picks WhatsApp or email, so at least one of them must be present.
 * Returns null when the payload satisfies it.
 */
export function contactProblem(t: { inquiryType?: string | null; whatsappContact?: string | null; emailContact?: string | null }): "missing" | null {
  if (t.inquiryType !== "email_whatsapp") return null;
  return t.whatsappContact || t.emailContact ? null : "missing";
}
