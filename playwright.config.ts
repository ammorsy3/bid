// Specs clean up the files they upload, which needs the Supabase credentials.
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.E2E_PORT ?? "5137";

export default defineConfig({
  testDir: "./tests/e2e",
  // The app is a single shared instance backed by the live database, so specs
  // run serially — parallel runs would fight over the same account's state.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],

  // Verifies the saved session before a single spec runs. A session parked on
  // /verify-email would otherwise have every page re-request an OTP and
  // rate-limit the account. Skipped for the interactive login project below.
  globalSetup: process.env.E2E_SKIP_SESSION_CHECK
    ? undefined
    : "./tests/e2e/global-setup.ts",

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      // Run `npm run e2e:login` to (re)create this. Opens a real browser and
      // waits for you to sign in with the email OTP; the session is then saved
      // to tests/e2e/.auth/user.json and reused by every spec below.
      name: "login",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], headless: false },
    },
    {
      name: "chromium",
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/user.json",
      },
    },
  ],
});
