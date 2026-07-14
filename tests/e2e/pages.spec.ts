/**
 * Broad page coverage.
 *
 * Every route the signed-in user can reach is loaded and asserted to render
 * without a runtime error overlay, uncaught exception, console error, or failed
 * network request. This is deliberately shallow and wide: it will not tell you a
 * feature is *correct*, but it reliably catches the "whole page exploded" class
 * of regression — which is precisely what a backend migration produces.
 */
import { test, expect } from "@playwright/test";
import { visit, isLoggedOut } from "./helpers";

// Routes reachable by a signed-in, non-admin-specific user.
const APP_PAGES: Array<{ path: string; name: string }> = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/marketplace", name: "marketplace" },
  { path: "/settings", name: "settings" },
  { path: "/settings/integrations", name: "integrations settings" },
  { path: "/company/edit", name: "company edit" },
  { path: "/tenders/new", name: "new tender (entry)" },
  { path: "/docs", name: "docs index" },
  { path: "/getting-started", name: "getting started" },
  { path: "/faq", name: "faq" },
];

// Admin-only surfaces. Skipped automatically if the saved session is not an admin.
const ADMIN_PAGES: Array<{ path: string; name: string }> = [
  { path: "/admin/dashboard", name: "admin dashboard" },
  { path: "/admin/vendors", name: "admin vendors" },
  { path: "/admin/freelancers", name: "admin freelancers" },
  { path: "/admin/marketplace", name: "admin marketplace" },
  { path: "/admin/awards", name: "admin awards" },
  { path: "/admin/users", name: "admin users" },
  { path: "/admin/audit-logs", name: "admin audit logs" },
  { path: "/admin/errors", name: "admin errors" },
];

const PUBLIC_PAGES: Array<{ path: string; name: string }> = [
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
];

test.describe("the saved session works", () => {
  test("lands on the app, not the login page", async ({ page }) => {
    await visit(page, "/dashboard");
    expect(
      await isLoggedOut(page),
      "session expired — re-run `npm run e2e:login`",
    ).toBe(false);
  });
});

test.describe("app pages render cleanly", () => {
  for (const { path, name } of APP_PAGES) {
    test(`${name} (${path})`, async ({ page }) => {
      const w = await visit(page, path);
      expect(await isLoggedOut(page), "bounced to login").toBe(false);
      await w.assertClean();
      // Something must actually be on screen, not a blank shell.
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }
});

test.describe("admin pages render cleanly", () => {
  for (const { path, name } of ADMIN_PAGES) {
    test(`${name} (${path})`, async ({ page }) => {
      const w = await visit(page, path);

      // Decide admin-ness from the session token, not from text on the page.
      // Matching words like "forbidden" in the DOM wrongly skipped /admin/errors,
      // whose whole job is to display error messages containing those words.
      const isAdmin = await page.evaluate(() => {
        const token = window.localStorage.getItem("token");
        if (!token) return false;
        try {
          return !!JSON.parse(atob(token.split(".")[1])).isAdmin;
        } catch {
          return false;
        }
      });
      test.skip(!isAdmin, "saved session is not a platform admin");

      expect(await isLoggedOut(page), "bounced to login").toBe(false);
      await w.assertClean();
    });
  }
});

test.describe("public pages render cleanly", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} (${path})`, async ({ page }) => {
      const w = await visit(page, path);
      await w.assertClean();
    });
  }
});
