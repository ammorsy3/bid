// Per-tenant secret lookup. For pre-seed / hands-on onboarding we keep
// integration secrets (Slack bot tokens, webhook HMAC secrets, etc.) in env
// vars keyed by companyId rather than an encrypted DB column. Avoids pulling
// KMS into the stack until we actually have >~10 design partners.
//
// Naming convention:
//   <SECRET_NAME>_<companyId>
//
// Examples:
//   SLACK_BOT_TOKEN_3f9c...
//   WEBHOOK_HMAC_SECRET_3f9c...
//
// Company IDs are UUIDs, which are valid env-var-name characters once dashes
// are replaced with underscores.

function sanitize(companyId: string): string {
  return companyId.replace(/-/g, "_");
}

/**
 * Read a per-tenant secret from the process environment.
 * Returns undefined (not null) when the env var is missing, so callers can
 * branch cleanly with `if (secret)` or default via `??`.
 */
export function getTenantSecret(companyId: string, key: string): string | undefined {
  if (!companyId || !key) return undefined;
  const envKey = `${key}_${sanitize(companyId)}`;
  const v = process.env[envKey];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Common secret keys. Using constants avoids typos across the codebase.
 */
export const TenantSecretKey = {
  SlackBotToken: "SLACK_BOT_TOKEN",
  SlackSigningSecret: "SLACK_SIGNING_SECRET",
  WebhookHmacSecret: "WEBHOOK_HMAC_SECRET",
  OpenAIApiKey: "OPENAI_API_KEY",
} as const;
