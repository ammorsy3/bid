// Deterministic Arabic/English catalogue search and normalisation.

import { describe, it, expect } from "vitest";
import catalogueJson from "../shared/offering-catalogue/catalogue.json";
import { indexCatalogue } from "../shared/offering-catalogue/selection";
import { createCatalogueSearch } from "../shared/offering-catalogue/search";
import { normalizeText, tokenVariants } from "../shared/offering-catalogue/normalize";
import type { OfferingCatalogue } from "../shared/offering-catalogue/types";

const idx = indexCatalogue(catalogueJson as unknown as OfferingCatalogue);
const search = createCatalogueSearch(idx);
const ids = (q: string) => search.search(q).map((h) => h.id);

describe("normalizeText", () => {
  it("folds Arabic letter variants, diacritics, tatweel and digits; English case and '&'", () => {
    expect(normalizeText("إدارةُ المشاريـــع")).toBe("اداره المشاريع");
    expect(normalizeText("مستشفى")).toBe("مستشفي");
    expect(normalizeText("٤٥ Pumps & Valves!")).toBe("45 pumps and valves");
    expect(tokenVariants("والتدريب")).toEqual(expect.arrayContaining(["والتدريب", "التدريب", "تدريب"]));
  });
});

describe("catalogue search", () => {
  it("finds English labels at every level with the exact label first", () => {
    expect(ids("Penetration testing")[0]).toBe("BID-D11-F01-G02-I01");
    expect(ids("Legal services")[0]).toBe("BID-D02-F01");
    expect(ids("Strategy, Management & Business Consulting")[0]).toBe("BID-D01");
  });

  it("finds Arabic labels without needing the article, hamza or diacritics", () => {
    expect(ids("اختبار الاختراق")[0]).toBe("BID-D11-F01-G02-I01");
    expect(ids("صيانه المصاعد")).toContain("BID-D17-F04-G04");
    expect(ids("مصاعد")).toEqual(expect.arrayContaining(["BID-D17-F04-G04", "BID-D17-F03-G04-I01"]));
  });

  it("item hits carry their group for hierarchy context and direct selection", () => {
    const hit = search.search("Chillers")[0];
    expect(hit).toEqual({ kind: "item", id: "BID-D17-F01-G01-I02", groupId: "BID-D17-F01-G01", score: 100 });
  });

  it("matches words in any order and by prefix; nothing for empty or unrelated queries", () => {
    expect(ids("planning business")).toContain("BID-D01-F01-G01-I02");
    expect(ids("forkl")).toContain("BID-D30-F04-G03-I02");
    expect(search.search("   ")).toEqual([]);
    expect(search.search("zzqqxx")).toEqual([]);
  });

  it("deprecated records are not searchable", () => {
    const c = structuredClone(catalogueJson) as unknown as OfferingCatalogue;
    c.items.find((i) => i.id === "BID-D17-F01-G01-I02")!.status = "deprecated";
    expect(createCatalogueSearch(indexCatalogue(c)).search("Chillers").map((h) => h.id)).not.toContain("BID-D17-F01-G01-I02");
  });
});
