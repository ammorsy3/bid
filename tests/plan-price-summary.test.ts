// BID-UX-BUGFIX item 8: plan prices show base, VAT and the total payable, using
// the same calculation as checkout (shared/billing-plans.ts priceWithVat).

import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { priceWithVat } from "../shared/billing-plans";

vi.mock("@/lib/i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/i18n")>()),
  useI18n: () => ({ language: "en", t: (k: string) => k }),
}));

import { PlanPriceSummary } from "@/components/billing/PlanPriceSummary";

const cell = (html: string, id: string) => new RegExp(`data-testid="${id}"[^>]*>([^<]*)<`).exec(html)?.[1];

describe("PlanPriceSummary", () => {
  it.each([["pro", "SAR 79.00", "SAR 11.85", "SAR 90.85"], ["business", "SAR 179.00", "SAR 26.85", "SAR 205.85"]] as const)(
    "%s: base, VAT and total match checkout",
    (plan, subtotal, vat, total) => {
      const html = renderToStaticMarkup(createElement(PlanPriceSummary, { plan }));
      expect([cell(html, "plan-price-subtotal"), cell(html, "plan-price-vat"), cell(html, "plan-price-total")]).toEqual([subtotal, vat, total]);
      const p = priceWithVat(plan, "monthly");
      expect(p.subtotal + p.vat).toBeCloseTo(p.total, 2);
    },
  );

  it("labels the rows with the billing copy (subtotal, VAT, total per month)", () => {
    const html = renderToStaticMarkup(createElement(PlanPriceSummary, { plan: "pro" }));
    for (const key of ["billing.planPro", "billing.subtotal", "billing.vat", "billing.totalPerMonth"]) expect(html).toContain(key);
  });
});
