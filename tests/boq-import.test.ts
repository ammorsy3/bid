// RFQ-C1/C2 pure parts: exact numbers (Amendment A5), dates, the bounded ZIP
// reader (real inflate, counted bytes, ratio and size limits), header
// recognition and the row → item conversion (nothing silently dropped or
// zero-filled). The full workbook reader runs in a real browser
// (.mobile-audit/product-build/import-fixtures.mjs) because it uses DOMParser.
import { describe, it, expect } from "vitest";
import { deflateRawSync } from "node:zlib";
import { exactDecimal, serialToDate } from "../client/src/lib/xlsx/numbers";
import { readCentralDirectory, readEntry } from "../client/src/lib/xlsx/zip";
import { zipStored, crc32 } from "../client/src/lib/xlsx/writer";
import { guessField, initialMapping, mappingProblems, rowsToItems, reviewErrors, ImportError, type ImportSheet } from "../shared/boq-import";

describe("exactDecimal", () => {
  it.each([
    ["100", "100"], ["2.5", "2.5"], ["2.5000", "2.5"], ["1.5E-3", "0.0015"], ["1.2345E+5", "123450"], ["1.2345E5", "123450"],
    ["0.1", "0.1"], ["0.30000000000000004", "0.30000000000000004"], ["5E-21", null], ["1e21", null], ["123456789012345678", null], ["-2", "-2"], ["abc", null], ["", null],
  ])("%s → %s", (text, out) => expect(exactDecimal(text)).toBe(out));
});

describe("serialToDate", () => {
  it("1900 and 1904 systems, including Excel's 1900-02-29", () => {
    expect(serialToDate("45292", false)).toBe("2024-01-01");
    expect(serialToDate("43830", true)).toBe("2024-01-01");
    expect(serialToDate("61", false)).toBe("1900-03-01");
    expect(serialToDate("60", false)).toBeNull();
    expect(serialToDate("45292.75", false)).toBe("2024-01-01");
  });
});

// A ZIP with one deflated entry (as Excel writes them).
function zipDeflated(name: string, data: Uint8Array) {
  const comp = deflateRawSync(data);
  const nameB = new TextEncoder().encode(name);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameB.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(crc32(data), 16);
  cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(nameB.length, 28); cd.writeUInt32LE(0, 42);
  const off = 30 + nameB.length + comp.length;
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(46 + nameB.length, 12); end.writeUInt32LE(off, 16);
  return new Uint8Array(Buffer.concat([local, nameB, comp, cd, nameB, end]));
}

describe("zip reader", () => {
  it("reads stored and deflated entries", async () => {
    const z = zipStored([{ name: "a.txt", data: new TextEncoder().encode("hello") }]);
    const e = readCentralDirectory(z);
    expect(new TextDecoder().decode(await readEntry(z, e.get("a.txt")!, 1000, { used: 0 }))).toBe("hello");
    const big = new TextEncoder().encode("x".repeat(5000));
    const d = zipDeflated("b.xml", big);
    expect((await readEntry(d, readCentralDirectory(d).get("b.xml")!, 10_000, { used: 0 })).length).toBe(5000);
  });
  it("a zip bomb stops at the ratio cap while inflating (declared sizes are not trusted)", async () => {
    const bomb = zipDeflated("sheet.xml", new Uint8Array(20 * 1024 * 1024)); // ~20 KB compressed → 20 MB
    const entry = readCentralDirectory(bomb).get("sheet.xml")!;
    await expect(readEntry(bomb, entry, 50 * 1024 * 1024, { used: 0 })).rejects.toMatchObject({ key: "import.fileTooLarge" });
  });
  it("the per-entry cap holds even within the ratio", async () => {
    const data = new TextEncoder().encode(Array.from({ length: 4000 }, (_, i) => `row${i * 7919}`).join(","));
    const z = zipDeflated("s.xml", data);
    await expect(readEntry(z, readCentralDirectory(z).get("s.xml")!, 1000, { used: 0 })).rejects.toBeInstanceOf(ImportError);
  });
  it("not a zip, or encrypted → unsupported format", () => {
    expect(() => readCentralDirectory(new TextEncoder().encode("name,qty\nCement,100"))).toThrow(ImportError);
    const z = zipStored([{ name: "a", data: new Uint8Array(1) }]);
    const view = new DataView(z.buffer); const cd = z.length - 22 - 47; view.setUint16(cd + 8, 1, true);
    expect(() => readCentralDirectory(z)).toThrow(ImportError);
  });
});

describe("header mapping", () => {
  it("recognises English and Arabic headers; ambiguous ones stay unmapped", () => {
    expect(["Item Name", "الكمية", "UOM", " Unit Price: ", "الوصف", "Notes"].map(guessField)).toEqual(["name", "quantity", "unit", "referenceUnitPrice", "description", null]);
  });
  it("each field is mapped once; extra columns are kept as custom text columns; empty headers ignored", () => {
    expect(initialMapping(["Item", "Name", "Qty", "Unit", "Brand", ""])).toEqual([
      { kind: "field", field: "name" }, { kind: "custom", label: "Name", type: "text" }, { kind: "field", field: "quantity" },
      { kind: "field", field: "unit" }, { kind: "custom", label: "Brand", type: "text" }, { kind: "ignore" },
    ]);
  });
  it("problems: required fields missing, a field twice, duplicate column names (incl. existing columns)", () => {
    const keys = (m: Parameters<typeof mappingProblems>[0], ex: Parameters<typeof mappingProblems>[1] = []) => mappingProblems(m, ex).map((p) => p.key);
    expect(keys([{ kind: "field", field: "name" }])).toEqual(["import.requiredFieldMissing", "import.requiredFieldMissing"]);
    expect(keys([{ kind: "field", field: "name" }, { kind: "field", field: "name" }, { kind: "field", field: "unit" }, { kind: "field", field: "quantity" }])).toEqual(["import.fieldMappedTwice"]);
    const base = [{ kind: "field", field: "name" }, { kind: "field", field: "unit" }, { kind: "field", field: "quantity" }] as const;
    expect(keys([...base, { kind: "custom", label: "Brand", type: "text" }, { kind: "custom", label: " brand ", type: "text" }])).toEqual(["import.duplicateHeader"]);
    expect(keys([...base, { kind: "custom", label: "Brand", type: "text" }], [{ id: "c", label: "BRAND", type: "text", position: 0 }])).toEqual(["import.duplicateHeader"]);
  });
});

describe("rows → items", () => {
  const sheet: ImportSheet = {
    name: "S", columnCount: 4,
    rows: [
      { rowNumber: 1, cells: [{ text: "Item" }, { text: "Unit" }, { text: "Qty" }, { text: "Brand" }] },
      { rowNumber: 2, cells: [{ text: "Cement" }, { text: "Bag" }, { text: "100" }, { text: "X" }] },
      { rowNumber: 3, cells: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }] },
      { rowNumber: 4, cells: [{ text: "Rebar" }, { text: "Ton" }, { text: "", formulaWithoutValue: true }, { text: "" }] },
      { rowNumber: 5, cells: [{ text: "Sand" }, { text: "Ton" }, { text: "1.23456", cachedFormula: true }, { text: "0" }] },
    ],
  };
  const mapping = initialMapping(["Item", "Unit", "Qty", "Brand"]);
  const cols = [{ id: "brand", label: "Brand", type: "text" as const, position: 0 }];
  const rows = rowsToItems(sheet, mapping, cols);
  it("empty rows are skipped, everything else is kept with its sheet row number", () => {
    expect(rows.map((r) => r.rowNumber)).toEqual([2, 4, 5]);
    expect(rows[0].item).toMatchObject({ name: "Cement", unit: "Bag", quantity: "100", customValues: { brand: "X" } });
  });
  it("a formula without a saved value is a row error; an empty number stays empty (never 0)", () => {
    expect(rows[1].errors).toEqual([{ key: "import.formulaWithoutValue" }]);
    expect(rows[1].item.quantity).toBe("");
  });
  it("cached formula cells are flagged; too many decimals is an error, not rounded; zero is kept", () => {
    expect(rows[2].cachedFields).toEqual(["quantity"]);
    expect(rows[2].item.quantity).toBe("1.23456");
    expect(rows[2].item.customValues).toEqual({ brand: "0" });
    expect(reviewErrors(rows, cols)[2]).toEqual([{ field: "quantity", error: "precision" }]);
  });
});
