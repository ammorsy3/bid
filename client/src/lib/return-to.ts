// "Take me back where I came from" after signing in or signing up.
//
// The public tender invite page (and similar pages) send a logged-out visitor to
// /login or /signup?redirect=<path>. Email sign-in reads that param directly,
// but social sign-in (Google / LinkedIn / Slack) leaves the site and returns to
// /auth/clerk-callback, which has no query string. So the login and signup pages
// also park the path here, and the callback picks it up.

const KEY = "bid:return-to";
const MAX_AGE_MS = 60 * 60 * 1000; // an abandoned attempt must not hijack a later sign-in

/**
 * Returns the path when it is a same-origin relative path ("/invite/abc?i=1"),
 * otherwise null. Rejects full URLs, protocol-relative "//host", backslash tricks
 * and control characters, so it can never become an open redirect.
 */
export function safeReturnTo(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const p = raw.trim();
  if (p.length === 0 || p.length > 2000) return null;
  if (!p.startsWith("/") || p.startsWith("//")) return null;
  if (p.includes("\\")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(p)) return null;
  return p;
}

/** Link to /login or /signup that remembers where the visitor was. */
export function authUrlWithReturn(authPath: "/login" | "/signup", returnTo: string): string {
  const safe = safeReturnTo(returnTo);
  return safe ? `${authPath}?redirect=${encodeURIComponent(safe)}` : authPath;
}

/** Remember the path (or forget any earlier one when there is none). */
export function stashReturnTo(raw: unknown): void {
  try {
    const safe = safeReturnTo(raw);
    if (safe) localStorage.setItem(KEY, JSON.stringify({ path: safe, at: Date.now() }));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the redirect query param still covers email sign-in */
  }
}

/** Read and clear the remembered path. */
export function takeReturnTo(): string | null {
  try {
    const stored = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!stored) return null;
    const { path, at } = JSON.parse(stored) as { path?: unknown; at?: unknown };
    if (typeof at !== "number" || Date.now() - at > MAX_AGE_MS) return null;
    return safeReturnTo(path);
  } catch {
    return null;
  }
}
