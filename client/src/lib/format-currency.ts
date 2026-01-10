/**
 * Currency formatting utility with locale-aware formatting
 * Uses browser locale by default, with option to specify explicitly
 */

type SupportedLocale = 'en' | 'ar';

/**
 * Get the user's preferred locale from browser settings
 * Returns 'ar' for Arabic locales, 'en' for everything else
 */
export function getBrowserLocale(): SupportedLocale {
  const browserLang = navigator.language || 'en';
  return browserLang.startsWith('ar') ? 'ar' : 'en';
}

/**
 * Format a number as SAR currency based on locale
 * @param amount - The amount to format (string or number)
 * @param locale - Optional locale override ('en' or 'ar'). Defaults to browser locale.
 * @returns Formatted currency string
 */
export function formatCurrency(amount: string | number, locale?: SupportedLocale): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return String(amount);

  const effectiveLocale = locale ?? getBrowserLocale();
  const intlLocale = effectiveLocale === 'ar' ? 'ar-SA' : 'en-US';

  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format SAR with explicit English numerals (always Western digits)
 * Use this when you want consistent English display regardless of locale
 */
export function formatSAREnglish(amount: string | number): string {
  return formatCurrency(amount, 'en');
}

/**
 * Format SAR with Arabic numerals
 * Use this for explicit Arabic display
 */
export function formatSARArabic(amount: string | number): string {
  return formatCurrency(amount, 'ar');
}

/**
 * React hook for currency formatting
 * Returns a formatter function that uses the current browser locale
 */
export function useFormatCurrency() {
  const locale = getBrowserLocale();
  return (amount: string | number) => formatCurrency(amount, locale);
}
