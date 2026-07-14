import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";
import { createApp } from "./app";

/**
 * The serverless handler, bundled at build time into dist/server.js.
 *
 * It has to be bundled rather than imported file-by-file: Vercel compiles the
 * entry in api/ to JavaScript but leaves the rest of the repo as TypeScript, so
 * a runtime `import "../server/app"` resolves to a file that does not exist in
 * the deployed function — "Cannot find module '/var/task/server/app'". Bundling
 * with esbuild inlines the whole server, resolves the @shared/* path alias, and
 * leaves node_modules external (they are installed on the host).
 *
 * The app is built once per function instance and reused by later requests that
 * land on the same warm instance, so only the first pays for it. There is no
 * listen(): the runtime hands each request straight to Express.
 */
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      // Don't cache a failed boot: let the next request retry rather than reuse
      // a rejected promise forever.
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const app = await getApp();
    return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
      req,
      res,
    );
  } catch (err) {
    console.error("[boot] server failed to start:", err);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Server failed to start",
          // Without this the platform reports only FUNCTION_INVOCATION_FAILED,
          // for every route at once, with no clue which of a dozen things broke.
          // Only configuration faults reach here, never user data.
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
