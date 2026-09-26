import { describe, expect, it } from "vitest";
import GithubSlugger from "github-slugger";
import { slugifyHeading } from "../client/src/lib/docs-slug";

// The contents list links to the ids rehype-slug puts on the headings, so the
// two must agree, in English and in Arabic.
const HEADINGS = [
  "What you'll have at the end",
  "1. Create an account and verify your company",
  "Rate limits & errors",
  "Webhook",
  "ما ستحصل عليه في النهاية",
  "1. أنشئ حسابًا ووثّق شركتك",
  "حدود الاستخدام والأخطاء",
  "المصادقة (Authentication)",
  "الخطوة 2: أنشئ مفتاح API",
];

describe("slugifyHeading", () => {
  it.each(HEADINGS)("matches github-slugger for %s", (heading) => {
    expect(slugifyHeading(heading)).toBe(new GithubSlugger().slug(heading));
  });

  it("keeps Arabic letters instead of erasing them", () => {
    expect(slugifyHeading("حدود الاستخدام")).toBe("حدود-الاستخدام");
  });
});
