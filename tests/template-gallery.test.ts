import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n";
import { BUILT_IN_TEMPLATES, SEARCH_THRESHOLD, builtInEntries, filterEntries, normalizeSearch, savedEntries, type SavedTemplate } from "@/lib/template-gallery";

const en = (k: string) => translate("en", k);
const ar = (k: string) => translate("ar", k);

const saved = (over: Partial<SavedTemplate> & { id: string; name: string }): SavedTemplate => ({
  description: null, cards: [{ id: "c1", type: "project-description", label: "Description", isRequired: true }], isPublic: false, createdAt: "2026-10-01T00:00:00Z", ...over,
});

describe("template gallery registry", () => {
  it("lists Simple RFP, RFQ and Create Your Own, with RFQ only while structured pricing is on", () => {
    expect(builtInEntries(en, true).map((e) => e.id)).toEqual(["bid-simple", "bid-rfq", "custom"]);
    expect(builtInEntries(en, false).map((e) => e.id)).toEqual(["bid-simple", "custom"]);
  });

  it("every registry entry has copy in both languages and a starting configuration", () => {
    for (const b of BUILT_IN_TEMPLATES) {
      for (const k of [b.titleKey, b.descriptionKey, ...b.badges.map((x) => x.key), `preview.${b.journey}Step1`]) {
        expect(en(k)).not.toBe(k);
        expect(ar(k)).not.toBe(k);
      }
      expect(b.start().config.templateId).toBe(b.id);
    }
  });

  it("uses the supplied copy", () => {
    expect(ar("gallery.title")).toBe("كيف حاب تنشئ طلب العروض؟");
    expect(ar("gallery.simpleTitle")).toBe("طلب عروض مبسّط");
    expect(ar("gallery.rfqTitle")).toBe("طلب تسعير بنود");
    expect(ar("gallery.customTitle")).toBe("أنشئ قالبك الخاص");
    expect(ar("gallery.savedTemplates")).toBe("قوالبك المحفوظة");
    expect(ar("gallery.searchLabel")).toBe("ابحث عن قالب");
    expect([en("gallery.title"), en("gallery.simpleTitle"), en("gallery.rfqTitle"), en("gallery.searchLabel")])
      .toEqual(["How would you like to create your RFP?", "Simple RFP", "Itemized RFQ", "Search templates"]);
  });

  it("the RFQ entry starts an itemized, itemized-only request at the title step", () => {
    const rfq = builtInEntries(en, true).find((e) => e.id === "bid-rfq")!;
    expect(rfq.start()).toMatchObject({ config: { requestType: "rfq", itemizedPricing: true, submissionType: "itemized_only" }, to: "/tenders/new/title" });
  });

  it("saved RFQ templates are hidden while structured pricing is off; itemized saved templates get the badge only while it is on", () => {
    const list = [saved({ id: "a", name: "A" }), saved({ id: "b", name: "B", requestType: "rfq", itemizedPricing: true }), saved({ id: "c", name: "C", cards: [{ id: "x", type: "bill-of-quantities", label: "BOQ", isRequired: true }] })];
    expect(savedEntries(list, en, false).map((e) => e.id)).toEqual(["a", "c"]);
    const on = savedEntries(list, en, true);
    expect(on.map((e) => e.badges.map((b) => b.key))).toEqual([
      ["gallery.badgeSaved"], ["gallery.badgeSaved", "gallery.badgeItemized"], ["gallery.badgeSaved", "gallery.badgeItemized"],
    ]);
    expect(on[1].start().config).toMatchObject({ requestType: "rfq", itemizedPricing: true, submissionType: "itemized_only" });
    expect(savedEntries(list, en, false)[1].start().config.itemizedPricing).toBe(false);
  });
});

describe("template search", () => {
  const entries = [
    ...builtInEntries(ar, true),
    ...savedEntries([saved({ id: "m", name: "صيانة المكيّفات السنوية" }), saved({ id: "f", name: "Office Furniture Supply", description: "Desks and chairs" })], ar, true),
  ];
  const ids = (q: string) => filterEntries(entries, q, ar).map((e) => e.id);

  it("an empty or blank query shows everything", () => {
    expect(ids("")).toHaveLength(entries.length);
    expect(ids("   ")).toHaveLength(entries.length);
  });

  it("matches title, description and badge text, every word, case-insensitively", () => {
    expect(ids("office")).toEqual(["f"]);
    expect(ids("CHAIRS desks")).toEqual(["f"]);
    expect(ids("office chairs missing")).toEqual([]);
    expect(ids("تسعير")).toContain("bid-rfq");
  });

  it("ignores Arabic diacritics, tatweel and alef/yaa/taa-marbuta variants", () => {
    expect(normalizeSearch("إنشـاءُ مكتبةٍ على")).toBe("انشاء مكتبه علي");
    expect(ids("المكيفات")).toEqual(["m"]);
    expect(ids("صيانه")).toEqual(["m"]);
    expect(ids("أنشئ")).toContain("custom");
  });

  it("search appears once the gallery holds enough entries", () => {
    expect(SEARCH_THRESHOLD).toBeGreaterThan(builtInEntries(en, true).length);
  });
});
