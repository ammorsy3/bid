// Unit tests for how an email address picks an account. No database: these
// check the rule itself — capitals and stray spaces don't matter, an exact
// match always wins, and a case-only duplicate pair stays ambiguous.

import { describe, it, expect } from "vitest";
import { normalizeEmail, pickAccountForEmail } from "../server/lib/email-address";

describe("normalizeEmail", () => {
  it("lowercases and trims what a phone keyboard produces", () => {
    expect(normalizeEmail("Ahmed@Example.com")).toBe("ahmed@example.com");
    expect(normalizeEmail("  ahmed@example.com ")).toBe("ahmed@example.com");
    expect(normalizeEmail("AHMED@EXAMPLE.COM\t")).toBe("ahmed@example.com");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeEmail("   ")).toBe("");
  });
});

describe("pickAccountForEmail", () => {
  const saved = { id: "saved-with-capital", email: "Ahmed@example.com" };
  const lower = { id: "saved-lowercase", email: "ahmed@example.com" };

  it("uses the exact match when there is one, even if others match loosely", () => {
    expect(pickAccountForEmail(lower, [saved, lower])).toBe(lower);
  });

  it("finds the single account that matches ignoring case", () => {
    expect(pickAccountForEmail(undefined, [saved])).toBe(saved);
  });

  it("refuses to guess between two accounts that differ only by case", () => {
    expect(pickAccountForEmail(undefined, [saved, lower])).toBeUndefined();
  });

  it("returns nothing when no account matches", () => {
    expect(pickAccountForEmail(undefined, [])).toBeUndefined();
  });
});
