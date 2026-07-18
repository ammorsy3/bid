// Shared RFP-description writing rules. Imported by BOTH the Bid Copilot system
// prompt (server/ai/copilot/prompt.ts) and the "Suggest with AI" description
// writer (server/lib/tender-ai.ts) so the two stay in the same spec-not-marketing
// voice and their banned-phrase lists can never drift apart.

// Generic filler / marketing phrases an RFP description must never use. The model
// is told to avoid any close variant of these, not just exact matches.
export const BANNED_FILLER_PHRASES = [
  "in today's digital landscape",
  "in today's world",
  "in an increasingly digital world",
  "diverse audience",
  "culture of resilience",
  "culture of cyber resilience",
  "impactful and far-reaching",
  "cutting-edge",
  "state-of-the-art",
  "seamless",
  "seamlessly",
  "robust",
  "dynamic",
  "holistic",
  "synergy",
  "unlock",
  "empower",
  "leverage",
  "game-changing",
  "best-in-class",
] as const;

// Comma-separated, each phrase quoted — ready to drop straight into a prompt
// sentence after "Banned phrases and any close variant:".
export const BANNED_FILLER_PHRASES_LIST = BANNED_FILLER_PHRASES.map((p) => `"${p}"`).join(", ");
