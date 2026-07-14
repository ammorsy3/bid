/**
 * One-time interactive login.
 *
 *   npm run e2e:login
 *
 * Opens a real browser at the login page and waits (up to 5 minutes) for you to
 * sign in — including the emailed OTP code. As soon as the app stores a session
 * token, the browser state is written to tests/e2e/.auth/user.json and every
 * other spec reuses it.
 *
 * This exists so the test suite never depends on Postmark: the specs assert
 * application behaviour, not whether an email arrived. Re-run it whenever the
 * saved session expires (the app issues 7-day tokens).
 */
import { test, expect } from "@playwright/test";
import { mkdirSync } from "fs";
import path from "path";
import { isAuthWall } from "./helpers";

const AUTH_FILE = path.join("tests", "e2e", ".auth", "user.json");

test("capture a signed-in session", async ({ page }) => {
  // Generous: a human is typing an email, opening their inbox, and pasting a code.
  test.setTimeout(5 * 60 * 1000);

  await page.goto("/login");

  console.log("\n  ────────────────────────────────────────────────────");
  console.log("  Sign in in the browser window that just opened.");
  console.log("  Enter your email, then the OTP code sent to your inbox.");
  console.log("  This will continue automatically once you're fully signed in");
  console.log("  and land on a real page of the app.");
  console.log("  ────────────────────────────────────────────────────\n");

  // Do NOT just wait for a token to appear in localStorage: the app stores one
  // *before* the emailed OTP is verified and then parks you on /verify-email.
  // Waiting on that would capture a half-authenticated session that cannot load
  // any real page — and, worse, would look like a valid session to the specs.
  //
  // The only trustworthy signal is that we have a token AND the app has let us
  // out of the auth funnel onto an actual page.
  await expect
    .poll(
      async () => {
        const token = await page.evaluate(() =>
          window.localStorage.getItem("token"),
        );
        if (!token) return false;
        return !isAuthWall(new URL(page.url()).pathname);
      },
      { timeout: 5 * 60 * 1000, intervals: [1000] },
    )
    .toBe(true);

  // Give the app a moment to settle on the post-login screen.
  await page.waitForLoadState("networkidle").catch(() => {});

  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });

  console.log(`\n  Session saved to ${AUTH_FILE}. You can close the browser.\n`);
});
