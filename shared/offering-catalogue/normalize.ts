// Deterministic Arabic/English text normalisation for catalogue search and for
// the stable keys the importer uses to recognise a source example it has seen
// before. Display labels are never normalised — only the text we compare.
//
// Arabic: diacritics and tatweel removed; alef forms (أ إ آ ٱ) → ا; ى → ي;
// ة → ه; ؤ → و; ئ → ي; Arabic-Indic and Persian digits → ASCII.
// English: case-folded; "&" → "and". Both: NFKC, punctuation → space, spaces
// collapsed.

const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

const CHAR_MAP: Record<string, string> = {
  "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
  "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي",
};

function foldDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

export function normalizeText(input: string): string {
  let s = (input ?? "").normalize("NFKC").toLowerCase();
  s = s.replace(ARABIC_MARKS, "").replace(TATWEEL, "");
  s = s.replace(/[أإآٱىةؤئ]/g, (c) => CHAR_MAP[c] ?? c);
  s = foldDigits(s);
  s = s.replace(/&/g, " and ");
  // Letters and digits of any script stay; everything else separates words.
  s = s.replace(/[^\p{L}\p{N}]+/gu, " ");
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Word forms used for matching. An Arabic word also matches without its
 * definite article or a leading "و" conjunction ("والتدريب" → "تدريب"), so a
 * query need not repeat the article the label happens to use.
 */
export function tokenVariants(token: string): string[] {
  const out = new Set([token]);
  if (/^[؀-ۿ]/.test(token)) {
    let t = token;
    if (t.length > 3 && t.startsWith("و")) { t = t.slice(1); out.add(t); }
    if (t.length > 4 && t.startsWith("ال")) out.add(t.slice(2));
    if (t.length > 4 && (t.startsWith("بال") || t.startsWith("لل"))) out.add(t.slice(t.startsWith("لل") ? 2 : 3));
  }
  return [...out];
}

export function tokenize(input: string): string[] {
  const n = normalizeText(input);
  return n ? n.split(" ") : [];
}
