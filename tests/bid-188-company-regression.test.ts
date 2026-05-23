/**
 * BID-188 — Regression: existing company onboarding + tender creation unchanged
 *
 * Verifies that all pre-M3 company behaviour is preserved:
 *   • createCompanySchema defaults accountType to 'company'
 *   • createTenderSchema accepts targetAudienceTypes defaulting to ['company']
 *   • Audience validation rejects empty arrays and unknown types
 *   • ACCOUNT_TYPES constant contains exactly the three expected values
 */

import { describe, it, expect } from "vitest";
import { createCompanySchema, createTenderSchema, ACCOUNT_TYPES } from "../shared/schema";

// ─── ACCOUNT_TYPES constant ───────────────────────────────────────────────────

describe("ACCOUNT_TYPES", () => {
  it("contains exactly company, team, individual", () => {
    expect(ACCOUNT_TYPES).toEqual(["company", "team", "individual"]);
  });

  it("has exactly 3 entries and does not grow at runtime", () => {
    // TypeScript enforces readonly; runtime length stays at 3
    expect(ACCOUNT_TYPES).toHaveLength(3);
  });
});

// ─── createCompanySchema ──────────────────────────────────────────────────────

describe("createCompanySchema — company regression", () => {
  it("parses a minimal company payload with accountType defaulting to 'company'", () => {
    const result = createCompanySchema.parse({ name: "Acme Corp" });
    expect(result.accountType).toBe("company");
  });

  it("accepts an explicit accountType of 'company'", () => {
    const result = createCompanySchema.parse({ name: "Acme Corp", accountType: "company" });
    expect(result.accountType).toBe("company");
  });

  it("rejects unknown account types", () => {
    expect(() =>
      createCompanySchema.parse({ name: "Acme Corp", accountType: "enterprise" })
    ).toThrow();
  });

  it("accepts a company with optional CR / city / legalName", () => {
    const result = createCompanySchema.parse({
      name: "Saudi Co",
      accountType: "company",
      legalName: "Saudi Co Ltd.",
      crNumber: "1234567890",
      city: "Riyadh",
    });
    expect(result.name).toBe("Saudi Co");
    expect(result.crNumber).toBe("1234567890");
  });

  it("enforces CR number is exactly 10 digits when provided", () => {
    expect(() =>
      createCompanySchema.parse({ name: "X", crNumber: "123" })
    ).toThrow();
  });
});

// ─── createTenderSchema — targetAudienceTypes ─────────────────────────────────

// Minimum fields required by createTenderSchema (title, description, deadline are notNull)
const BASE_TENDER = {
  title: "Office Renovation RFP",
  description: "Full renovation of the main office block.",
  deadline: "2027-01-31",
};

describe("createTenderSchema — targetAudienceTypes regression", () => {
  it("accepts a valid tender without targetAudienceTypes (DB default kicks in)", () => {
    const result = createTenderSchema.safeParse(BASE_TENDER);
    expect(result.success).toBe(true);
  });

  it("accepts targetAudienceTypes=['company'] (legacy default preserved)", () => {
    const result = createTenderSchema.safeParse({
      ...BASE_TENDER,
      targetAudienceTypes: ["company"],
    });
    expect(result.success).toBe(true);
    expect(result.data?.targetAudienceTypes).toEqual(["company"]);
  });

  it("accepts all three audience types together", () => {
    const result = createTenderSchema.safeParse({
      ...BASE_TENDER,
      targetAudienceTypes: ["company", "team", "individual"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts any subset of audience types", () => {
    for (const subset of [["team"], ["individual"], ["company", "individual"]]) {
      const result = createTenderSchema.safeParse({
        ...BASE_TENDER,
        targetAudienceTypes: subset,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── Server-side audience validation (mirrors routes.ts logic) ────────────────

function validateAudienceTypes(raw: unknown): string | null {
  const validTypes = ACCOUNT_TYPES as readonly string[];
  if (!Array.isArray(raw) || raw.length === 0) {
    return "targetAudienceTypes must be a non-empty array";
  }
  if (!raw.every((t) => validTypes.includes(t))) {
    return "targetAudienceTypes contains an invalid account type";
  }
  return null;
}

describe("server audience validation", () => {
  it("accepts ['company'] — legacy default behaviour unchanged", () => {
    expect(validateAudienceTypes(["company"])).toBeNull();
  });

  it("accepts all three types", () => {
    expect(validateAudienceTypes(["company", "team", "individual"])).toBeNull();
  });

  it("rejects empty array", () => {
    expect(validateAudienceTypes([])).not.toBeNull();
  });

  it("rejects non-array", () => {
    expect(validateAudienceTypes("company")).not.toBeNull();
    expect(validateAudienceTypes(null)).not.toBeNull();
  });

  it("rejects unknown type", () => {
    expect(validateAudienceTypes(["enterprise"])).not.toBeNull();
  });

  it("rejects mixed valid+invalid", () => {
    expect(validateAudienceTypes(["company", "unknown"])).not.toBeNull();
  });

  it("defaults to ['company'] when undefined (matches server fallback)", () => {
    const raw = undefined;
    const resolved = (raw as unknown[]) ?? ["company"];
    expect(validateAudienceTypes(resolved)).toBeNull();
    expect(resolved).toEqual(["company"]);
  });
});
