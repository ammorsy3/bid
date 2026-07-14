import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";
import { createApp } from "../server/app";

/**
 * Vercel serverless entry point.
 *
 * The app is built once per function instance and reused across requests that
 * land on the same warm instance — building it per request would reconnect to
 * Postgres every time. There is deliberately no listen() here: the runtime hands
 * each request straight to the Express app.
 *
 * Static assets (the built client) are served by Vercel's CDN, not this
 * function; see the routes in vercel.json.
 */
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      // Don't cache a failed boot — the next request should retry rather than
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
  const app = await getApp();
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res,
  );
}
