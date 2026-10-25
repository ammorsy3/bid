// Excel import of a bill of quantities: limits, header recognition and the
// conversion of reviewed rows into editor items (RFQ brief §5, proposal §9).
// The workbook reader itself is client/src/lib/xlsx; the server never parses
// workbooks — it re-validates the resulting items like any typed ones.

import { cleanText, normalizeColumnLabel, validateItems, type BoqItemInput, type ColumnType, type ItemColumn } from "./boq-items";

export const IMPORT_LIMITS = {
  fileBytes: 5 * 1024 * 1024,
  zipEntries: 1000,
  sheetBytes: 50 * 1024 * 1024,
  sharedStringsBytes: 20 * 1024 * 1024,
  totalBytes: 80 * 1024 * 1024,
  inflateRatio: 100,
  itemRows: 2000,
  columns: 30,
  cellChars: 2000,
  timeoutMs: 30_000,
  /** PB-7-R1: the most XML the page parses in one step (UTF-8 bytes, wrapper included). */
  pieceBytes: 256 * 1024,
  /** PB-7-R1: the most for a part's structure outside its rows, and for small parts. */
  structureBytes: 1024 * 1024,
} as const;

export type ImportErrorCode =
  | "import.unsupportedFormat" | "import.fileTooLarge" | "import.tooManyRows" | "import.tooManyColumns" | "import.cellTooLong"
  | "import.rowTooLarge" | "import.partTooLarge";

export class ImportError extends Error {
  constructor(public key: ImportErrorCode, public vars: Record<string, string> = {}) {
    super(key);
    this.name = "ImportError";
  }
}

export const limitVars = {
  "import.fileTooLarge": { maxSize: "5 MB" },
  "import.tooManyRows": { maxRows: String(IMPORT_LIMITS.itemRows) },
  "import.tooManyColumns": { maxColumns: String(IMPORT_LIMITS.columns) },
  "import.cellTooLong": { maxCharacters: String(IMPORT_LIMITS.cellChars) },
  "import.rowTooLarge": { maxSize: "256 KB" },
  "import.partTooLarge": { maxSize: "1 MB" },
} as const;

/** UTF-8 byte length without allocating a copy (lone surrogates count as 3, as TextEncoder writes U+FFFD). */
export function utf8Length(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length && (s.charCodeAt(i + 1) & 0xfc00) === 0xdc00) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

/** A cell as the reader returns it: always text (numbers as exact decimal strings). */
export interface ImportCell {
  text: string;
  /** The value came from a formula's saved result (import.cachedFormulaNotice). */
  cachedFormula?: boolean;
  /** A formula with no saved result, or an error value (import.formulaWithoutValue). */
  formulaWithoutValue?: boolean;
}

export interface ImportSheet {
  name: string;
  /** Header row first; rows keep their sheet row numbers for messages. */
  rows: { rowNumber: number; cells: ImportCell[] }[];
  columnCount: number;
}

export interface ImportWorkbook {
  sheets: ImportSheet[];
  embeddedImages: boolean;
}

export const REQUEST_FIELDS = ["name", "description", "unit", "quantity", "referenceUnitPrice"] as const;
export type RequestField = (typeof REQUEST_FIELDS)[number];

export type ColumnMapping =
  | { kind: "field"; field: RequestField }
  | { kind: "custom"; label: string; type: ColumnType }
  | { kind: "ignore" };

// Common English and Arabic headers (normalised: NFKC, trimmed, collapsed, lower case).
const SYNONYMS: Record<RequestField, string[]> = {
  name: ["item", "item name", "name", "description of item", "product", "material", "اسم البند", "البند", "الصنف", "اسم الصنف", "المادة", "البيان"],
  description: ["description", "details", "specification", "specifications", "spec", "الوصف", "المواصفات", "التفاصيل", "وصف البند"],
  unit: ["unit", "uom", "unit of measure", "unit of measurement", "الوحدة", "وحدة القياس"],
  quantity: ["quantity", "qty", "qty.", "الكمية", "العدد"],
  referenceUnitPrice: ["unit price", "reference price", "reference unit price", "estimated unit price", "rate", "سعر الوحدة", "السعر التقديري", "سعر الوحدة التقديري", "السعر"],
};

const norm = (s: string) => normalizeColumnLabel(s).replace(/[:.*]+$/, "").trim();

/** Header text → request field, only when exactly one field matches (ambiguous stays unmapped). */
export function guessField(header: string): RequestField | null {
  const h = norm(header);
  if (!h) return null;
  const hits = REQUEST_FIELDS.filter((f) => SYNONYMS[f].includes(h));
  return hits.length === 1 ? hits[0] : null;
}

/**
 * The initial mapping: recognised headers map to fields (each field at most
 * once — a second match is left for the user), everything else becomes a
 * custom text column, empty headers are ignored.
 */
export function initialMapping(headers: string[]): ColumnMapping[] {
  const used = new Set<RequestField>();
  return headers.map((h) => {
    const f = guessField(h);
    if (f && !used.has(f)) { used.add(f); return { kind: "field", field: f }; }
    if (!cleanText(h)) return { kind: "ignore" };
    return { kind: "custom", label: cleanText(h).slice(0, 60), type: "text" };
  });
}

export type MappingProblem =
  | { key: "import.duplicateHeader"; vars: { name: string } }
  | { key: "import.fieldMappedTwice"; vars: { field: string } }
  | { key: "import.requiredFieldMissing"; vars: { field: string } }
  | { key: "import.customLabelRequired"; vars: Record<string, never> }
  | { key: "import.tooManyCustomColumns"; vars: { max: string } };

/** Problems that block continuing from the mapping step. */
export function mappingProblems(mapping: ColumnMapping[], existingColumns: ItemColumn[] = []): MappingProblem[] {
  const out: MappingProblem[] = [];
  const fields = mapping.filter((m): m is Extract<ColumnMapping, { kind: "field" }> => m.kind === "field").map((m) => m.field);
  for (const f of new Set(fields)) if (fields.filter((x) => x === f).length > 1) out.push({ key: "import.fieldMappedTwice", vars: { field: f } });
  for (const f of ["name", "unit", "quantity"] as const) if (!fields.includes(f)) out.push({ key: "import.requiredFieldMissing", vars: { field: f } });
  const labels = new Map<string, string>();
  for (const c of existingColumns) labels.set(normalizeColumnLabel(c.label), c.label);
  let customCount = 0;
  for (const m of mapping) {
    if (m.kind !== "custom") continue;
    customCount++;
    const label = cleanText(m.label);
    if (!label) { out.push({ key: "import.customLabelRequired", vars: {} }); continue; }
    const n = normalizeColumnLabel(label);
    if (labels.has(n)) out.push({ key: "import.duplicateHeader", vars: { name: label } });
    labels.set(n, label);
  }
  if (customCount + existingColumns.length > 10) out.push({ key: "import.tooManyCustomColumns", vars: { max: "10" } });
  return out;
}

export interface ReviewRow {
  rowNumber: number;
  item: BoqItemInput;
  /** Cells that came from a cached formula result (to highlight). */
  cachedFields: string[];
  /** Row-level problems: messages as i18n keys. */
  errors: { key: string; vars?: Record<string, string> }[];
}

const EMPTY = (cells: ImportCell[]) => cells.every((c) => !c.text.trim() && !c.formulaWithoutValue);

/**
 * Data rows → editor items under this mapping. Nothing is dropped silently:
 * empty rows are skipped (they hold nothing), every other row is returned,
 * with its errors, for the review step. Empty numbers stay empty (never 0) and
 * nothing is rounded.
 */
export function rowsToItems(sheet: ImportSheet, mapping: ColumnMapping[], customColumns: ItemColumn[]): ReviewRow[] {
  const [, ...data] = sheet.rows;
  const customByIndex = new Map<number, ItemColumn>();
  let ci = 0;
  mapping.forEach((m, i) => { if (m.kind === "custom") customByIndex.set(i, customColumns[ci++]); });
  const out: ReviewRow[] = [];
  for (const row of data) {
    if (EMPTY(row.cells)) continue;
    const item: BoqItemInput = { name: "", description: "", unit: "", quantity: "", referenceUnitPrice: "", imageUrl: null, customValues: {} };
    const cachedFields: string[] = [];
    const errors: ReviewRow["errors"] = [];
    mapping.forEach((m, i) => {
      const cell = row.cells[i] ?? { text: "" };
      if (cell.formulaWithoutValue) errors.push({ key: "import.formulaWithoutValue" });
      if (m.kind === "ignore") return;
      const field = m.kind === "field" ? m.field : `custom:${customByIndex.get(i)!.id}`;
      if (cell.cachedFormula) cachedFields.push(field);
      if (m.kind === "field") (item as unknown as Record<string, string>)[m.field] = cell.text;
      else item.customValues![customByIndex.get(i)!.id] = cell.text;
    });
    out.push({ rowNumber: row.rowNumber, item, cachedFields, errors });
  }
  return out;
}

/** Re-validate reviewed rows with the editor's rules; returns errors per row index. */
export function reviewErrors(rows: ReviewRow[], columns: ItemColumn[]) {
  return validateItems(rows.map((r) => r.item), columns).rows;
}
