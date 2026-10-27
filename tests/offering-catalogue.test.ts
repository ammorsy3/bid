// Vendor-offering catalogue import (BID-OFFERING-CLASSIFICATION): the real
// source snapshot, the generated files, and the import rules on small fixtures.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { buildCatalogue, splitExamples, type SourceSnapshot } from "../shared/offering-catalogue/build";
import type { ItemIdMap, OfferingCatalogue } from "../shared/offering-catalogue/types";
import { formatCatalogue, seedSql } from "../scripts/offering-catalogue/import";

const dir = path.resolve(__dirname, "../shared/offering-catalogue");
const read = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
const snapshot: SourceSnapshot = read("source/registration-1.0-draft.sheets.json");
const itemIds: ItemIdMap = read("item-ids.json");
const arabic: Record<string, string> = read("labels.ar.json").labels;
const generated: OfferingCatalogue = read("catalogue.json");
const checksum = (tabs: unknown) => createHash("sha256").update(JSON.stringify(tabs)).digest("hex");

describe("the real source snapshot", () => {
  const result = buildCatalogue({ snapshot, itemIds, arabic, previous: generated, checksum: checksum(snapshot.tabs) });

  it("matches its recorded checksum and provenance", () => {
    expect(checksum(snapshot.tabs)).toBe(snapshot.provenance.checksum);
    expect(snapshot.provenance.sourceUrl).toContain("1iBjCNeg6n1kvUwtGpKSQck4nliaZrDo-pEA8NGd2n3g");
    expect(snapshot.provenance.declaredCatalogueVersion).toBe("registration-1.0-draft");
  });

  it("imports with no errors or warnings and the verified counts", () => {
    expect(result.issues).toEqual([]);
    expect(result.catalogue.version).toBe("registration-1.0-draft");
    expect(result.stats).toMatchObject({
      sectors: 42, specializations: 163, groups: 695, items: 629, groupsWithItems: 286, groupsDeclaredWhole: 409, missingArabic: 0,
      deprecated: { sectors: 0, specializations: 0, groups: 0, items: 0 },
      byType: { Service: 400, "Physical Product": 235, "Digital Product": 28, Works: 18, Rental: 14 },
    });
  });

  it("the committed outputs are exactly what the importer generates (repeatable, idempotent)", () => {
    expect(formatCatalogue(result.catalogue)).toBe(readFileSync(path.join(dir, "catalogue.json"), "utf8"));
    expect(JSON.stringify(result.itemIds, null, 1) + "\n").toBe(readFileSync(path.join(dir, "item-ids.json"), "utf8"));
    expect(seedSql(result.catalogue)).toBe(readFileSync(path.resolve(__dirname, "../migrations/0021_offering_catalogue_seed.sql"), "utf8"));
    const again = buildCatalogue({ snapshot, itemIds: result.itemIds, arabic, previous: result.catalogue, checksum: checksum(snapshot.tabs) });
    expect(formatCatalogue(again.catalogue)).toBe(formatCatalogue(result.catalogue));
  });

  it("keeps source IDs, parents, types, labels and the original examples text", () => {
    const g = result.catalogue.groups.find((x) => x.id === "BID-D01-F01-G01")!;
    expect(g).toMatchObject({ specializationId: "BID-D01-F01", sectorId: "BID-D01", src: "Business Strategy & Planning", type: "Service", examples: "Corporate strategy; Business planning" });
    expect(g.items).toEqual(["BID-D01-F01-G01-I01", "BID-D01-F01-G01-I02"]);
    const whole = result.catalogue.groups.find((x) => x.id === "BID-D01-F01-G03")!;
    expect(whole.items).toEqual([]); // "Market entry advisory" only repeats the group name
    for (const i of result.catalogue.items) expect(i.provenance).toBe("source_example");
  });

  it("every active record has an Arabic label that does not change identity", () => {
    const all = [...result.catalogue.sectors, ...result.catalogue.specializations, ...result.catalogue.groups, ...result.catalogue.items];
    expect(all).toHaveLength(1529);
    for (const r of all) expect(r.ar, r.id).toMatch(/[؀-ۿ]/);
    expect(Object.keys(arabic).sort()).toEqual(all.map((r) => r.id).sort());
  });

  it("the seed upserts by ID, never deletes and refuses to move a record", () => {
    const sql = seedSql(result.catalogue);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b|\bTRUNCATE\b|\bDROP\s+(TABLE|INDEX|COLUMN)\b/i);
    expect(sql).toContain("ON CONFLICT (id) DO UPDATE");
    expect(sql).toContain("would move to a different parent");
  });
});

// ── Import rules on small fixtures ─────────────────────────────────────────────
function snap(groups: string[][], opts: { specs?: string[][]; mains?: string[][]; version?: string } = {}): SourceSnapshot {
  const mains = opts.mains ?? [["Alpha", "1", String(groups.length), "BID-D01"]];
  const specs = opts.specs ?? [["Alpha", "Alpha one", String(groups.length), "BID-D01-F01", "BID-D01"]];
  const tabs = {
    "Main Sectors": [["Main Sector", "Specialized Sectors", "Offering Groups", "Main Sector ID"], ...mains, [], ["Catalogue version", opts.version ?? "v-test"]],
    "Specialized Sectors": [["Main Sector", "Specialized Sector", "Offering Groups", "Specialized Sector ID", "Main Sector ID"], ...specs],
    "Offering Groups": [["Main Sector", "Specialized Sector", "Service / Product Group", "Offering Type", "Includes (Examples)", "Group ID", "Specialized Sector ID", "Main Sector ID"], ...groups],
  };
  return {
    provenance: { sourceUrl: "x", sourceRevisionId: "r", sourceModifiedTime: "t", retrievedAt: "t", declaredCatalogueVersion: "v-test", checksum: checksum(tabs) },
    tabs,
  };
}
const row = (id: string, label: string, examples: string, type = "Service") => ["Alpha", "Alpha one", label, type, examples, id, "BID-D01-F01", "BID-D01"];
const build = (s: SourceSnapshot, ids: ItemIdMap = { items: {} }, previous: OfferingCatalogue | null = null) =>
  buildCatalogue({ snapshot: s, itemIds: ids, arabic: {}, previous, checksum: checksum(s.tabs) });
const errors = (r: ReturnType<typeof build>) => r.issues.filter((i) => i.level === "error").map((i) => i.code);

describe("import rules", () => {
  it("splits examples only on ';' and treats a lone repeat of the group name as a whole-group declaration", () => {
    expect(splitExamples("Pumps", "Pumps")).toMatchObject({ whole: true, parts: ["Pumps"] });
    expect(splitExamples("Pumps & Valves", "Pumps; Valves")).toMatchObject({ whole: false, parts: ["Pumps", "Valves"] });
    expect(splitExamples("X", "Foundations and piling; Concrete")).toMatchObject({ parts: ["Foundations and piling", "Concrete"] }); // no further splitting
  });

  it("item IDs survive reordering of rows and examples, label edits and translation", () => {
    const first = build(snap([row("BID-D01-F01-G01", "Pumps & Valves", "Pumps; Valves")]));
    const reordered = build(snap([row("BID-D01-F01-G01", "Pumps and valves (renamed)", "Valves; Pumps")]), first.itemIds, first.catalogue);
    expect(errors(reordered)).toEqual([]);
    const byLabel = (r: ReturnType<typeof build>) => Object.fromEntries(r.catalogue.items.map((i) => [i.src, i.id]));
    expect(byLabel(reordered)).toEqual(byLabel(first));
    expect(reordered.catalogue.groups[0].items).toEqual([byLabel(first).Valves, byLabel(first).Pumps]); // source order
  });

  it("a new example gets the next ID and nothing existing is renumbered; a removed example is deprecated, not deleted", () => {
    const first = build(snap([row("BID-D01-F01-G01", "Pumps & Valves", "Pumps; Valves")]));
    const second = build(snap([row("BID-D01-F01-G01", "Pumps & Valves", "Pumps; Seals")]), first.itemIds, first.catalogue);
    expect(errors(second)).toEqual([]);
    const items = Object.fromEntries(second.catalogue.items.map((i) => [i.src, i]));
    expect(items.Pumps.id).toBe("BID-D01-F01-G01-I01");
    expect(items.Valves).toMatchObject({ id: "BID-D01-F01-G01-I02", status: "deprecated" });
    expect(items.Seals).toMatchObject({ id: "BID-D01-F01-G01-I03", status: "active" });
    expect(second.stats.deprecated.items).toBe(1);
  });

  it("records removed from the source stay as deprecated; a moved record is an error that needs a new ID", () => {
    const two = snap([row("BID-D01-F01-G01", "A", "A"), row("BID-D01-F01-G02", "B", "B")]);
    const first = build(two);
    const removed = build(snap([row("BID-D01-F01-G01", "A", "A")]), first.itemIds, first.catalogue);
    expect(removed.catalogue.groups.find((g) => g.id === "BID-D01-F01-G02")?.status).toBe("deprecated");

    const moved = snap([row("BID-D01-F01-G01", "A", "A")], {
      mains: [["Alpha", "2", "1", "BID-D01"]],
      specs: [["Alpha", "Alpha one", "0", "BID-D01-F01", "BID-D01"], ["Alpha", "Alpha two", "1", "BID-D01-F02", "BID-D01"]],
    });
    moved.tabs["Offering Groups"][1] = ["Alpha", "Alpha two", "A", "Service", "A", "BID-D01-F01-G01", "BID-D01-F02", "BID-D01"];
    moved.provenance.checksum = checksum(moved.tabs);
    // The ID prefix says F01, and the previous catalogue had it under F01: both refuse a silent reclassification.
    expect(errors(build(moved, first.itemIds, first.catalogue))).toEqual(expect.arrayContaining(["INCONSISTENT_PARENT", "PARENT_CHANGED"]));
  });

  it("reports duplicate IDs, missing parents, inconsistent names, empty labels, bad types and roll-up mismatches", () => {
    expect(errors(build(snap([row("BID-D01-F01-G01", "A", "A"), row("BID-D01-F01-G01", "B", "B")])))).toContain("DUPLICATE_ID");
    const orphan = snap([["Alpha", "Ghost", "A", "Service", "A", "BID-D01-F09-G01", "BID-D01-F09", "BID-D01"]]);
    expect(errors(build(orphan))).toContain("MISSING_PARENT");
    const badName = snap([["Alpha", "Wrong name", "A", "Service", "A", "BID-D01-F01-G01", "BID-D01-F01", "BID-D01"]]);
    expect(errors(build(badName))).toContain("INCONSISTENT_PARENT");
    expect(errors(build(snap([row("BID-D01-F01-G01", "", "A")])))).toContain("EMPTY_LABEL");
    expect(errors(build(snap([row("BID-D01-F01-G01", "A", "A", "Gadget")])))).toContain("INVALID_TYPE");
    expect(errors(build(snap([row("BID-D01-F01-G01", "A", "x;;y")])))).toContain("EMPTY_EXAMPLE_PART");
    expect(errors(build(snap([row("BID-D01-F01-G01", "A", "x; x")])))).toContain("DUPLICATE_EXAMPLE");
    const wrongRollup = snap([row("BID-D01-F01-G01", "A", "A")], { mains: [["Alpha", "1", "5", "BID-D01"]] });
    expect(errors(build(wrongRollup))).toContain("ROLLUP_MISMATCH");
  });

  it("refuses a snapshot whose content no longer matches its checksum", () => {
    const s = snap([row("BID-D01-F01-G01", "A", "A")]);
    const r = buildCatalogue({ snapshot: s, itemIds: { items: {} }, arabic: {}, checksum: "0".repeat(64) });
    expect(errors(r)).toContain("CHECKSUM_MISMATCH");
  });
});
