/**
 * Individual-sourcing decision logic (server/lib/individual-sourcing.ts).
 *
 * These are the pure decisions behind the new individual features — the same
 * functions the routes/storage layer imports, so this covers real code paths:
 *   • Join code generation + validation
 *   • Marketplace audience scoping (individuals see individual-eligible only)
 *   • WhatsApp visibility gating (public vs requesters-only vs owner)
 *   • Recommendation scoring / ranking
 *   • Username sanitization + length rules
 */

import { describe, it, expect } from "vitest";
import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  generateJoinCode,
  isValidJoinCode,
  marketplaceAudienceFor,
  gateWhatsappVisibility,
  scoreSuggestion,
  sanitizeUsername,
  isValidUsername,
} from "../server/lib/individual-sourcing";

// ─── Join codes ───────────────────────────────────────────────────────────────

describe("generateJoinCode", () => {
  it("produces codes of the fixed length", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateJoinCode()).toHaveLength(JOIN_CODE_LENGTH);
    }
  });

  it("uses only the unambiguous alphabet (no 0/O/1/I)", () => {
    const code = generateJoinCode();
    for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch);
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[01OI]/);
  });

  it("is overwhelmingly unique across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateJoinCode());
    // 32^8 space → 1000 draws should essentially never collide.
    expect(seen.size).toBe(1000);
  });
});

describe("isValidJoinCode", () => {
  it("accepts a freshly generated code", () => {
    expect(isValidJoinCode(generateJoinCode())).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidJoinCode("ABC")).toBe(false);
    expect(isValidJoinCode("ABCDEFGHJ")).toBe(false);
  });

  it("rejects ambiguous / out-of-alphabet characters", () => {
    expect(isValidJoinCode("ABCDEFG0")).toBe(false); // 0 not allowed
    expect(isValidJoinCode("ABCDEFGO")).toBe(false); // O not allowed
    expect(isValidJoinCode("abcdefgh")).toBe(false); // lowercase not allowed
  });

  it("rejects non-strings", () => {
    expect(isValidJoinCode(undefined as any)).toBe(false);
    expect(isValidJoinCode(null as any)).toBe(false);
  });
});

// ─── Marketplace audience scope ───────────────────────────────────────────────

describe("marketplaceAudienceFor", () => {
  it("scopes individuals to individual-eligible tenders", () => {
    expect(marketplaceAudienceFor("individual")).toBe("individual");
  });

  it("does not scope companies (full view)", () => {
    expect(marketplaceAudienceFor("company")).toBeUndefined();
  });

  it("does not scope teams (full view)", () => {
    expect(marketplaceAudienceFor("team")).toBeUndefined();
  });

  it("does not scope anonymous callers", () => {
    expect(marketplaceAudienceFor(undefined)).toBeUndefined();
  });
});

// ─── WhatsApp visibility gating ───────────────────────────────────────────────

describe("gateWhatsappVisibility", () => {
  const NUM = "+966500000000";

  it("returns nothing (unlocked) when no number is set", () => {
    const r = gateWhatsappVisibility({ number: null, visibility: "public", isOwner: false, viewerHasApplication: true });
    expect(r).toEqual({ number: null, locked: false });
  });

  it("always shows the number to the owner, even when requesters-only", () => {
    const r = gateWhatsappVisibility({ number: NUM, visibility: "requesters", isOwner: true, viewerHasApplication: false });
    expect(r).toEqual({ number: NUM, locked: false });
  });

  it("shows a public number to everyone", () => {
    const r = gateWhatsappVisibility({ number: NUM, visibility: "public", isOwner: false, viewerHasApplication: false });
    expect(r).toEqual({ number: NUM, locked: false });
  });

  it("hides a requesters-only number from a viewer who hasn't applied", () => {
    const r = gateWhatsappVisibility({ number: NUM, visibility: "requesters", isOwner: false, viewerHasApplication: false });
    expect(r).toEqual({ number: null, locked: true });
  });

  it("reveals a requesters-only number once the viewer has applied", () => {
    const r = gateWhatsappVisibility({ number: NUM, visibility: "requesters", isOwner: false, viewerHasApplication: true });
    expect(r).toEqual({ number: NUM, locked: false });
  });

  it("treats an unknown/missing visibility as requesters-only (safe default)", () => {
    const r = gateWhatsappVisibility({ number: NUM, visibility: undefined, isOwner: false, viewerHasApplication: false });
    expect(r).toEqual({ number: null, locked: true });
  });
});

// ─── Recommendation scoring ───────────────────────────────────────────────────

describe("scoreSuggestion", () => {
  it("gives the biggest boost to a field/category match", () => {
    const match = scoreSuggestion({ tenderCategory: "IT Services", requesterCity: null, candidate: { category: "IT Services" } });
    const noMatch = scoreSuggestion({ tenderCategory: "IT Services", requesterCity: null, candidate: { category: "Marketing" } });
    expect(match).toBeGreaterThanOrEqual(100);
    expect(match).toBeGreaterThan(noMatch);
  });

  it("adds points for verified and 'accepting' availability", () => {
    const base = scoreSuggestion({ tenderCategory: "IT", requesterCity: null, candidate: { category: "IT" } });
    const better = scoreSuggestion({
      tenderCategory: "IT",
      requesterCity: null,
      candidate: { category: "IT", verificationStatus: "verified", availabilityStatus: "accepting" },
    });
    expect(better).toBe(base + 20 + 15);
  });

  it("adds a same-city tie-breaker (case-insensitive)", () => {
    const s = scoreSuggestion({ tenderCategory: null, requesterCity: "Riyadh", candidate: { city: "riyadh" } });
    expect(s).toBe(10);
  });

  it("ranks a verified same-field candidate above an unverified off-field one", () => {
    const a = scoreSuggestion({ tenderCategory: "IT", requesterCity: "Riyadh", candidate: { category: "IT", verificationStatus: "verified", city: "Riyadh" } });
    const b = scoreSuggestion({ tenderCategory: "IT", requesterCity: "Riyadh", candidate: { category: "Marketing", city: "Jeddah" } });
    expect(a).toBeGreaterThan(b);
  });

  it("scores zero when nothing matches", () => {
    expect(scoreSuggestion({ tenderCategory: "IT", requesterCity: "Riyadh", candidate: { category: "Marketing", city: "Jeddah" } })).toBe(0);
  });
});

// ─── Username sanitization ────────────────────────────────────────────────────

describe("sanitizeUsername", () => {
  it("lowercases and dashes out spaces/symbols", () => {
    expect(sanitizeUsername("Ahmed Farag!")).toBe("ahmed-farag");
  });

  it("collapses runs and trims leading/trailing dashes", () => {
    expect(sanitizeUsername("  --Al  Pha--  ")).toBe("al-pha");
  });

  it("keeps digits", () => {
    expect(sanitizeUsername("Studio 21")).toBe("studio-21");
  });
});

describe("isValidUsername", () => {
  it("requires 3–40 characters", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("abc")).toBe(true);
    expect(isValidUsername("a".repeat(40))).toBe(true);
    expect(isValidUsername("a".repeat(41))).toBe(false);
  });
});
