import { Fragment, type ReactNode } from "react";

// Helpers for text people typed themselves (bios, descriptions) that can hold
// links or ISO dates in the middle of an Arabic sentence. Left alone, the
// browser's bidi rules scramble them: "https://a.com/b" splits into pieces and
// "2027-06-30" reads back as "30-06-2027".

// Matches http(s) links but leaves out the punctuation that usually ends a
// sentence right after one (full stop, comma, closing bracket, Arabic comma).
const URL_PATTERN = /(https?:\/\/[^\s]*[^\s.,;:!?)\]}"'،؛؟])/g;

/**
 * Wraps every link inside `text` in a left-to-right isolate that may break
 * anywhere, so it reads correctly inside Arabic text and can never push a
 * phone screen wider than it is. Returns the original string when it holds no link.
 */
export function withLtrUrls(text: string): ReactNode {
  const parts = text.split(URL_PATTERN);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <bdi key={i} dir="ltr" className="[overflow-wrap:anywhere]">{part}</bdi>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/**
 * Keeps a date or number that goes inside a translated sentence in left-to-right
 * order ("2027-06-30" instead of "30-06-2027" after Arabic words).
 * Use it for values passed into t() placeholders.
 */
export function isolateLtr(value: string): string {
  return `\u2066${value}\u2069`;
}

/**
 * Same as isolateLtr, but the browser picks the direction from the text itself
 * (like <bdi>). Use it for names typed by people (an English company name inside
 * an Arabic sentence, or the other way round) that go into t() placeholders.
 */
export function isolateAuto(value: string): string {
  return `\u2068${value}\u2069`;
}
