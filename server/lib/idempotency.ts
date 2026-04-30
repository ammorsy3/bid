// In-memory idempotency cache. Protects against double-processing when a
// caller retries a request (e.g. n8n's HTTP node retrying on timeout): the
// same (scope, key) combination returns the original response instead of
// hitting OpenAI or re-creating a tender.
//
// TTL: 24 hours. Good enough for pre-seed; move to a durable store (Redis or
// a small DB table) when we scale beyond one server instance.

interface Entry {
  response: unknown;
  expiresAt: number;
}

const cache = new Map<string, Entry>();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function sweep() {
  const now = Date.now();
  cache.forEach((v, k) => {
    if (v.expiresAt <= now) cache.delete(k);
  });
}

function buildKey(scope: string, sessionId: string, idempotencyKey: string): string {
  return `${scope}:${sessionId}:${idempotencyKey}`;
}

export function lookupIdempotent<T = unknown>(
  scope: string,
  sessionId: string,
  idempotencyKey: string | undefined,
): T | null {
  if (!idempotencyKey) return null;
  sweep();
  const entry = cache.get(buildKey(scope, sessionId, idempotencyKey));
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(buildKey(scope, sessionId, idempotencyKey));
    return null;
  }
  return entry.response as T;
}

export function storeIdempotent(
  scope: string,
  sessionId: string,
  idempotencyKey: string | undefined,
  response: unknown,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  if (!idempotencyKey) return;
  cache.set(buildKey(scope, sessionId, idempotencyKey), {
    response,
    expiresAt: Date.now() + ttlMs,
  });
}

/** For tests. */
export function _resetIdempotencyState(): void {
  cache.clear();
}
