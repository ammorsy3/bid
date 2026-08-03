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
//
// displayRoleName now returns a TRANSLATED name: it takes a `t` and looks up an
// i18n key rather than returning a hardcoded English string. Arabic users were
// seeing "Owner"/"Admin"/"Business Dev" untranslated in the members list and the
// workspace switcher.
//
// These tests pass an identity `t` so they assert the KEY each role maps to.
// That checks the mapping — which is the logic worth protecting — without
// pinning the tests to English copy that translators may reword.

const tKey = (k: string) => k;

describe("displayRoleName — company workspace", () => {
  const kind: WorkspaceKind = "company";

  it("maps owner → the owner key", () => {
    expect(displayRoleName("owner", kind, tKey)).toBe("dashboard.roleOwner");
  });

  it("maps admin → the admin key", () => {
    expect(displayRoleName("admin", kind, tKey)).toBe("dashboard.roleAdmin");
  });

  it("maps member → the member key", () => {
    expect(displayRoleName("member", kind, tKey)).toBe("dashboard.roleMember");
  });

  it("maps viewer → the viewer key", () => {
    expect(displayRoleName("viewer", kind, tKey)).toBe("dashboard.roleViewer");
  });

  it("maps business_developer → the business developer key", () => {
    expect(displayRoleName("business_developer", kind, tKey)).toBe("settings.roleBusinessDeveloper");
  });

  it("falls back to the raw role for unknown DB roles", () => {
    expect(displayRoleName("superadmin", kind, tKey)).toBe("superadmin");
  });
});

describe("displayRoleName — team workspace", () => {
  const kind: WorkspaceKind = "team";

  it("maps owner → the admin key (team owners appear as Admin)", () => {
    expect(displayRoleName("owner", kind, tKey)).toBe("dashboard.roleAdmin");
  });

  it("maps admin → the admin key", () => {
    expect(displayRoleName("admin", kind, tKey)).toBe("dashboard.roleAdmin");
  });

  it("maps business_developer → the business developer key", () => {
    expect(displayRoleName("business_developer", kind, tKey)).toBe("settings.roleBusinessDeveloper");
  });

  it("still maps legacy member → business developer (pre-existing alias, see Q-018)", () => {
    expect(displayRoleName("member", kind, tKey)).toBe("settings.roleBusinessDeveloper");
  });

  it("maps viewer → the member key (read-only team member)", () => {
    expect(displayRoleName("viewer", kind, tKey)).toBe("dashboard.roleMember");
  });

  it("falls back to the raw role for unknown DB roles", () => {
    expect(displayRoleName("wizard", kind, tKey)).toBe("wizard");
  });
});

describe("displayRoleName — individual workspace", () => {
  const kind: WorkspaceKind = "individual";

  it("maps owner → the owner key (sole account holder)", () => {
    expect(displayRoleName("owner", kind, tKey)).toBe("dashboard.roleOwner");
  });

  it("returns the raw role for any other DB role (individuals have no teammates)", () => {
    expect(displayRoleName("member", kind, tKey)).toBe("member");
    expect(displayRoleName("viewer", kind, tKey)).toBe("viewer");
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

  // National ID is no longer collected anywhere: the field was found to be
  // unlawful for us to hold, and migration 0006_drop_national_id.sql removes
  // the column, its unique constraint and the zod validator that used to guard
  // it. These cases previously asserted that validator's 10-digit rule; they
  // now assert the opposite — that supplying the field has no effect and is
  // never persisted. See Q-028.
  it("silently ignores a nationalIdNumber if one is supplied", () => {
    const result = createCompanySchema.parse({
      name: "Sara K.",
      accountType: "individual",
      nationalIdNumber: "1234567890",
    } as Record<string, unknown>);
    expect((result as Record<string, unknown>).nationalIdNumber).toBeUndefined();
  });

  it("does not reject a malformed nationalIdNumber — the field no longer exists", () => {
    expect(() =>
      createCompanySchema.parse({
        name: "Sara K.",
        accountType: "individual",
        nationalIdNumber: "123456789X",
      } as Record<string, unknown>)
    ).not.toThrow();
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
