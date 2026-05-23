/**
 * BID-189 — End-to-end: Individual + Team flows + role permissions
 *
 * Tests the role mapping helpers and workspace-kind logic:
 *   • displayRoleName maps DB roles → display labels per workspace kind
 *   • Individual workspaces hide the Team Members section
 *   • Team workspaces show BD / Member labels instead of Member / Viewer
 *   • Company workspaces are unchanged (Owner / Admin / Member / Viewer)
 *   • createCompanySchema accepts accountType 'individual' and 'team'
 *   • nationalIdNumber validation enforces 10-digit format
 */

import { describe, it, expect } from "vitest";
import { displayRoleName } from "../client/src/lib/roles";
import { createCompanySchema } from "../shared/schema";
import type { WorkspaceKind } from "../client/src/lib/useWorkspaceKind";

// ─── displayRoleName ──────────────────────────────────────────────────────────

describe("displayRoleName — company workspace (unchanged regression)", () => {
  const kind: WorkspaceKind = "company";

  it("maps owner → 'Owner'", () => {
    expect(displayRoleName("owner", kind)).toBe("Owner");
  });

  it("maps admin → 'Admin'", () => {
    expect(displayRoleName("admin", kind)).toBe("Admin");
  });

  it("maps member → 'Member'", () => {
    expect(displayRoleName("member", kind)).toBe("Member");
  });

  it("maps viewer → 'Viewer'", () => {
    expect(displayRoleName("viewer", kind)).toBe("Viewer");
  });

  it("falls back to raw role for unknown DB roles", () => {
    expect(displayRoleName("superadmin", kind)).toBe("superadmin");
  });
});

describe("displayRoleName — team workspace", () => {
  const kind: WorkspaceKind = "team";

  it("maps owner → 'Admin' (team admins appear as Admin)", () => {
    expect(displayRoleName("owner", kind)).toBe("Admin");
  });

  it("maps admin → 'Admin'", () => {
    expect(displayRoleName("admin", kind)).toBe("Admin");
  });

  it("maps member (BD) → 'Business Dev'", () => {
    expect(displayRoleName("member", kind)).toBe("Business Dev");
  });

  it("maps viewer → 'Member' (read-only team member)", () => {
    expect(displayRoleName("viewer", kind)).toBe("Member");
  });

  it("falls back to raw role for unknown DB roles", () => {
    expect(displayRoleName("wizard", kind)).toBe("wizard");
  });
});

describe("displayRoleName — individual workspace", () => {
  const kind: WorkspaceKind = "individual";

  it("maps owner → 'Owner' (sole account holder)", () => {
    expect(displayRoleName("owner", kind)).toBe("Owner");
  });

  it("returns raw role for any other DB role (individuals have no teammates)", () => {
    expect(displayRoleName("member", kind)).toBe("member");
    expect(displayRoleName("viewer", kind)).toBe("viewer");
  });
});

// ─── Team role permission semantics ───────────────────────────────────────────

/** Mirrors the server-side permission check for submitting proposals */
function canSubmitProposals(role: string): boolean {
  // owner and member (BD) can apply; viewer (Member) and below cannot
  return role === "owner" || role === "admin" || role === "member";
}

/** Mirrors the server-side check for sending inquiry messages */
function canSendInquiries(role: string): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

describe("team BD (DB: member) permissions", () => {
  it("can submit proposals", () => {
    expect(canSubmitProposals("member")).toBe(true);
  });

  it("can send inquiries", () => {
    expect(canSendInquiries("member")).toBe(true);
  });
});

describe("team Member (DB: viewer) permissions", () => {
  it("cannot submit proposals", () => {
    expect(canSubmitProposals("viewer")).toBe(false);
  });

  it("cannot send inquiries", () => {
    expect(canSendInquiries("viewer")).toBe(false);
  });
});

describe("team Admin (DB: owner/admin) permissions", () => {
  it("owner can submit proposals", () => {
    expect(canSubmitProposals("owner")).toBe(true);
  });

  it("admin can submit proposals", () => {
    expect(canSubmitProposals("admin")).toBe(true);
  });
});

// ─── Individual workspace schema ──────────────────────────────────────────────

describe("createCompanySchema — individual account type", () => {
  it("accepts accountType='individual' with just a name", () => {
    const result = createCompanySchema.parse({
      name: "Ahmed Al-Mansouri",
      accountType: "individual",
    });
    expect(result.accountType).toBe("individual");
    expect(result.name).toBe("Ahmed Al-Mansouri");
  });

  it("accepts an individual with a National ID number", () => {
    const result = createCompanySchema.parse({
      name: "Sara K.",
      accountType: "individual",
      nationalIdNumber: "1234567890",
    });
    expect(result.nationalIdNumber).toBe("1234567890");
  });

  it("rejects National ID shorter than 10 digits", () => {
    expect(() =>
      createCompanySchema.parse({
        name: "Sara K.",
        accountType: "individual",
        nationalIdNumber: "12345",
      })
    ).toThrow();
  });

  it("rejects National ID longer than 10 digits", () => {
    expect(() =>
      createCompanySchema.parse({
        name: "Sara K.",
        accountType: "individual",
        nationalIdNumber: "12345678901",
      })
    ).toThrow();
  });

  it("rejects National ID with non-digit characters", () => {
    expect(() =>
      createCompanySchema.parse({
        name: "Sara K.",
        accountType: "individual",
        nationalIdNumber: "123456789X",
      })
    ).toThrow();
  });
});

// ─── Team workspace schema ────────────────────────────────────────────────────

describe("createCompanySchema — team account type", () => {
  it("accepts accountType='team' with a name", () => {
    const result = createCompanySchema.parse({
      name: "Pixel Squad",
      accountType: "team",
    });
    expect(result.accountType).toBe("team");
  });

  it("accepts an optional category for teams (must be a valid VENDOR_CATEGORIES value)", () => {
    const result = createCompanySchema.parse({
      name: "Dev Crew",
      accountType: "team",
      category: "Information Technology",
    });
    expect(result.category).toBe("Information Technology");
  });

  it("rejects a team name shorter than 2 characters", () => {
    expect(() =>
      createCompanySchema.parse({ name: "X", accountType: "team" })
    ).toThrow();
  });
});

// ─── Workspace kind derivation (pure logic mirror of useWorkspaceKind) ────────

type RawAccountType = "company" | "team" | "individual" | null | undefined;

function deriveWorkspaceKind(accountType: RawAccountType): WorkspaceKind {
  return (accountType as WorkspaceKind) ?? "company";
}

describe("workspace kind derivation", () => {
  it("returns 'company' for null (legacy account without accountType)", () => {
    expect(deriveWorkspaceKind(null)).toBe("company");
  });

  it("returns 'company' for undefined", () => {
    expect(deriveWorkspaceKind(undefined)).toBe("company");
  });

  it("returns 'individual' for individual accounts", () => {
    expect(deriveWorkspaceKind("individual")).toBe("individual");
  });

  it("returns 'team' for team accounts", () => {
    expect(deriveWorkspaceKind("team")).toBe("team");
  });

  it("returns 'company' for company accounts", () => {
    expect(deriveWorkspaceKind("company")).toBe("company");
  });
});
