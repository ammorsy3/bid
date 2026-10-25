// BID-UX-BUGFIX item 11c: the approved Arabic homepage/Pricing copy, exactly as
// supplied (including the position of the kasra), with the English copy unchanged.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const src = (f: string) => readFileSync(path.join(__dirname, "..", "client", "src", "pages", f), "utf8");
const block = (s: string, lang: "en" | "ar") => {
  const start = s.indexOf(`  ${lang}: {`);
  expect(start, `${lang} block`).toBeGreaterThan(-1);
  return s.slice(start, s.indexOf("\n  },", start));
};
const value = (b: string, key: string) => b.match(new RegExp(`\\b${key}: "([^"]*)"`))?.[1];

// Exact approved strings (U+0650 kasra, U+0640 tatweel, U+0651 shadda).
const ABOUT = "عن بِـد";             // عن بِـد
const MARKET = "سوق بـِد";      // سوق بـِد
const FOR_REQUESTERS = "لأصحاب الطلبات"; // لأصحاب الطلبات
const TRY = "جرّب بـِد";  // جرّب بـِد

describe("homepage Arabic copy (item 11c)", () => {
  const landing = src("Landing.tsx");
  const ar = block(landing, "ar");
  const en = block(landing, "en");

  it("navigation: About, Marketplace and the requester link use the approved wording", () => {
    expect([value(ar, "navAbout"), value(ar, "navMarketplace"), value(ar, "navTraction")]).toEqual([ABOUT, MARKET, FOR_REQUESTERS]);
  });

  it("both CTAs read جرّب بـِد (the hero keeps its arrow)", () => {
    expect(value(ar, "ctaTitle")).toBe(TRY);
    expect(value(ar, "heroCta")).toBe(`${TRY}\\u00a0←`);
  });

  it("the replaced Arabic strings are gone from the Arabic navigation and CTAs", () => {
    for (const key of ["navAbout", "navMarketplace", "navTraction", "heroCta", "ctaTitle"]) {
      expect([key, value(ar, key)?.includes("Bid") || value(ar, key) === "روابط الانضمام"]).toEqual([key, false]);
    }
  });

  it("English copy is unchanged", () => {
    expect([value(en, "navAbout"), value(en, "navMarketplace"), value(en, "navTraction"), value(en, "heroCta")])
      .toEqual(["About Bid", "Marketplace", "Traction Link", "Try Bid\\u00a0→"]);
  });

  it("Pricing navigation uses the same About wording; English unchanged", () => {
    const pricing = src("Pricing.tsx");
    expect(value(block(pricing, "ar"), "navAbout")).toBe(ABOUT);
    expect(value(block(pricing, "en"), "navAbout")).toBe("About Bid");
  });
});
