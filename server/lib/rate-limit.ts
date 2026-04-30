// Simple in-memory token-bucket rate limiter. Keyed per API key (or per IP for
// unauthed routes). For pre-seed (single-instance server) this is sufficient;
// move to Redis once we horizontally scale.
//
// Usage:
//   const bucket = takeToken(`apiKey:${apiKeyId}`, { capacity: 30, refillPerMinute: 30 });
//   if (!bucket.allowed) res.setHeader('Retry-After', bucket.retryAfterSeconds).status(429)...

interface BucketState {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, BucketState>();

export interface RateLimitOptions {
  /** Max tokens the bucket can hold. */
  capacity: number;
  /** Tokens added per minute. */
  refillPerMinute: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function takeToken(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const refillRatePerMs = opts.refillPerMinute / 60_000;

  let b = buckets.get(key);
  if (!b) {
    b = { tokens: opts.capacity, lastRefill: now };
    buckets.set(key, b);
  }

  // Refill.
  const elapsed = now - b.lastRefill;
  if (elapsed > 0) {
    b.tokens = Math.min(opts.capacity, b.tokens + elapsed * refillRatePerMs);
    b.lastRefill = now;
  }

  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { allowed: true, remaining: Math.floor(b.tokens), retryAfterSeconds: 0 };
  }

  const deficit = 1 - b.tokens;
  const retryAfterSeconds = Math.ceil(deficit / refillRatePerMs / 1000);
  return { allowed: false, remaining: 0, retryAfterSeconds };
}

/** For tests: clear all buckets. */
export function _resetRateLimitState(): void {
  buckets.clear();
}
