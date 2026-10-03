// Where to send someone back to after they upgrade. Kept in sessionStorage
// when the dialog sends them to /upgrade, read once they finish.

const KEY = "bid:upgrade-return";

/** Same-origin paths only: "/tenders/new/review", never "//evil.example" or a full URL. */
function isSafePath(p: unknown): p is string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\");
}

export function rememberReturnPath(path: string) {
  try {
    // Don't remember the upgrade page itself.
    if (isSafePath(path) && !path.startsWith("/upgrade")) sessionStorage.setItem(KEY, path);
  } catch { /* private mode: no return path, we go to the dashboard */ }
}

export function takeReturnPath(fallback = "/dashboard"): string {
  try {
    const p = sessionStorage.getItem(KEY);
    return isSafePath(p) ? p : fallback;
  } catch {
    return fallback;
  }
}

export function clearReturnPath() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
