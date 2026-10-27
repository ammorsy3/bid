// Offerings privacy guard and analytics semantics (BID-OFFERING-CLASSIFICATION).

import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import catalogueJson from "../shared/offering-catalogue/catalogue.json";
import { indexCatalogue } from "../shared/offering-catalogue/selection";
import type { OfferingCatalogue } from "../shared/offering-catalogue/types";

vi.mock("../server/db", () => ({ db: {} }));
import { referenceOrganizationsBy } from "../server/lib/offering-analytics";
import { safeCompany } from "../server/lib/safe-company";

const idx = indexCatalogue(catalogueJson as unknown as OfferingCatalogue);

function serverFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? serverFiles(p) : p.endsWith(".ts") ? [p] : [];
  });
}

describe("private offerings stay out of shared serializers", () => {
  it("only the offerings store, routes, analytics and onboarding touch the private tables", () => {
    const allowed = new Set(["server/lib/offering-store.ts", "server/lib/offering-analytics.ts"]);
    const root = path.resolve(__dirname, "..");
    const users = serverFiles(path.join(root, "server"))
      .filter((f) => /companyOfferingItems|companyOfferingGroups|companyVendorRegistrations|company_offering_|company_vendor_registrations/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f));
    expect(users.filter((f) => !allowed.has(f))).toEqual([]);
  });

  it("registration state is not a company column, so company rows sent to others cannot carry it", () => {
    const row = safeCompany({ id: "c", name: "Co", joinCode: "J" } as any) as Record<string, unknown>;
    for (const k of ["vendorRegistrationStatus", "offerings", "offeringRevision"]) expect(row).not.toHaveProperty(k);
    const schema = readFileSync(path.resolve(__dirname, "../shared/schema.ts"), "utf8");
    const companiesBlock = schema.slice(schema.indexOf('export const companies = pgTable("companies"'), schema.indexOf("// Company Profiles"));
    expect(companiesBlock).not.toMatch(/vendor|offering/i);
  });
});

describe("analytics: distinct organizations per bucket", () => {
  // Org A: two items in one group + a declaration in another group of the same sector, plus a group in another sector.
  // Org B: one item in the same group as A. Org C: declaration only (no items).
  const orgs = [
    { companyId: "A", selection: { groups: [
      { groupId: "BID-D01-F01-G01", itemIds: ["BID-D01-F01-G01-I01", "BID-D01-F01-G01-I02"], declared: false },
      { groupId: "BID-D01-F01-G03", itemIds: [], declared: true },
      { groupId: "BID-D17-F01-G01", itemIds: ["BID-D17-F01-G01-I02"], declared: false },
    ] } },
    { companyId: "B", selection: { groups: [{ groupId: "BID-D01-F01-G01", itemIds: ["BID-D01-F01-G01-I01"], declared: false }] } },
    { companyId: "C", selection: { groups: [{ groupId: "BID-D01-F01-G01", itemIds: [], declared: true }] } },
  ];
  const by = (bucket: any) => Object.fromEntries(referenceOrganizationsBy(orgs, idx, bucket).map((r) => [r.bucket, r.organizations]));

  it("counts each organization once per bucket, however many items or groups it has there", () => {
    expect(by("sector")).toEqual({ "BID-D01": 3, "BID-D17": 1 });
    expect(by("specialization")).toEqual({ "BID-D01-F01": 3, "BID-D17-F01": 1 });
    expect(by("group")).toEqual({ "BID-D01-F01-G01": 3, "BID-D01-F01-G03": 1, "BID-D17-F01-G01": 1 });
    expect(by("offering_type")).toEqual({ Service: 3, "Physical Product": 1 });
  });

  it("item counts use explicit item selections only: a group declaration never implies an item", () => {
    expect(by("item")).toEqual({ "BID-D01-F01-G01-I01": 2, "BID-D01-F01-G01-I02": 1, "BID-D17-F01-G01-I02": 1 });
  });

  it("buckets overlap: summing sectors over-counts the 3 unique organizations", () => {
    const sum = Object.values(by("sector")).reduce((a, b) => a + b, 0);
    expect(sum).toBe(4);
    expect(new Set(orgs.map((o) => o.companyId)).size).toBe(3);
  });
});
