// Reads an .xlsx into plain text cells for the import review (RFQ brief §5,
// proposal §9, Amendment A5). Never evaluates formulas, never runs macros,
// never fetches anything (no network I/O at all). Formula cells use their saved
// result and are flagged; a formula without a saved result, or an error value,
// is flagged as a row error. Numbers are read from the XML text and kept exact.
//
// PB-7: all unbounded work — ZIP, inflating with counted bytes, size and ratio
// limits, and cutting large parts into small pieces — runs in a dedicated Web
// Worker (xlsx.worker.ts) that Cancel or the 30-second limit terminates at once.
// XML is parsed by the platform parser the caller supplies (DOMParser, which
// does not exist in workers) one small piece at a time (≤ 256 KiB of UTF-8, checked
// before every parse; structure ≤ 1 MiB — PB-7-R1), yielding to
// the page between pieces and checking the AbortSignal before each one. No
// handwritten XML parser and no dependency.

import { IMPORT_LIMITS, ImportError, limitVars, utf8Length, type ImportCell, type ImportSheet, type ImportWorkbook } from "@shared/boq-import";
import type { XmlChunks } from "./chunks";
import { exactDecimal, serialToDate } from "./numbers";

/** Where the workbook's parts come from (the worker in the app). */
export interface PartSource {
  entries(): string[];
  text(path: string, max: number): Promise<string | null>;
  chunks(path: string, max: number, element: "row" | "si"): Promise<XmlChunks | null>;
  close(): void;
}

/** Start a worker holding the file. Rejects with ImportError for a non-ZIP file. */
export async function openWorkerSource(buffer: ArrayBuffer, signal?: AbortSignal): Promise<PartSource> {
  const worker = new Worker(new URL("./xlsx.worker.ts", import.meta.url), { type: "module" });
  let seq = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();
  const abortError = () => new DOMException("Aborted", "AbortError");
  const close = () => {
    worker.terminate();
    for (const p of pending.values()) p.reject(abortError());
    pending.clear();
  };
  signal?.addEventListener("abort", close, { once: true });
  worker.onmessage = (ev: MessageEvent<{ id: number; ok: boolean; value?: unknown; error?: { key: string; vars: Record<string, string> } }>) => {
    const p = pending.get(ev.data.id);
    if (!p) return;
    pending.delete(ev.data.id);
    if (ev.data.ok) p.resolve(ev.data.value);
    else p.reject(new ImportError(ev.data.error!.key as ConstructorParameters<typeof ImportError>[0], ev.data.error!.vars));
  };
  worker.onerror = () => { for (const p of pending.values()) p.reject(unsupported()); pending.clear(); };
  const call = <T,>(msg: Record<string, unknown>, transfer: Transferable[] = []) => {
    if (signal?.aborted) return Promise.reject(abortError());
    const id = ++seq;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ ...msg, id }, transfer);
    });
  };
  const names = await call<string[]>({ op: "open", buffer }, [buffer]);
  return {
    entries: () => names,
    text: (path, max) => call<string | null>({ op: "text", path, max }),
    chunks: (path, max, element) => call<XmlChunks | null>({ op: "chunks", path, max, element }),
    close,
  };
}

const yieldToPage = () => new Promise<void>((r) => setTimeout(r, 0));

export type ParseXml = (text: string) => Document;

const WORKBOOK_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml",
]);

const unsupported = () => new ImportError("import.unsupportedFormat");
const local = (el: Element, name: string) => Array.from(el.getElementsByTagNameNS("*", name));
const first = (el: Element | Document, name: string) => (el as Element).getElementsByTagNameNS("*", name)[0] as Element | undefined;
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function columnIndex(ref: string | null): number | null {
  const m = ref ? /^([A-Z]{1,3})\d+$/.exec(ref) : null;
  if (!m) return null;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
export function isDateFormat(id: number, code: string | undefined): boolean {
  if (BUILTIN_DATE_FORMATS.has(id)) return true;
  if (!code) return false;
  const bare = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
  return /[dmy]/i.test(bare) && !/^general$/i.test(bare.trim());
}

/** Read and validate the workbook. Throws ImportError (copy key + variables) or AbortError. */
export async function readWorkbook(buffer: ArrayBuffer, parseXml: ParseXml, signal?: AbortSignal, open: typeof openWorkerSource = openWorkerSource): Promise<ImportWorkbook> {
  if (buffer.byteLength > IMPORT_LIMITS.fileBytes) throw new ImportError("import.fileTooLarge", { ...limitVars["import.fileTooLarge"] });
  const source = await open(buffer, signal);
  try {
    return await readFromSource(source, parseXml, signal);
  } finally {
    source.close();
  }
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

// PB-7-R1: the page never parses more than these, whatever the source sent.
function parseOrFail(parseXml: ParseXml, text: string, maxBytes: number): Document {
  if (utf8Length(text) > maxBytes) throw maxBytes === IMPORT_LIMITS.pieceBytes
    ? new ImportError("import.rowTooLarge", { ...limitVars["import.rowTooLarge"], row: "?" })
    : new ImportError("import.partTooLarge", { ...limitVars["import.partTooLarge"] });
  const doc = parseXml(text);
  if (doc.getElementsByTagName("parsererror").length) throw unsupported();
  return doc;
}

async function readFromSource(source: PartSource, parseXml: ParseXml, signal?: AbortSignal): Promise<ImportWorkbook> {
  const entries = new Set(source.entries());
  const xml = async (path: string, max: number): Promise<Document | null> => {
    checkAbort(signal);
    const text = await source.text(path, max);
    checkAbort(signal);
    return text === null ? null : parseOrFail(parseXml, text, IMPORT_LIMITS.structureBytes);
  };
  // Large parts arrive as small pieces, parsed one at a time with a pause between them.
  const pieces = async function* (path: string, max: number, element: "row" | "si") {
    checkAbort(signal);
    const res = await source.chunks(path, max, element);
    if (!res) return;
    // Everything outside the pieces must parse and hold no content of its own.
    const skeleton = parseOrFail(parseXml, res.skeleton, IMPORT_LIMITS.structureBytes);
    const leftovers = local(skeleton.documentElement, element).filter((el) => el.childNodes.length > 0);
    if (leftovers.length) throw unsupported();
    await yieldToPage();
    for (const chunk of res.chunks) {
      checkAbort(signal);
      yield parseOrFail(parseXml, chunk, IMPORT_LIMITS.pieceBytes);
      await yieldToPage();
    }
  };
  const SMALL = 2 * 1024 * 1024;

  // .xlsx only: a workbook part of the plain spreadsheet type (macro-enabled and binary are refused).
  const types = await xml("[Content_Types].xml", SMALL);
  if (!types) throw unsupported();
  const rootRels = await xml("_rels/.rels", SMALL);
  const officeRel = rootRels ? local(rootRels.documentElement, "Relationship").find((r) => /\/officeDocument$/.test(r.getAttribute("Type") ?? "")) : undefined;
  const workbookPath = (officeRel?.getAttribute("Target") ?? "xl/workbook.xml").replace(/^\//, "");
  const override = local(types.documentElement, "Override").find((o) => (o.getAttribute("PartName") ?? "").replace(/^\//, "") === workbookPath);
  if (!override || !WORKBOOK_TYPES.has(override.getAttribute("ContentType") ?? "")) throw unsupported();

  const workbook = await xml(workbookPath, SMALL);
  if (!workbook) throw unsupported();
  const baseDir = workbookPath.includes("/") ? workbookPath.slice(0, workbookPath.lastIndexOf("/") + 1) : "";
  const relsPath = `${baseDir}_rels/${workbookPath.slice(baseDir.length)}.rels`;
  const rels = await xml(relsPath, SMALL);
  const relTarget = new Map<string, string>();
  for (const r of rels ? local(rels.documentElement, "Relationship") : []) {
    const target = r.getAttribute("Target") ?? "";
    if (r.getAttribute("TargetMode") === "External") continue; // never followed
    relTarget.set(r.getAttribute("Id") ?? "", target.startsWith("/") ? target.slice(1) : normalizePath(baseDir + target));
  }
  const pr = first(workbook, "workbookPr");
  const date1904 = !!pr && /^(1|true)$/i.test(pr.getAttribute("date1904") ?? "");

  // Shared strings: rich-text runs joined; phonetic hints (rPh) left out.
  const sharedStrings: string[] = [];
  for await (const sst of pieces(`${baseDir}sharedStrings.xml`, IMPORT_LIMITS.sharedStringsBytes, "si")) {
    for (const si of local(sst.documentElement, "si")) {
      sharedStrings.push(local(si, "t").filter((t) => (t.parentNode as Element)?.localName !== "rPh").map((t) => t.textContent ?? "").join(""));
    }
  }

  // Number formats → which style indexes are dates.
  const dateStyles = new Set<number>();
  const styles = await xml(`${baseDir}styles.xml`, SMALL);
  if (styles) {
    const codes = new Map<number, string>();
    for (const f of local(styles.documentElement, "numFmt")) codes.set(Number(f.getAttribute("numFmtId")), f.getAttribute("formatCode") ?? "");
    const xfs = first(styles, "cellXfs");
    if (xfs) local(xfs, "xf").forEach((xf, i) => { const id = Number(xf.getAttribute("numFmtId") ?? 0); if (isDateFormat(id, codes.get(id))) dateStyles.add(i); });
  }

  const sheets: ImportSheet[] = [];
  for (const s of local(workbook.documentElement, "sheet")) {
    const name = s.getAttribute("name") ?? "Sheet";
    const rid = s.getAttributeNS(REL_NS, "id") || s.getAttribute("r:id");
    const path = rid ? relTarget.get(rid) : undefined;
    if (!path || !entries.has(path)) continue;
    const reader = new SheetReader(name, sharedStrings, dateStyles, date1904);
    for await (const doc of pieces(path, IMPORT_LIMITS.sheetBytes, "row")) reader.add(doc);
    sheets.push(reader.finish());
  }
  if (!sheets.length) throw unsupported();

  const embeddedImages = Array.from(entries).some((n) => n.startsWith(`${baseDir}media/`) || n.startsWith(`${baseDir}drawings/`));
  return { sheets, embeddedImages };
}

function normalizePath(p: string): string {
  const out: string[] = [];
  for (const part of p.split("/")) {
    if (part === "..") out.pop();
    else if (part && part !== ".") out.push(part);
  }
  return out.join("/");
}

/** Rows accumulate across pieces; the limits apply to the sheet as a whole. */
class SheetReader {
  private rows: ImportSheet["rows"] = [];
  private columnCount = 0;
  private nextRow = 1;
  private contentRows = 0;
  constructor(private name: string, private shared: string[], private dateStyles: Set<number>, private date1904: boolean) {}

  add(doc: Document) {
    const { shared, dateStyles, date1904 } = this;
    for (const row of local(doc.documentElement, "row")) {
      const rowNumber = Number(row.getAttribute("r")) || this.nextRow;
      this.nextRow = rowNumber + 1;
      const cells: ImportCell[] = [];
      let nextCol = 0;
      let hasContent = false;
      for (const c of local(row, "c")) {
        const col = columnIndex(c.getAttribute("r")) ?? nextCol;
        nextCol = col + 1;
        const cell = readCell(c, shared, dateStyles, date1904);
        if (!cell.text && !cell.formulaWithoutValue) continue;
        if (col >= IMPORT_LIMITS.columns) throw new ImportError("import.tooManyColumns", { ...limitVars["import.tooManyColumns"] });
        if (cell.text.length > IMPORT_LIMITS.cellChars) throw new ImportError("import.cellTooLong", { ...limitVars["import.cellTooLong"] });
        while (cells.length < col) cells.push({ text: "" });
        cells[col] = cell;
        hasContent = true;
      }
      if (!hasContent) continue;
      // Header + the item rows; stop as soon as there are more.
      if (++this.contentRows > IMPORT_LIMITS.itemRows + 1) throw new ImportError("import.tooManyRows", { ...limitVars["import.tooManyRows"] });
      this.columnCount = Math.max(this.columnCount, cells.length);
      this.rows.push({ rowNumber, cells });
    }
  }

  finish(): ImportSheet {
    for (const r of this.rows) while (r.cells.length < this.columnCount) r.cells.push({ text: "" });
    return { name: this.name, rows: this.rows, columnCount: this.columnCount };
  }
}

function readCell(c: Element, shared: string[], dateStyles: Set<number>, date1904: boolean): ImportCell {
  const type = c.getAttribute("t") ?? "n";
  const v = first(c, "v")?.textContent ?? null;
  const hasFormula = !!first(c, "f");
  if (type === "e") return { text: "", formulaWithoutValue: true };
  if (hasFormula && (v === null || v === "")) return { text: "", formulaWithoutValue: true };
  const cached = hasFormula ? { cachedFormula: true } : {};
  switch (type) {
    case "s": return { text: shared[Number(v)] ?? "", ...cached };
    case "inlineStr": {
      const is = first(c, "is");
      return { text: is ? local(is, "t").filter((t) => (t.parentNode as Element)?.localName !== "rPh").map((t) => t.textContent ?? "").join("") : "", ...cached };
    }
    case "str": return { text: v ?? "", ...cached };
    case "b": return { text: v === "1" ? "TRUE" : v === "0" ? "FALSE" : "", ...cached };
    case "d": return { text: (v ?? "").slice(0, 10), ...cached };
    default: {
      if (v === null || v === "") return { text: "" };
      const style = Number(c.getAttribute("s") ?? -1);
      if (dateStyles.has(style)) return { text: serialToDate(v, date1904) ?? "", ...cached };
      const exact = exactDecimal(v);
      // An unreadable number is not silently dropped: it shows as typed and fails validation.
      return { text: exact ?? v, ...cached };
    }
  }
}
