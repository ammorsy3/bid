// Helpers for generating, hashing, and verifying API keys. Kept out of the
// middleware so admin/UI flows (Phase 3.1) can generate keys without pulling in
// Express types.

import crypto from "crypto";
import bcrypt from "bcrypt";

const KEY_TAG = "bidc_live_";
const RANDOM_BYTES = 24; // 24 bytes → 32-char url-safe encoding
const BCRYPT_ROUNDS = 10;
export const API_KEY_PREFIX_LENGTH = 12;

export interface GeneratedApiKey {
  /** The raw, unhashed key. Return this to the caller EXACTLY ONCE. */
  raw: string;
  /** Indexable prefix (first 12 chars of the raw key). Stored for O(1) lookup. */
  prefix: string;
  /** bcrypt hash of the raw key. This is what's persisted. */
  hashedKey: string;
}

export async function generateApiKey(): Promise<GeneratedApiKey> {
  const random = crypto.randomBytes(RANDOM_BYTES).toString("base64url");
  const raw = `${KEY_TAG}${random}`;
  const prefix = raw.slice(0, API_KEY_PREFIX_LENGTH);
  const hashedKey = await bcrypt.hash(raw, BCRYPT_ROUNDS);
  return { raw, prefix, hashedKey };
}

export function extractKeyPrefix(raw: string): string | null {
  if (typeof raw !== "string" || !raw.startsWith(KEY_TAG)) return null;
  if (raw.length < API_KEY_PREFIX_LENGTH + 8) return null; // too short to be real
  return raw.slice(0, API_KEY_PREFIX_LENGTH);
}

export async function verifyApiKey(raw: string, hashedKey: string): Promise<boolean> {
  try {
    return await bcrypt.compare(raw, hashedKey);
  } catch {
    return false;
  }
}

export type ApiKeyScope = "copilot:chat" | "tender:create";
export const ALL_SCOPES: ApiKeyScope[] = ["copilot:chat", "tender:create"];
