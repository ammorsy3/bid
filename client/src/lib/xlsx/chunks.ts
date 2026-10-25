// Splitting a large worksheet or shared-strings part into small, separately
// parseable XML documents (PB-7, PB-7-R1). This is not an XML parser: it only
// cuts the text after closing </row> (or </si>) tags and wraps each piece in the
// part's own root start tag, so every piece keeps its namespace declarations.
//
// Bounds are real UTF-8 byte counts, wrapper included (PB-7-R1):
//   - every piece ≤ IMPORT_LIMITS.pieceBytes; a single row (or shared string)
//     that cannot fit is refused (import.rowTooLarge / import.partTooLarge),
//     never passed on oversized;
//   - the skeleton (the part without its pieces) ≤ IMPORT_LIMITS.structureBytes.
// Each piece is then parsed by the platform XML parser; a piece that does not
// parse fails the import as unsupported — it is never guessed.

import { IMPORT_LIMITS, ImportError, limitVars, utf8Length } from "@shared/boq-import";

export interface XmlChunks {
  /** Wrapped XML documents, in order, each within the piece limit. */
  chunks: string[];
  /**
   * The whole part with the chunked elements removed. The reader parses it too,
   * so the structure around the pieces is validated and nothing outside them
   * (e.g. a broken trailing row) can be skipped silently.
   */
  skeleton: string;
}

const ROOT_START = /<(?!\?|!)([A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)\b[^>]*>/;

export function partTooLarge(): ImportError {
  return new ImportError("import.partTooLarge", { ...limitVars["import.partTooLarge"] });
}

export function chunkXml(
  text: string,
  element: "row" | "si",
  limits: { pieceBytes: number; structureBytes: number } = IMPORT_LIMITS,
): XmlChunks | null {
  const root = ROOT_START.exec(text);
  if (!root) return null;
  const rootName = `${root[1] ?? ""}${root[2]}`;
  const head = root[0].endsWith("/>") ? root[0].slice(0, -2) + ">" : root[0];
  const tail = `</${rootName}>`;
  const wrapperBytes = utf8Length(head) + utf8Length(tail);
  const room = limits.pieceBytes - wrapperBytes;
  if (room <= 0) throw partTooLarge();
  const open = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${element}[\\s>/]`, "g");
  const close = new RegExp(`</(?:[A-Za-z_][\\w.-]*:)?${element}>`, "g");
  open.lastIndex = root.index + root[0].length;
  const first = open.exec(text);
  if (!first) {
    if (utf8Length(text) > limits.structureBytes) throw partTooLarge();
    return { chunks: [], skeleton: text };
  }

  const chunks: string[] = [];
  let pieceStart = first.index; // start of the piece being built
  let pieceBytes = 0;
  let segStart = first.index;   // start of the next element (with what precedes it)
  let lastEnd = first.index;
  close.lastIndex = first.index;
  let m: RegExpExecArray | null;
  while ((m = close.exec(text))) {
    const end = m.index + m[0].length;
    const segment = text.slice(segStart, end);
    const segBytes = utf8Length(segment);
    if (segBytes > room) {
      // One element alone does not fit a piece: refuse it, with the sheet row if known.
      if (element === "row") {
        const r = /<(?:[A-Za-z_][\w.-]*:)?row\b[^>]*\br="(\d+)"/.exec(segment);
        throw new ImportError("import.rowTooLarge", { ...limitVars["import.rowTooLarge"], row: r ? r[1] : "?" });
      }
      throw partTooLarge();
    }
    if (pieceBytes + segBytes > room) {
      chunks.push(head + text.slice(pieceStart, segStart) + tail);
      pieceStart = segStart;
      pieceBytes = 0;
    }
    pieceBytes += segBytes;
    segStart = end;
    lastEnd = end;
  }
  if (lastEnd > pieceStart) chunks.push(head + text.slice(pieceStart, lastEnd) + tail);
  const skeleton = text.slice(0, first.index) + text.slice(lastEnd);
  if (utf8Length(skeleton) > limits.structureBytes) throw partTooLarge();
  return { chunks, skeleton };
}
