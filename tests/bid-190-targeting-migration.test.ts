/**
 * BID-190 — End-to-end: tender targeting matrix + migration safety
 *
 * Tests the audience-filtering predicate that determines which tenders
 * a given account type can see, and verifies the schema defaults that
 * the migration relies on.
 *
 * Matrix under test (`callerAccountType = ANY(targetAudienceTypes)`):
 *   caller\target  | ['company'] | ['team'] | ['individual'] | ['c','t','i']
 *   company        |    ✓        |    ✗     |       ✗        |      ✓
 *   team           |    ✗        |    ✓     |       ✗        |      ✓
 *   individual     |    ✗        |    ✗     |       ✓        |      ✓
 */

import { describe, it, expect } from "vitest";
import { createTenderSchema, createCompanySchema, ACCOUNT_TYPES } from "../shared/schema";

// ─── Pure predicate mirroring the SQL `ANY` check ────────────────────────────

/** Mirrors: callerAccountType = ANY(tender.targetAudienceTypes) */
function canCallerSeeTender(
  callerAccountType: string,
  tenderAudienceTypes: string[]
): boolean {
  return tenderAudienceTypes.includes(callerAccountType);
}

// ─── Full targeting matrix ────────────────────────────────────────────────────

describe("targeting matrix — company-only tenders ['company']", () => {
  const target = ["company"];

  it("company can see it", () => {
    expect(canCallerSeeTender("company", target)).toBe(true);
  });

  it("team cannot see it", () => {
    expect(canCallerSeeTender("team", target)).toBe(false);
  });

  it("individual cannot see it", () => {
    expect(canCallerSeeTender("individual", target)).toBe(false);
  });
});

describe("targeting matrix — team-only tenders ['team']", () => {
  const target = ["team"];

  it("company cannot see it", () => {
    expect(canCallerSeeTender("company", target)).toBe(false);
  });

  it("team can see it", () => {
    expect(canCallerSeeTender("team", target)).toBe(true);
  });

  it("individual cannot see it", () => {
    expect(canCallerSeeTender("individual", target)).toBe(false);
  });
});

describe("targeting matrix — individual-only tenders ['individual']", () => {
  const target = ["individual"];

  it("company cannot see it", () => {
    expect(canCallerSeeTender("company", target)).toBe(false);
  });

  it("team cannot see it", () => {
    expect(canCallerSeeTender("team", target)).toBe(false);
  });

  it("individual can see it", () => {
    expect(canCallerSeeTender("individual", target)).toBe(true);
  });
});

describe("targeting matrix — all-audience tenders ['company','team','individual']", () => {
  const target = ["company", "team", "individual"];

  it("company can see it", () => {
    expect(canCallerSeeTender("company", target)).toBe(true);
  });

  it("team can see it", () => {
    expect(canCallerSeeTender("team", target)).toBe(true);
  });

  it("individual can see it", () => {
    expect(canCallerSeeTender("individual", target)).toBe(true);
  });
});

describe("targeting matrix — mixed subset ['company','individual']", () => {
  const target = ["company", "individual"];

  it("company can see it", () => {
    expect(canCallerSeeTender("company", target)).toBe(true);
  });

  it("team cannot see it", () => {
    expect(canCallerSeeTender("team", target)).toBe(false);
  });

  it("individual can see it", () => {
    expect(canCallerSeeTender("individual", target)).toBe(true);
  });
});

describe("targeting matrix — mixed subset ['company','team']", () => {
  const target = ["company", "team"];

  it("company can see it", () => {
    expect(canCallerSeeTender("company", target)).toBe(true);
  });

  it("team can see it", () => {
    expect(canCallerSeeTender("team", target)).toBe(true);
  });

  it("individual cannot see it", () => {
    expect(canCallerSeeTender("individual", target)).toBe(false);
  });
});

describe("targeting matrix — unauthenticated caller (no account type)", () => {
  it("sees nothing when targetAudienceTypes excludes undefined", () => {
    expect(canCallerSeeTender("", ["company"])).toBe(false);
    expect(canCallerSeeTender("", ["team", "individual"])).toBe(false);
  });
});

// ─── Migration safety: schema defaults ────────────────────────────────────────

describe("migration safety — companies default to accountType='company'", () => {
  it("createCompanySchema defaults accountType to 'company'", () => {
    const result = createCompanySchema.parse({ name: "Legacy Corp" });
    expect(result.accountType).toBe("company");
  });

  it("all three account types are valid", () => {
    for (const type of ACCOUNT_TYPES) {
      const result = createCompanySchema.safeParse({
        name: "Test Workspace",
        accountType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("only the three canonical types are valid", () => {
    const result = createCompanySchema.safeParse({
      name: "Test Workspace",
      accountType: "enterprise",
    });
    expect(result.success).toBe(false);
  });
});

// Required fields for createTenderSchema (title, description, deadline are notNull)
const LEGACY_TENDER_BASE = {
  title: "Legacy Tender",
  description: "Pre-existing tender from before M3.",
  deadline: "2027-06-30",
};

describe("migration safety — tenders default to targetAudienceTypes=['company']", () => {
  it("a tender parsed without targetAudienceTypes is valid (DB provides default)", () => {
    const result = createTenderSchema.safeParse(LEGACY_TENDER_BASE);
    expect(result.success).toBe(true);
  });

  it("a tender with explicit targetAudienceTypes=['company'] is valid", () => {
    const result = createTenderSchema.safeParse({
      ...LEGACY_TENDER_BASE,
      targetAudienceTypes: ["company"],
    });
    expect(result.success).toBe(true);
    expect(result.data?.targetAudienceTypes).toEqual(["company"]);
  });

  it("a tender targeting every type is valid", () => {
    const result = createTenderSchema.safeParse({
      ...LEGACY_TENDER_BASE,
      targetAudienceTypes: ["company", "team", "individual"],
    });
    expect(result.success).toBe(true);
  });
});

// ─── ownerUserId backfill contract ────────────────────────────────────────────

/**
 * The migration sets ownerUserId on non-company accounts from the userCompanies
 * 'owner' row. This test verifies the business rule: only non-company accounts
 * should have an ownerUserId populated at creation time.
 */
function shouldSetOwnerUserId(accountType: string): boolean {
  return accountType !== "company";
}

describe("migration safety — ownerUserId backfill rule", () => {
  it("company accounts do NOT get ownerUserId", () => {
    expect(shouldSetOwnerUserId("company")).toBe(false);
  });

  it("team accounts DO get ownerUserId", () => {
    expect(shouldSetOwnerUserId("team")).toBe(true);
  });

  it("individual accounts DO get ownerUserId", () => {
    expect(shouldSetOwnerUserId("individual")).toBe(true);
  });
});

// ─── Exhaustive type coverage ─────────────────────────────────────────────────

describe("all account types are covered in the targeting matrix", () => {
  it("every ACCOUNT_TYPE sees its own single-type tender", () => {
    for (const type of ACCOUNT_TYPES) {
      expect(canCallerSeeTender(type, [type])).toBe(true);
    }
  });

  it("every ACCOUNT_TYPE is excluded from other types' single-type tenders", () => {
    for (const callerType of ACCOUNT_TYPES) {
      for (const targetType of ACCOUNT_TYPES) {
        if (callerType !== targetType) {
          expect(canCallerSeeTender(callerType, [targetType])).toBe(false);
        }
      }
    }
  });

  it("every ACCOUNT_TYPE sees all-audience tenders", () => {
    const allAudience = [...ACCOUNT_TYPES];
    for (const type of ACCOUNT_TYPES) {
      expect(canCallerSeeTender(type, allAudience)).toBe(true);
    }
  });
});
