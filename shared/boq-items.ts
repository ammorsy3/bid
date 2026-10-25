// Bill-of-quantities items (RFQ brief §4; proposal §2, §5, §7). Shared by the
// BOQ editor, the Excel import review and the server, which re-validates
// everything it receives (labels and cell text are untrusted input).

import { parseBoqQuantity, parsePrice, MAX_ITEMS, type MoneyError } from "./boq-money";

export const ITEM_LIMITS = { name: 300, description: 2000, unit: 40, customText: 500, columns: 10, columnLabel: 60 } as const;
export const COLUMN_TYPES = ["text", "number", "date"] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export interface ItemColumn {
  id: string;
  label: string;
  type: ColumnType;
  position: number;
}

/** An item as the editor and the API exchange it. Numbers are decimal strings. */
export interface BoqItemInput {
  /** Client key for an unsaved row, or the server id. Display order is the array order. */
  key?: string;
  name: string;
  description?: string | null;
  unit: string;
  quantity: string;
  referenceUnitPrice?: string | null;
  imageUrl?: string | null;
  customValues?: Record<string, string | null> | null;
}

export type ItemFieldError =
  | { field: "name"; key: "boq.nameRequired" | "boq.tooLong" }
  | { field: "unit"; key: "boq.unitRequired" | "boq.tooLong" }
  | { field: "description"; key: "boq.tooLong" }
  | { field: "quantity"; error: MoneyError }
  | { field: "referenceUnitPrice"; error: MoneyError }
  | { field: `custom:${string}`; key: "boq.customInvalid" };

export interface ItemsValidation {
  ok: boolean;
  /** Errors by row index. */
  rows: Record<number, ItemFieldError[]>;
  list: ("ITEMS_REQUIRED" | "TOO_MANY_ITEMS" | "TOO_MANY_COLUMNS" | "COLUMN_INVALID" | "DUPLICATE_COLUMN")[];
}

// Control characters (except tab/newline) never come from a person typing.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export const cleanText = (v: unknown): string => (typeof v === "string" ? v.replace(CONTROL, "").trim() : "");

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const NUMBER = /^-?\d{1,15}(\.\d{1,6})?$/;

export function validCustomValue(type: ColumnType, value: string): boolean {
  if (value === "") return true;
  if (type === "date") {
    // Round-trip, so 2026-02-30 (which Date would roll to March) is refused.
    const d = new Date(`${value}T00:00:00Z`);
    return DATE.test(value) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  if (type === "number") return NUMBER.test(value);
  return value.length <= ITEM_LIMITS.customText;
}

export function normalizeColumnLabel(label: string): string {
  return cleanText(label).normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase();
}

export function validateColumns(columns: ItemColumn[]): ItemsValidation["list"] {
  const out: ItemsValidation["list"] = [];
  if (columns.length > ITEM_LIMITS.columns) out.push("TOO_MANY_COLUMNS");
  const seen = new Set<string>();
  for (const c of columns) {
    const label = cleanText(c.label);
    if (!c.id || !label || label.length > ITEM_LIMITS.columnLabel || !COLUMN_TYPES.includes(c.type)) out.push("COLUMN_INVALID");
    const norm = normalizeColumnLabel(label);
    if (seen.has(norm)) out.push("DUPLICATE_COLUMN");
    seen.add(norm);
  }
  return [...new Set(out)];
}

/** Validate a whole item list (lenient: typed text, Arabic digits accepted). */
export function validateItems(items: BoqItemInput[], columns: ItemColumn[], { lenient = true } = {}): ItemsValidation {
  const rows: ItemsValidation["rows"] = {};
  const list = validateColumns(columns);
  if (items.length === 0) list.push("ITEMS_REQUIRED");
  if (items.length > MAX_ITEMS) list.push("TOO_MANY_ITEMS");
  const colById = new Map(columns.map((c) => [c.id, c]));
  items.forEach((item, i) => {
    const errs: ItemFieldError[] = [];
    const name = cleanText(item.name);
    if (!name) errs.push({ field: "name", key: "boq.nameRequired" });
    else if (name.length > ITEM_LIMITS.name) errs.push({ field: "name", key: "boq.tooLong" });
    const unit = cleanText(item.unit);
    if (!unit) errs.push({ field: "unit", key: "boq.unitRequired" });
    else if (unit.length > ITEM_LIMITS.unit) errs.push({ field: "unit", key: "boq.tooLong" });
    if (cleanText(item.description).length > ITEM_LIMITS.description) errs.push({ field: "description", key: "boq.tooLong" });
    const q = parseBoqQuantity(item.quantity, lenient);
    if (!q.ok) errs.push({ field: "quantity", error: q.error });
    if (item.referenceUnitPrice != null && cleanText(item.referenceUnitPrice) !== "") {
      const p = parsePrice(lenient ? item.referenceUnitPrice : item.referenceUnitPrice, lenient);
      if (!p.ok) errs.push({ field: "referenceUnitPrice", error: p.error });
    }
    for (const [colId, raw] of Object.entries(item.customValues ?? {})) {
      const col = colById.get(colId);
      const v = cleanText(raw);
      if (!col) { if (v) errs.push({ field: `custom:${colId}`, key: "boq.customInvalid" }); continue; }
      if (!validCustomValue(col.type, v)) errs.push({ field: `custom:${colId}`, key: "boq.customInvalid" });
    }
    if (errs.length) rows[i] = errs;
  });
  return { ok: list.length === 0 && Object.keys(rows).length === 0, rows, list };
}

/** Canonical form stored by the server (strings trimmed, numbers canonical, empty → null). */
export function normalizeItem(item: BoqItemInput, columns: ItemColumn[], lenient = true) {
  const q = parseBoqQuantity(item.quantity, lenient);
  const p = item.referenceUnitPrice != null && cleanText(item.referenceUnitPrice) !== "" ? parsePrice(item.referenceUnitPrice, lenient) : null;
  const custom: Record<string, string> = {};
  for (const c of columns) {
    const v = cleanText(item.customValues?.[c.id]);
    if (v !== "") custom[c.id] = v;
  }
  return {
    name: cleanText(item.name),
    description: cleanText(item.description) || null,
    unit: cleanText(item.unit),
    quantity: q.ok ? q.text : "",
    referenceUnitPrice: p && p.ok ? p.text : null,
    imageUrl: item.imageUrl ? String(item.imageUrl) : null,
    customValues: Object.keys(custom).length ? custom : null,
  };
}

export interface StoredItem {
  id: string;
  position: number;
  name: string;
  description: string | null;
  unit: string;
  quantity: string;
  referenceUnitPrice: string | null;
  imageUrl: string | null;
  customValues: Record<string, string> | null;
}

/**
 * The items as a vendor may see them (AC4, AC5). Reference prices are removed
 * unless the requester chose to show them — removed from the data, not hidden
 * by CSS. Optional columns with no value on any item are suppressed; a column
 * with a value on some items stays; "0" is a value.
 */
export function vendorItemView(items: StoredItem[], columns: ItemColumn[] | null, showReferencePrices: boolean) {
  const cols = [...(columns ?? [])].sort((a, b) => a.position - b.position);
  const has = (get: (i: StoredItem) => string | null | undefined) => items.some((i) => { const v = get(i); return v !== null && v !== undefined && v !== ""; });
  const visibleColumns = cols.filter((c) => has((i) => i.customValues?.[c.id]));
  const showRef = showReferencePrices && has((i) => i.referenceUnitPrice);
  return {
    columns: visibleColumns,
    optional: { description: has((i) => i.description), image: has((i) => i.imageUrl), referenceUnitPrice: showRef },
    items: [...items].sort((a, b) => a.position - b.position).map((i) => ({
      id: i.id,
      position: i.position,
      name: i.name,
      description: i.description,
      unit: i.unit,
      quantity: i.quantity,
      imageUrl: i.imageUrl,
      ...(showRef ? { referenceUnitPrice: i.referenceUnitPrice } : {}),
      customValues: Object.fromEntries(visibleColumns.map((c) => [c.id, i.customValues?.[c.id] ?? null])),
    })),
  };
}

/** Legacy deliverables mirror for itemized requests: name, description, unit, quantity only. */
export function deliverablesMirror(items: StoredItem[]) {
  return [...items].sort((a, b) => a.position - b.position).map((i) => ({
    id: i.id, name: i.name, description: i.description ?? "", unit: i.unit, quantity: Number(i.quantity),
  }));
}
