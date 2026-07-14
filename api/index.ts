import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";

/**
 * Vercel serverless entry point.
 *
 * The app is imported lazily, inside the handler, rather than at module scope.
 * Several modules throw on import when a required env var is missing (db.ts and
 * objectStorage.ts both do, deliberately). A throw at module scope kills the
 * function before any of our code runs, and the platform can then only report a
 * generic FUNCTION_INVOCATION_FAILED — no message, no stack, nothing to act on,
 * for every route at once. Importing inside the handler lets us catch that, log
 * it, and answer with the actual reason.
 *
 * The app is still built once per function instance and reused by later requests
 * that land on the same warm instance; only the first request pays for it.
 *
 * Static assets are served by Vercel's CDN, not this function (see vercel.json).
 */
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = import("../server/app")
      .then((m) => m.createApp())
      .catch((err) => {
        // Don't cache a failed boot: the next request should retry rather than
        // reuse a rejected promise forever.
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
          // Surfacing the message is the entire point: without it the platform
          // reports only FUNCTION_INVOCATION_FAILED. These are configuration
          // faults ("X must be set", "cannot find module"), never user data.
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
