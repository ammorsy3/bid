/**
 * Fails the whole run early if the saved session is not usable.
 *
 * This exists because of a real incident: a half-authenticated session (token
 * present, OTP never verified) left every page redirecting to /verify-email,
 * and that screen auto-requests a code. Twenty-four page loads therefore fired
 * twenty-four OTP requests and rate-limited the account — while the suite
 * happily reported green.
 *
 * One cheap check up front is worth more than any number of retries afterwards.
 */
import { chromium, type FullConfig } from "@playwright/test";
import { existsSync } from "fs";
import { isAuthWall } from "./helpers";

const AUTH_FILE = "tests/e2e/.auth/user.json";

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects.find((p) => p.use?.baseURL)?.use.baseURL ??
    "http://localhost:5137";

  if (!existsSync(AUTH_FILE)) {
    throw new Error(
      `No saved session at ${AUTH_FILE}.\n\n  Run:  npm run e2e:login\n`,
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ storageState: AUTH_FILE });

  try {
    await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    const pathname = new URL(page.url()).pathname;
    if (isAuthWall(pathname)) {
      throw new Error(
        `The saved session is not signed in — it lands on ${pathname}.\n\n` +
          `  Re-run:  npm run e2e:login\n\n` +
          `  Complete the whole sign-in, including the emailed OTP code. The app\n` +
          `  stores a token before the code is verified, so closing the browser\n` +
          `  early saves a session that cannot load any page.\n`,
      );
    }
  } finally {
    await browser.close();
  }
}
