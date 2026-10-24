import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

/** date-fns `format` that follows the page language (the app keeps <html lang> in step), so Arabic pages get Arabic month names. Digits stay 0-9. */
export function formatLocalDate(date: Date | number, pattern: string): string {
  const arabic = typeof document !== "undefined" && document.documentElement.lang === "ar";
  return format(date, pattern, { locale: arabic ? ar : enUS });
}
