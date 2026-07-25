// Pure decision helpers for the individual-sourcing features. Kept free of DB
// and Express types so both the routes/storage layer and the tests can import
// the exact same logic (no mirrored copies that can drift).

import crypto from "crypto";

// ── Join codes ───────────────────────────────────────────────────────────────

// Unambiguous alphabet: no 0/O/1/I to avoid transcription errors.
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 8;

/** Generate a reusable workspace join code. */
export function generateJoinCode(): string {
  const bytes = crypto.randomBytes(JOIN_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    out += JOIN_CODE_ALPHABET[bytes[i] % JOIN_CODE_ALPHABET.length];
  }
  return out;
}

/** True if a string is a structurally valid join code. */
export function isValidJoinCode(code: string): boolean {
  if (typeof code !== "string" || code.length !== JOIN_CODE_LENGTH) return false;
  for (const ch of code) {
    if (!JOIN_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

// ── Marketplace audience scope ───────────────────────────────────────────────

/**
 * Which audience a marketplace request should be scoped to. Individuals only
 * see individual-eligible tenders; companies/teams (and anonymous callers) keep
 * the full view. Returns undefined for "no audience filter".
 */
export function marketplaceAudienceFor(callerAccountType: string | undefined): string | undefined {
  return callerAccountType === "individual" ? "individual" : undefined;
}

// ── WhatsApp visibility gating ───────────────────────────────────────────────

export type WhatsappVisibility = "requesters" | "public";

export interface WhatsappGateInput {
  number: string | null | undefined;
  visibility: WhatsappVisibility | string | null | undefined;
  /** Is the viewer the profile owner (same active workspace)? */
  isOwner: boolean;
  /** Has the viewer's active workspace received an application from this individual? */
  viewerHasApplication: boolean;
}

export interface WhatsappGateResult {
  number: string | null;
  locked: boolean;
}

/**
 * Decide whether a profile's WhatsApp number is shown to a viewer.
 *   • no number            → nothing, not locked
 *   • owner                → shown
 *   • visibility 'public'  → shown to everyone
 *   • 'requesters'         → shown only if the viewer received an application
 *   • otherwise            → withheld and flagged locked
 */
export function gateWhatsappVisibility(input: WhatsappGateInput): WhatsappGateResult {
  const number = input.number || null;
  if (!number) return { number: null, locked: false };

  let visible = false;
  if (input.isOwner || input.visibility === "public") {
    visible = true;
  } else if (input.viewerHasApplication) {
    visible = true;
  }

  return { number: visible ? number : null, locked: !visible };
}

// ── Recommendation scoring ───────────────────────────────────────────────────

export interface SuggestionScoreInput {
  /** The tender's category. */
  tenderCategory?: string | null;
  /** The requesting company's city. */
  requesterCity?: string | null;
  /** The candidate individual. */
  candidate: {
    category?: string | null;
    city?: string | null;
    verificationStatus?: string | null;
    availabilityStatus?: string | null;
  };
}

/**
 * Score an individual as a match for a tender. Higher is better. Field match
 * dominates, then verification, availability, and same-city as tie-breakers.
 * Mirrors the ranking used by getSuggestedIndividualsForTender.
 */
export function scoreSuggestion(input: SuggestionScoreInput): number {
  const { tenderCategory, requesterCity, candidate } = input;
  let score = 0;
  if (tenderCategory && candidate.category === tenderCategory) score += 100;
  if (candidate.verificationStatus === "verified") score += 20;
  if (candidate.availabilityStatus === "accepting") score += 15;
  if (
    requesterCity &&
    candidate.city &&
    candidate.city.toLowerCase() === requesterCity.toLowerCase()
  ) {
    score += 10;
  }
  return score;
}

// ── Username / slug sanitization ─────────────────────────────────────────────

/** Sanitize a username into a URL-safe slug (lowercase, dashes). */
export function sanitizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Whether a sanitized username is an acceptable length (3–40). */
export function isValidUsername(sanitized: string): boolean {
  return sanitized.length >= 3 && sanitized.length <= 40;
}
