// Pure catalogue import: source snapshot (+ persisted item IDs, Arabic labels
// and the previously generated catalogue) → validated catalogue.
//
// Repeatable and idempotent: the same inputs always give the same output, and
// running it on its own output changes nothing. Invalid records are reported as
// errors — never silently dropped — and a caller must refuse to write a
// catalogue that has any.
//
// Item rule ("Includes (Examples)"): examples are split only on ";". Each part
// becomes one listed item, marked provenance "source_example": a non-exhaustive
// starting list, not an authoritative service catalogue. A group whose only
// example repeats the group's own name has no listed items — it is declared as
// a whole. Nothing is invented and no part is split further.
//
// Catalogue changes never broaden or reclassify existing offerings: IDs that
// disappear from the source stay as "deprecated" (still readable, no longer
// selectable), and an existing ID whose parent changes is an error that needs
// an explicit resolution (a new ID in the source).

import { normalizeText } from "./normalize";
import {
  OFFERING_TYPES,
  type ArabicLabels,
  type CatalogueGroup,
  type CatalogueItem,
  type CatalogueSector,
  type CatalogueSpecialization,
  type ItemIdMap,
  type OfferingCatalogue,
  type OfferingType,
} from "./types";

export interface SourceSnapshot {
  provenance: {
    sourceUrl: string;
    sourceRevisionId: string;
    sourceModifiedTime: string;
    retrievedAt: string;
    declaredCatalogueVersion: string;
    checksum: string;
  };
  tabs: Record<string, string[][]>;
}

export interface ImportIssue {
  level: "error" | "warning";
  code: string;
  ref: string;
  message: string;
}

export interface ImportResult {
  catalogue: OfferingCatalogue;
  itemIds: ItemIdMap;
  issues: ImportIssue[];
  stats: {
    sectors: number; specializations: number; groups: number;
    groupsWithItems: number; groupsDeclaredWhole: number; items: number;
    deprecated: { sectors: number; specializations: number; groups: number; items: number };
    missingArabic: number;
    byType: Record<string, number>;
  };
}

const SECTOR_ID = /^BID-D\d{2}$/;
const SPEC_ID = /^BID-D\d{2}-F\d{2}$/;
const GROUP_ID = /^BID-D\d{2}-F\d{2}-G\d{2}$/;

function columns(header: string[], required: string[], tab: string, issues: ImportIssue[]): Record<string, number> | null {
  const idx: Record<string, number> = {};
  for (const name of required) {
    const i = header.indexOf(name);
    if (i < 0) {
      issues.push({ level: "error", code: "MISSING_COLUMN", ref: tab, message: `Column "${name}" not found in "${tab}"` });
      return null;
    }
    idx[name] = i;
  }
  return idx;
}

const cell = (row: string[], i: number) => (row[i] ?? "").trim();

/** Splits "Includes (Examples)" into listed items. Null when the group is declared as a whole. */
export function splitExamples(groupLabel: string, examples: string): { parts: string[]; whole: boolean; empty: boolean } {
  const parts = examples.split(";").map((p) => p.trim());
  const empty = parts.some((p) => p === "");
  const nonEmpty = parts.filter(Boolean);
  const whole = nonEmpty.length === 1 && normalizeText(nonEmpty[0]) === normalizeText(groupLabel);
  return { parts: nonEmpty, whole, empty };
}

export function itemKey(groupId: string, text: string): string {
  return `${groupId}|${normalizeText(text)}`;
}

export function buildCatalogue(input: {
  snapshot: SourceSnapshot;
  itemIds: ItemIdMap;
  arabic: ArabicLabels;
  previous?: OfferingCatalogue | null;
  checksum: string;
}): ImportResult {
  const issues: ImportIssue[] = [];
  const err = (code: string, ref: string, message: string) => issues.push({ level: "error", code, ref, message });
  const warn = (code: string, ref: string, message: string) => issues.push({ level: "warning", code, ref, message });
  const { snapshot } = input;

  if (input.checksum !== snapshot.provenance.checksum) {
    err("CHECKSUM_MISMATCH", "snapshot", `Snapshot content checksum ${input.checksum} does not match the recorded ${snapshot.provenance.checksum}`);
  }

  const mainTab = snapshot.tabs["Main Sectors"] ?? [];
  const specTab = snapshot.tabs["Specialized Sectors"] ?? [];
  const groupTab = snapshot.tabs["Offering Groups"] ?? [];
  const mc = columns(mainTab[0] ?? [], ["Main Sector", "Specialized Sectors", "Offering Groups", "Main Sector ID"], "Main Sectors", issues);
  const sc = columns(specTab[0] ?? [], ["Main Sector", "Specialized Sector", "Offering Groups", "Specialized Sector ID", "Main Sector ID"], "Specialized Sectors", issues);
  const gc = columns(groupTab[0] ?? [], ["Main Sector", "Specialized Sector", "Service / Product Group", "Offering Type", "Includes (Examples)", "Group ID", "Specialized Sector ID", "Main Sector ID"], "Offering Groups", issues);

  // ── Main sectors (rows until the first blank row; then a key/value metadata block)
  const sectors = new Map<string, CatalogueSector>();
  const declaredCounts = new Map<string, { specs: number; groups: number }>();
  const meta: Record<string, string> = {};
  if (mc) {
    let inMeta = false;
    for (let r = 1; r < mainTab.length; r++) {
      const row = mainTab[r];
      if (row.length === 0 || row.every((c) => !c.trim())) { inMeta = true; continue; }
      if (inMeta) { meta[cell(row, 0)] = cell(row, 1); continue; }
      const id = cell(row, mc["Main Sector ID"]);
      const label = cell(row, mc["Main Sector"]);
      const ref = `Main Sectors row ${r + 1}`;
      if (!SECTOR_ID.test(id)) { err("INVALID_ID", ref, `Invalid main sector ID "${id}"`); continue; }
      if (!label) err("EMPTY_LABEL", id, "Main sector label is empty");
      if (sectors.has(id)) { err("DUPLICATE_ID", id, `Duplicate main sector ID ${id}`); continue; }
      sectors.set(id, { id, src: label, en: label, ar: "", status: "active" });
      declaredCounts.set(id, { specs: Number(cell(row, mc["Specialized Sectors"])), groups: Number(cell(row, mc["Offering Groups"])) });
    }
  }
  const version = meta["Catalogue version"] ?? "";
  if (!version) err("MISSING_VERSION", "Main Sectors", "Catalogue version not found in the metadata block");
  else if (version !== snapshot.provenance.declaredCatalogueVersion) {
    err("VERSION_MISMATCH", "Main Sectors", `Sheet version "${version}" ≠ snapshot version "${snapshot.provenance.declaredCatalogueVersion}"`);
  }

  // ── Specialized sectors
  const specs = new Map<string, CatalogueSpecialization>();
  const declaredSpecGroups = new Map<string, number>();
  if (sc) {
    for (let r = 1; r < specTab.length; r++) {
      const row = specTab[r];
      if (row.every((c) => !c.trim())) continue;
      const id = cell(row, sc["Specialized Sector ID"]);
      const sectorId = cell(row, sc["Main Sector ID"]);
      const label = cell(row, sc["Specialized Sector"]);
      const ref = `Specialized Sectors row ${r + 1}`;
      if (!SPEC_ID.test(id)) { err("INVALID_ID", ref, `Invalid specialized sector ID "${id}"`); continue; }
      if (specs.has(id)) { err("DUPLICATE_ID", id, `Duplicate specialized sector ID ${id}`); continue; }
      if (!label) err("EMPTY_LABEL", id, "Specialized sector label is empty");
      const parent = sectors.get(sectorId);
      if (!parent) { err("MISSING_PARENT", id, `Main sector ${sectorId} does not exist`); continue; }
      if (!id.startsWith(`${sectorId}-`)) err("INCONSISTENT_PARENT", id, `ID does not belong to main sector ${sectorId}`);
      if (cell(row, sc["Main Sector"]) !== parent.src) err("INCONSISTENT_PARENT", id, `Main sector name "${cell(row, sc["Main Sector"])}" ≠ "${parent.src}"`);
      specs.set(id, { id, sectorId, src: label, en: label, ar: "", status: "active" });
      declaredSpecGroups.set(id, Number(cell(row, sc["Offering Groups"])));
    }
  }

  // ── Offering groups and their listed items
  const groups = new Map<string, CatalogueGroup>();
  const items = new Map<string, CatalogueItem>();
  const map: ItemIdMap = { note: input.itemIds.note, items: { ...input.itemIds.items } };
  const byKey = new Map<string, string>();
  const maxSuffix = new Map<string, number>();
  for (const [id, rec] of Object.entries(map.items)) {
    byKey.set(rec.key, id);
    const n = Number(id.slice(id.lastIndexOf("-I") + 2));
    maxSuffix.set(rec.groupId, Math.max(maxSuffix.get(rec.groupId) ?? 0, n));
  }
  if (gc) {
    for (let r = 1; r < groupTab.length; r++) {
      const row = groupTab[r];
      if (row.every((c) => !c.trim())) continue;
      const id = cell(row, gc["Group ID"]);
      const specId = cell(row, gc["Specialized Sector ID"]);
      const sectorId = cell(row, gc["Main Sector ID"]);
      const label = cell(row, gc["Service / Product Group"]);
      const type = cell(row, gc["Offering Type"]);
      const examples = cell(row, gc["Includes (Examples)"]);
      const ref = `Offering Groups row ${r + 1}`;
      if (!GROUP_ID.test(id)) { err("INVALID_ID", ref, `Invalid group ID "${id}"`); continue; }
      if (groups.has(id)) { err("DUPLICATE_ID", id, `Duplicate group ID ${id}`); continue; }
      if (!label) err("EMPTY_LABEL", id, "Group label is empty");
      if (!(OFFERING_TYPES as readonly string[]).includes(type)) err("INVALID_TYPE", id, `Unknown offering type "${type}"`);
      const spec = specs.get(specId);
      if (!spec) { err("MISSING_PARENT", id, `Specialized sector ${specId} does not exist`); continue; }
      if (spec.sectorId !== sectorId) err("INCONSISTENT_PARENT", id, `Main sector ${sectorId} ≠ ${spec.sectorId} of ${specId}`);
      if (!id.startsWith(`${specId}-`)) err("INCONSISTENT_PARENT", id, `ID does not belong to ${specId}`);
      if (cell(row, gc["Specialized Sector"]) !== spec.src) err("INCONSISTENT_PARENT", id, `Specialized sector name "${cell(row, gc["Specialized Sector"])}" ≠ "${spec.src}"`);
      if (cell(row, gc["Main Sector"]) !== sectors.get(spec.sectorId)?.src) err("INCONSISTENT_PARENT", id, `Main sector name "${cell(row, gc["Main Sector"])}" ≠ "${sectors.get(spec.sectorId)?.src}"`);
      if (!examples) err("EMPTY_EXAMPLES", id, "Includes (Examples) is empty");

      const split = splitExamples(label, examples);
      if (split.empty) err("EMPTY_EXAMPLE_PART", id, `Empty part in examples "${examples}"`);
      const group: CatalogueGroup = {
        id, specializationId: specId, sectorId: spec.sectorId, src: label, en: label, ar: "",
        status: "active", type: type as OfferingType, examples, items: [],
      };
      if (!split.whole) {
        const seen = new Set<string>();
        for (const part of split.parts) {
          const key = itemKey(id, part);
          if (seen.has(key)) { err("DUPLICATE_EXAMPLE", id, `Example "${part}" appears twice`); continue; }
          seen.add(key);
          if (normalizeText(part) === normalizeText(label)) warn("EXAMPLE_EQUALS_GROUP", id, `Example "${part}" repeats the group name next to other examples`);
          let itemId = byKey.get(key);
          if (!itemId) {
            const n = (maxSuffix.get(id) ?? 0) + 1;
            maxSuffix.set(id, n);
            itemId = `${id}-I${String(n).padStart(2, "0")}`;
            map.items[itemId] = { groupId: id, key, source: part };
            byKey.set(key, itemId);
          }
          items.set(itemId, { id: itemId, groupId: id, src: part, en: part, ar: "", status: "active", provenance: "source_example" });
        }
      }
      groups.set(id, group);
    }
  }

  // ── Records that left the source stay, deprecated (historical interpretation).
  const prev = input.previous;
  const deprecated = { sectors: 0, specializations: 0, groups: 0, items: 0 };
  if (prev) {
    for (const s of prev.sectors) if (!sectors.has(s.id)) { sectors.set(s.id, { ...s, status: "deprecated" }); deprecated.sectors++; }
    for (const s of prev.specializations) {
      const now = specs.get(s.id);
      if (!now) { specs.set(s.id, { ...s, status: "deprecated" }); deprecated.specializations++; }
      else if (now.sectorId !== s.sectorId) err("PARENT_CHANGED", s.id, `Moved from ${s.sectorId} to ${now.sectorId}; give the moved record a new ID in the source`);
    }
    for (const g of prev.groups) {
      const now = groups.get(g.id);
      if (!now) { groups.set(g.id, { ...g, status: "deprecated" }); deprecated.groups++; }
      else {
        if (now.specializationId !== g.specializationId) err("PARENT_CHANGED", g.id, `Moved from ${g.specializationId} to ${now.specializationId}; give the moved record a new ID in the source`);
        if (now.type !== g.type) warn("TYPE_CHANGED", g.id, `Offering type changed from ${g.type} to ${now.type}`);
      }
    }
  }
  for (const [itemId, rec] of Object.entries(map.items)) {
    if (items.has(itemId)) continue;
    const old = prev?.items.find((i) => i.id === itemId);
    items.set(itemId, old
      ? { ...old, status: "deprecated" }
      : { id: itemId, groupId: rec.groupId, src: rec.source, en: rec.source, ar: "", status: "deprecated", provenance: "source_example" });
    deprecated.items++;
  }
  for (const it of items.values()) {
    const g = groups.get(it.groupId);
    if (!g) { err("MISSING_PARENT", it.id, `Group ${it.groupId} does not exist`); continue; }
  }
  // Group item order: active in source order, then deprecated by ID.
  for (const g of groups.values()) {
    const active = [...items.values()].filter((i) => i.groupId === g.id && i.status === "active");
    const sourceOrder = splitExamples(g.src, g.examples).parts.map((p) => byKey.get(itemKey(g.id, p)));
    active.sort((a, b) => sourceOrder.indexOf(a.id) - sourceOrder.indexOf(b.id));
    const old = [...items.values()].filter((i) => i.groupId === g.id && i.status === "deprecated").sort((a, b) => a.id.localeCompare(b.id));
    g.items = [...active, ...old].map((i) => i.id);
  }

  // ── Roll-up counts declared by the sheet must match the records.
  for (const [sid, d] of declaredCounts) {
    const sSpecs = [...specs.values()].filter((s) => s.sectorId === sid && s.status === "active");
    const sGroups = [...groups.values()].filter((g) => g.sectorId === sid && g.status === "active");
    if (sSpecs.length !== d.specs) err("ROLLUP_MISMATCH", sid, `Declares ${d.specs} specialized sectors, has ${sSpecs.length}`);
    if (sGroups.length !== d.groups) err("ROLLUP_MISMATCH", sid, `Declares ${d.groups} offering groups, has ${sGroups.length}`);
  }
  for (const [fid, n] of declaredSpecGroups) {
    const have = [...groups.values()].filter((g) => g.specializationId === fid && g.status === "active").length;
    if (have !== n) err("ROLLUP_MISMATCH", fid, `Declares ${n} offering groups, has ${have}`);
  }
  for (const s of sectors.values()) {
    if (s.status === "active" && ![...specs.values()].some((f) => f.sectorId === s.id)) warn("EMPTY_SECTOR", s.id, "No specialized sectors");
  }
  for (const f of specs.values()) {
    if (f.status === "active" && ![...groups.values()].some((g) => g.specializationId === f.id)) warn("EMPTY_SPECIALIZATION", f.id, "No offering groups");
  }

  // ── Arabic labels (translations never change identity or scope)
  let missingArabic = 0;
  const applyArabic = (rec: { id: string; en: string; ar: string; status: string }) => {
    const ar = input.arabic[rec.id]?.trim();
    if (ar) rec.ar = ar;
    else if (rec.ar) { /* deprecated record keeps its previous translation */ }
    else { rec.ar = rec.en; if (rec.status === "active") missingArabic++; }
  };
  [...sectors.values(), ...specs.values(), ...groups.values(), ...items.values()].forEach(applyArabic);
  if (missingArabic > 0) warn("MISSING_ARABIC", "labels.ar.json", `${missingArabic} active records have no Arabic label (English shown)`);
  for (const id of Object.keys(input.arabic)) {
    if (!sectors.has(id) && !specs.has(id) && !groups.has(id) && !items.has(id)) warn("UNKNOWN_TRANSLATION", id, "Arabic label for an ID that does not exist");
  }

  const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
  const catalogue: OfferingCatalogue = {
    version,
    provenance: {
      sourceUrl: snapshot.provenance.sourceUrl,
      sourceRevisionId: snapshot.provenance.sourceRevisionId,
      sourceModifiedTime: snapshot.provenance.sourceModifiedTime,
      retrievedAt: snapshot.provenance.retrievedAt,
      checksum: snapshot.provenance.checksum,
    },
    sectors: [...sectors.values()].sort(byId),
    specializations: [...specs.values()].sort(byId),
    groups: [...groups.values()].sort(byId),
    items: [...items.values()].sort(byId),
  };
  const sortedMap: ItemIdMap = { note: map.note, items: Object.fromEntries(Object.entries(map.items).sort(([a], [b]) => a.localeCompare(b))) };
  const activeGroups = catalogue.groups.filter((g) => g.status === "active");
  const byType: Record<string, number> = {};
  for (const g of activeGroups) byType[g.type] = (byType[g.type] ?? 0) + 1;
  return {
    catalogue,
    itemIds: sortedMap,
    issues,
    stats: {
      sectors: catalogue.sectors.filter((s) => s.status === "active").length,
      specializations: catalogue.specializations.filter((s) => s.status === "active").length,
      groups: activeGroups.length,
      groupsWithItems: activeGroups.filter((g) => g.items.some((i) => items.get(i)?.status === "active")).length,
      groupsDeclaredWhole: activeGroups.filter((g) => !g.items.some((i) => items.get(i)?.status === "active")).length,
      items: catalogue.items.filter((i) => i.status === "active").length,
      deprecated,
      missingArabic,
      byType,
    },
  };
}
