import { VENDOR_CATEGORIES } from "@shared/schema";

/**
 * Display labels for `companies.category` and `tenders.category`.
 *
 * The category is stored in the database as its English string (see
 * VENDOR_CATEGORIES in shared/schema.ts), so rendering the column directly
 * shows English to Arabic users — which it did on every profile, traction and
 * tender surface. The Arabic list already existed but was a private constant
 * inside one onboarding page, so nothing else could reach it.
 *
 * Kept as a plain map rather than i18n keys because the English value IS the
 * stored key: adding an indirection through t() would mean maintaining the same
 * fifteen strings in three places instead of two.
 */
const CATEGORY_AR: Record<string, string> = {
  "Construction & Infrastructure": "الإنشاءات والبنية التحتية",
  "Information Technology": "تقنية المعلومات",
  "Healthcare & Medical Supplies": "الرعاية الصحية والمستلزمات الطبية",
  "Transportation & Logistics": "النقل واللوجستيات",
  "Professional Services": "الخدمات المهنية",
  "Manufacturing & Production": "التصنيع والإنتاج",
  "Food & Beverage": "الأغذية والمشروبات",
  "Energy & Utilities": "الطاقة والمرافق",
  "Education & Training": "التعليم والتدريب",
  "Telecommunications": "الاتصالات",
  "Facility Management": "إدارة المرافق",
  "Security Services": "الخدمات الأمنية",
  "Marketing & Advertising": "التسويق والإعلان",
  "Legal Services": "الخدمات القانونية",
  "Financial Services": "الخدمات المالية",
};

/**
 * Cities are free text, not a fixed list — production holds "Riyadh",
 * "riyadh", "Al Hofuf", "Jeddah", "Al Madinah" and 35 nulls. So this covers the
 * values that actually occur and falls back to the stored string for anything
 * else, which is the correct behaviour for a field a user can type into.
 * Matching is case-insensitive because the same city is stored both ways.
 */
const CITY_AR: Record<string, string> = {
  "riyadh": "الرياض",
  "jeddah": "جدة",
  "al hofuf": "الهفوف",
  "al madinah": "المدينة المنورة",
  "makkah": "مكة المكرمة",
  "dammam": "الدمام",
  "khobar": "الخبر",
  "al khobar": "الخبر",
  "tabuk": "تبوك",
  "abha": "أبها",
  "taif": "الطائف",
  "buraidah": "بريدة",
  "hail": "حائل",
  "najran": "نجران",
  "jazan": "جازان",
  "yanbu": "ينبع",
  "jubail": "الجبيل",
};

/** Localised category name, falling back to the stored value. */
export function categoryLabel(category: string | null | undefined, isRtl: boolean): string {
  if (!category) return "";
  return isRtl ? (CATEGORY_AR[category] ?? category) : category;
}

/** Localised city name, falling back to the stored value. */
export function cityLabel(city: string | null | undefined, isRtl: boolean): string {
  if (!city) return "";
  return isRtl ? (CITY_AR[city.trim().toLowerCase()] ?? city) : city;
}

/** Every category with its display label, for dropdowns. */
export function categoryOptions(isRtl: boolean): { value: string; label: string }[] {
  return VENDOR_CATEGORIES.map((value) => ({ value, label: categoryLabel(value, isRtl) }));
}
