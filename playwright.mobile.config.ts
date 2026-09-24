// Mobile + Arabic audit. Photographs every screen state in
// tests/mobile/states.json on several phones (and desktop, to prove it didn't
// change), runs the in-page checklist, and saves both to
// .mobile-audit/<batch>/<phase>/<project>/. See docs/mobile-audit/README.md.
//
//   AUDIT_PHASE=before  npx playwright test -c playwright.mobile.config.ts   # baseline, never fails
//   AUDIT_PHASE=after   …                                                   # re-photograph after fixes
//   AUDIT_PHASE=assert  …                                                   # after + fail on any problem
//   AUDIT_STATES=login-default,signup-errors  AUDIT_LANGS=ar  --project=iphone-chrome   # narrow it down
//
// Batch 1 runs in fixture mode: plain Vite on :5138 with no backend, and the
// guard (tests/mobile/guard.cjs) answers every API call from sample data, so
// nothing can be saved or emailed.
import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.AUDIT_PORT ?? "5138";
const fixtureMode = PORT === "5138";

export default defineConfig({
  testDir: "./tests/mobile",
  testMatch: /capture\.spec\.ts/,
  outputDir: ".mobile-audit/test-results",
  fullyParallel: true,
  // Fixture mode has no shared server state, so tests can run side by side.
  // Session mode (real server, real account) runs one at a time.
  workers: fixtureMode ? 4 : 1,
  timeout: 60_000,
  reporter: [["line"]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ar-SA",
    timezoneId: "Asia/Riyadh",
    trace: "off",
    // Session mode reuses the sign-in you made yourself with `npm run e2e:login`.
    ...(fixtureMode ? {} : { storageState: "tests/e2e/.auth/user.json" }),
  },

  webServer: fixtureMode
    ? {
        command: "npx vite --port 5138 --strictPort",
        url: "http://localhost:5138",
        reuseExistingServer: true,
        timeout: 90_000,
      }
    : undefined,

  projects: [
    // Small Android (Samsung-size) — things break here first.
    { name: "android-chrome", use: { ...devices["Galaxy S24"] } },
    // The most common iPhone width, in Chrome — the main before/after photos.
    { name: "iphone-chrome", use: { ...devices["iPhone 15"], browserName: "chromium" } },
    // Big iPhone.
    { name: "big-iphone", use: { ...devices["iPhone 15 Pro Max"], browserName: "chromium" } },
    // Safari's engine at iPhone size.
    { name: "iphone-webkit", use: { ...devices["iPhone 15"] } },
    // The phone asks for dark mode (the app's own dark theme).
    { name: "iphone-dark", use: { ...devices["iPhone 15"], browserName: "chromium", colorScheme: "dark" } },
    // Chrome/Samsung "force dark" repainting pages that only support light.
    {
      name: "forced-dark",
      use: {
        ...devices["iPhone 15"],
        browserName: "chromium",
        colorScheme: "dark",
        launchOptions: { args: ["--enable-features=WebContentsForceDark"] },
      },
    },
    // Desktop must look the same before and after.
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
});
