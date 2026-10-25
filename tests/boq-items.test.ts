// RFQ-B1: item validation, vendor-safe view (AC4, AC5) and the legacy mirror.
import { describe, it, expect } from "vitest";
import { validateItems, normalizeItem, vendorItemView, deliverablesMirror, validateColumns, type ItemColumn, type StoredItem } from "../shared/boq-items";

const COLS: ItemColumn[] = [
  { id: "brand", label: "Brand", type: "text", position: 0 },
  { id: "spec", label: "Spec no.", type: "number", position: 1 },
  { id: "due", label: "Due", type: "date", position: 2 },
];

describe("validateItems", () => {
  it("name, unit and quantity are required; quantity follows the shared rule", () => {
    const v = validateItems([{ name: " ", unit: "", quantity: "0" }, { name: "Cement", unit: "bag", quantity: "1.23456" }], COLS);
    expect(v.ok).toBe(false);
    expect(v.rows[0]).toEqual([{ field: "name", key: "boq.nameRequired" }, { field: "unit", key: "boq.unitRequired" }, { field: "quantity", error: "nonPositive" }]);
    expect(v.rows[1]).toEqual([{ field: "quantity", error: "precision" }]);
  });
  it("typed Arabic digits are accepted; custom values are checked by column type", () => {
    const v = validateItems([{ name: "Cement", unit: "bag", quantity: "١٠٠", referenceUnitPrice: "18.5", customValues: { spec: "12.5", due: "2026-02-30", brand: "X" } }], COLS);
    expect(v.rows[0]).toEqual([{ field: "custom:due", key: "boq.customInvalid" }]);
  });
  it("list rules: at least one item, ≤ 10 columns, no duplicate (normalised) column names", () => {
    expect(validateItems([], COLS).list).toEqual(["ITEMS_REQUIRED"]);
    expect(validateColumns([...COLS, { id: "b2", label: "  BRAND ", type: "text", position: 3 }])).toEqual(["DUPLICATE_COLUMN"]);
    expect(validateColumns(Array.from({ length: 11 }, (_, i) => ({ id: `c${i}`, label: `C${i}`, type: "text" as const, position: i })))).toContain("TOO_MANY_COLUMNS");
  });
  it("normalizeItem: canonical numbers, control characters stripped, empty → null", () => {
    expect(normalizeItem({ name: "Ce\u0007ment ", unit: " bag", quantity: "٢٫٥٠", referenceUnitPrice: "", customValues: { brand: " ", spec: "0" } }, COLS))
      .toEqual({ name: "Cement", description: null, unit: "bag", quantity: "2.5", referenceUnitPrice: null, imageUrl: null, customValues: { spec: "0" } });
  });
});

const item = (over: Partial<StoredItem>): StoredItem => ({ id: "i", position: 0, name: "n", description: null, unit: "u", quantity: "1", referenceUnitPrice: null, imageUrl: null, customValues: null, ...over });

describe("vendorItemView", () => {
  const items = [
    item({ id: "a", position: 1, referenceUnitPrice: "10.00", customValues: { spec: "0" } }),
    item({ id: "b", position: 0, description: "d", customValues: null }),
  ];
  it("hidden reference prices are not in the data at all", () => {
    const v = vendorItemView(items, COLS, false);
    expect(v.items.some((i) => "referenceUnitPrice" in i)).toBe(false);
    expect(JSON.stringify(v)).not.toContain("10.00");
  });
  it("shown reference prices are included", () => {
    expect(vendorItemView(items, COLS, true).items.find((i) => i.id === "a")).toMatchObject({ referenceUnitPrice: "10.00" });
  });
  it("empty optional columns are suppressed; a partly filled column and zero stay", () => {
    const v = vendorItemView(items, COLS, false);
    expect(v.columns.map((c) => c.id)).toEqual(["spec"]);
    expect(v.items.map((i) => [i.id, i.customValues])).toEqual([["b", { spec: null }], ["a", { spec: "0" }]]);
    expect(v.optional).toEqual({ description: true, image: false, referenceUnitPrice: false });
  });
  it("suppression does not change the stored items", () => {
    vendorItemView(items, COLS, false);
    expect(items[0].customValues).toEqual({ spec: "0" });
  });
  it("mirror carries name, description, unit, quantity only — never reference prices", () => {
    expect(deliverablesMirror(items)).toEqual([{ id: "b", name: "n", description: "d", unit: "u", quantity: 1 }, { id: "a", name: "n", description: "", unit: "u", quantity: 1 }]);
  });
});
