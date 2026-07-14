/**
 * File upload / view / download through the real UI.
 *
 * This is the layer the API tests cannot reach. The API suite proves the server
 * authorises correctly; these prove the client actually asks. Every failure in
 * the Supabase migration surfaced here first — a 403 on opening an attachment,
 * an upload button wired to a dead endpoint — and none of them were visible
 * from the server side alone.
 */
import { test, expect } from "@playwright/test";
import { visit, watch } from "./helpers";

/**
 * Removes a file this spec uploaded, plus its ACL row, so repeated runs do not
 * slowly fill the bucket. Deletes by the exact path it created — never a pattern.
 *
 * Talks to Supabase and Postgres directly rather than importing the server
 * modules, which would pull in the app's "@shared" path alias that Playwright
 * does not resolve.
 */
async function cleanupUpload(objectPath: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const { default: pg } = await import("pg");
  const { SUPABASE_ROOT_CA } = await import("../../server/supabase-ca");

  const key = objectPath.replace("/objects/", "");
  const bucket = process.env.SUPABASE_PRIVATE_BUCKET ?? "private-files";

  const storage = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).storage;
  await storage.from(bucket).remove([key]);

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { ca: SUPABASE_ROOT_CA },
  });
  await client.connect();
  await client.query("delete from object_acl where object_path = $1", [objectPath]);
  await client.end();
}

test.describe("serving files", () => {
  test("a public image (profile picture / logo) loads through the app", async ({
    page,
    request,
  }) => {
    // Public bucket objects are served without auth.
    const res = await request.get("/objects/profile-pictures/", {
      failOnStatusCode: false,
    });
    // The directory itself is not a file; what matters is the app answers rather
    // than 500ing. Real image assertion happens via the rendered page below.
    expect(res.status()).toBeLessThan(500);

    const w = await visit(page, "/dashboard");
    await w.assertClean();
  });

  test("images referenced by the page actually load (no broken avatars/logos)", async ({
    page,
  }) => {
    await visit(page, "/marketplace");

    const broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => img.complete && img.naturalWidth === 0 && img.src)
        .map((img) => img.src),
    );

    expect(broken, "images that failed to load").toEqual([]);
  });
});

test.describe("uploading", () => {
  test("the upload endpoint issues a signed URL to a signed-in user", async ({
    page,
  }) => {
    await visit(page, "/dashboard");

    const result = await page.evaluate(async () => {
      const token = window.localStorage.getItem("token");
      const res = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    });

    expect(result.status).toBe(200);
    expect(result.body?.uploadURL, "no uploadURL returned").toBeTruthy();
    // Must be a Supabase signed upload URL, not a leftover Google/Replit one.
    expect(result.body.uploadURL).toContain("supabase.co");
  });

  test("a file uploaded through the signed URL can be read back", async ({
    page,
  }) => {
    await visit(page, "/dashboard");

    const result = await page.evaluate(async () => {
      const token = window.localStorage.getItem("token");

      // 1. ask the app for an upload URL
      const urlRes = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileType: "application/pdf" }),
      });
      const { uploadURL } = await urlRes.json();

      // 2. PUT the bytes straight to storage, exactly as the app's uploader does
      const put = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: new Blob(["%PDF-1.4 e2e"], { type: "application/pdf" }),
      });

      // 3. claim it, which is what sets the ACL and returns the app path
      const metaRes = await fetch("/api/objects/metadata", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileURL: uploadURL }),
      });
      const meta = await metaRes.json();

      // 4. read it back through the app, as the owner
      const readBack = await fetch(meta.objectPath, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        putStatus: put.status,
        metaStatus: metaRes.status,
        objectPath: meta.objectPath,
        readStatus: readBack.status,
        readType: readBack.headers.get("content-type"),
      };
    });

    expect(result.putStatus, "upload to signed URL failed").toBeLessThan(300);
    expect(result.metaStatus, "claiming the upload failed").toBe(200);
    expect(result.objectPath).toMatch(/^\/objects\/uploads\//);
    expect(result.readStatus, "owner could not read back their own upload").toBe(200);

    // Don't leave a file in the bucket on every run.
    await cleanupUpload(result.objectPath);
  });
});

test.describe("viewing attachments", () => {
  test("opening a tender's attachment does not 403 (regression)", async ({
    page,
  }) => {
    const w = watch(page);
    await visit(page, "/dashboard");

    // Find a tender that has attachments, via the app's own API and session.
    const target = await page.evaluate(async () => {
      const token = window.localStorage.getItem("token");
      const res = await fetch("/api/tenders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const tenders = await res.json();
      for (const t of tenders) {
        const atts = t.attachments;
        if (Array.isArray(atts) && atts.length > 0 && atts[0]?.url) {
          return { tenderId: t.id, url: atts[0].url as string };
        }
      }
      return null;
    });

    test.skip(!target, "no tender with an attachment visible to this account");

    // Fetch it the way the UI does: authenticated, via the /objects route.
    const status = await page.evaluate(async (url: string) => {
      const token = window.localStorage.getItem("token");
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.status;
    }, target!.url);

    expect(
      status,
      `attachment ${target!.url} was not readable by the account that can see the tender`,
    ).toBe(200);

    await w.assertClean();
  });
});
