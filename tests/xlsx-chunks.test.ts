// PB-7: cutting large parts into small, independently parseable pieces.
import { describe, it, expect } from "vitest";
import { chunkXml } from "../client/src/lib/xlsx/chunks";

const sheet = (rows: string, prefix = "") => {
  const p = prefix ? `${prefix}:` : "";
  return `<?xml version="1.0"?><${p}worksheet xmlns${prefix ? ":" + prefix : ""}="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><${p}sheetData>${rows}</${p}sheetData><${p}rowBreaks count="0"/></${p}worksheet>`;
};
const row = (n: number, p = "") => `<${p}row r="${n}"><${p}c r="A${n}" t="inlineStr"><${p}is><${p}t>v${n} &lt;/row&gt;</${p}t></${p}is></${p}c></${p}row>`;

describe("chunkXml", () => {
  it("keeps every row, in order, each piece wrapped in the root start tag (namespaces kept)", () => {
    const rows = Array.from({ length: 50 }, (_, i) => row(i + 1)).join("");
    const out = chunkXml(sheet(rows), "row", { pieceBytes: 500, structureBytes: 1 << 20 })!;
    expect(out.chunks.length).toBeGreaterThan(5);
    for (const c of out.chunks) {
      expect(c.startsWith('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')).toBe(true);
      expect(c.endsWith("</worksheet>")).toBe(true);
    }
    const joined = out.chunks.map((c) => c.replace(/^<worksheet[^>]*>/, "").replace(/<\/worksheet>$/, "")).join("");
    expect(joined).toBe(rows);
  });
  it("works with prefixed XML and does not cut on escaped text or on rowBreaks", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(i + 1, "x:")).join("");
    const out = chunkXml(sheet(rows, "x"), "row", { pieceBytes: 200, structureBytes: 1 << 20 })!; // one row per piece
    expect(out.chunks).toHaveLength(10);
    expect(out.chunks[0]).toMatch(/^<x:worksheet xmlns:x="[^"]+">/);
    expect(out.chunks.every((c) => !c.includes("rowBreaks"))).toBe(true);
  });
  it("shared strings split on </si>; an empty part gives no pieces; garbage gives null", () => {
    const sst = `<sst xmlns="m">${Array.from({ length: 4 }, (_, i) => `<si><t>s${i}</t></si>`).join("")}</sst>`;
    expect(chunkXml(sst, "si", { pieceBytes: 45, structureBytes: 1 << 20 })!.chunks).toHaveLength(4);
    expect(chunkXml(sheet(""), "row")!.chunks).toEqual([]);
  });
  it("the skeleton is the part without the chunked rows, so trailing content cannot be skipped", () => {
    const rows = row(1) + row(2);
    const out = chunkXml(sheet(rows + '<row r="3"/>'), "row", { pieceBytes: 300, structureBytes: 1 << 20 })!;
    expect(out.skeleton).toBe(sheet('<row r="3"/>'));
    const broken = chunkXml(sheet(row(1) + '<row r="2"><c r="A2"><v>2</v>'), "row")!;
    expect(broken.skeleton).toContain('<row r="2"><c r="A2"><v>2</v>'); // left for the parser to refuse
    expect(chunkXml("not xml at all", "row")).toBeNull();
  });
});

// PB-7-R1: the bounds are real UTF-8 byte limits, wrapper included, for every piece and the skeleton.
import { IMPORT_LIMITS, ImportError, utf8Length } from "../shared/boq-import";

describe("PB-7-R1 byte limits", () => {
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  const err = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e as ImportError; } };

  it("utf8Length equals TextEncoder for ASCII, Arabic, emoji and a lone surrogate", () => {
    for (const s of ["abc", "أسمنت مقاوم", "x😀y", "a\ud800b", ""]) expect(utf8Length(s)).toBe(bytes(s));
  });
  it("Codex reproduction 1: a single 2 MB row is refused (with its row number), not passed on", () => {
    const x = '<worksheet><sheetData><row r="7"><c><is><t>' + "x".repeat(2 * 1024 * 1024) + "</t></is></c></row></sheetData></worksheet>";
    const e = err(() => chunkXml(x, "row"));
    expect(e).toBeInstanceOf(ImportError);
    expect([e!.key, e!.vars.row]).toEqual(["import.rowTooLarge", "7"]);
  });
  it("Codex reproduction 2: a 2 MB skeleton is refused", () => {
    const x = "<worksheet><sheetData/><extLst>" + "x".repeat(2 * 1024 * 1024) + "</extLst></worksheet>";
    expect(err(() => chunkXml(x, "row"))!.key).toBe("import.partTooLarge");
    const y = '<worksheet><sheetData><row r="1"><c><v>1</v></c></row></sheetData><extLst>' + "x".repeat(2 * 1024 * 1024) + "</extLst></worksheet>";
    expect(err(() => chunkXml(y, "row"))!.key).toBe("import.partTooLarge");
  });
  it("multibyte: 150,000 Arabic characters (< 256 Ki characters, > 256 KiB) in one row are refused by bytes", () => {
    const x = '<worksheet><sheetData><row r="2"><c t="inlineStr"><is><t>' + "ب".repeat(150_000) + "</t></is></c></row></sheetData></worksheet>";
    expect(err(() => chunkXml(x, "row"))!.key).toBe("import.rowTooLarge");
  });
  it("every piece fits the limit in bytes including the wrapper; nothing is lost", () => {
    const longRoot = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
    const rows = Array.from({ length: 400 }, (_, i) => `<row r="${i + 1}"><c t="inlineStr"><is><t>${(i % 2 ? "ح" : "z").repeat(1000 + (i * 37) % 3000)}</t></is></c></row>`).join("");
    const x = longRoot + "<sheetData>" + rows + "</sheetData></worksheet>";
    const out = chunkXml(x, "row")!;
    expect(out.chunks.length).toBeGreaterThan(5);
    for (const c of out.chunks) expect(bytes(c)).toBeLessThanOrEqual(IMPORT_LIMITS.pieceBytes);
    expect(out.chunks.map((c) => c.slice(longRoot.length, -"</worksheet>".length)).join("")).toBe(rows);
  });
  it("an element exactly at the limit fits; one byte more is refused", () => {
    const head = "<w>"; const tail = "</w>";
    const shell = '<row r="1"><t></t></row>';
    const fill = IMPORT_LIMITS.pieceBytes - head.length - tail.length - shell.length;
    const make = (n: number) => `${head}<row r="1"><t>${"x".repeat(n)}</t></row>${tail}`;
    expect(chunkXml(make(fill), "row")!.chunks).toHaveLength(1);
    expect(err(() => chunkXml(make(fill + 1), "row"))!.key).toBe("import.rowTooLarge");
  });
  it("an oversized shared string is refused as a part too large", () => {
    const x = `<sst xmlns="m"><si><t>ok</t></si><si><t>${"x".repeat(300 * 1024)}</t></si></sst>`;
    expect(err(() => chunkXml(x, "si"))!.key).toBe("import.partTooLarge");
  });
});
