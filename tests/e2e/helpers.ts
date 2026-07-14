import { expect, type Page, type ConsoleMessage } from "@playwright/test";

/**
 * Noise we do not want failing the suite: browser-level chatter that is not the
 * app reporting a fault. Keep this list short and specific — every entry here is
 * a bug we have chosen not to see.
 */
const IGNORED_CONSOLE = [
  /favicon/i,
  /Download the React DevTools/i,
  /\[vite\] connect/i,
  /React Router Future Flag/i,
];

export type PageWatcher = {
  /** Throws if the page logged errors, failed requests, or rendered an error overlay. */
  assertClean: () => Promise<void>;
  consoleErrors: string[];
  failedRequests: string[];
};

/**
 * Watches a page for the symptoms of a real failure.
 *
 * This is the layer that catches what the API tests cannot: a broken button, a
 * request the client never sends, a 403 the UI surfaces as a crash overlay. The
 * 403 on file view during the Supabase migration showed up exactly this way.
 */
export function watch(page: Page): PageWatcher {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`uncaught: ${err.message}`);
  });

  page.on("response", (res) => {
    const status = res.status();
    const url = res.url();
    // 401 on an unauthenticated probe is legitimate; 4xx/5xx on a page the
    // signed-in user is looking at is not.
    if (status >= 400 && !url.includes("/api/errors")) {
      failedRequests.push(`${status} ${res.request().method()} ${url}`);
    }
  });

  return {
    consoleErrors,
    failedRequests,
    async assertClean() {
      // Vite surfaces runtime errors as an overlay element rather than a crash.
      const overlay = page.locator("vite-error-overlay");
      await expect(
        overlay,
        "the app rendered a runtime error overlay",
      ).toHaveCount(0);

      expect(consoleErrors, "console errors on the page").toEqual([]);
      expect(failedRequests, "failed network requests").toEqual([]);
    },
  };
}

/** Navigates and waits for the app shell to actually render something. */
export async function visit(page: Page, path: string) {
  const w = watch(page);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // The app is a SPA; give it a beat to hydrate and fire its data fetches.
  await page.waitForLoadState("networkidle").catch(() => {});
  return w;
}

/**
 * Pages that mean "you are not actually in the app yet".
 *
 * /verify-email matters as much as /login: the app issues a JWT *before* the
 * emailed OTP is verified, so a session can hold a real-looking token and still
 * be parked on the verification screen. Treating that as signed-in let a whole
 * suite pass green while every page was really the OTP prompt.
 */
const AUTH_WALL =
  /^\/(login|signup|verify-email|reset-password|onboarding|company-onboarding|auth\/|sso-callback)/;

export function isAuthWall(pathname: string) {
  return AUTH_WALL.test(pathname);
}

/** True when the app has not let us through to a real page. */
export async function isLoggedOut(page: Page) {
  return isAuthWall(new URL(page.url()).pathname);
}
