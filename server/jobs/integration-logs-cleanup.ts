// Periodic cleanup of integration_logs older than the retention window.
// Keeps the table from growing unbounded and matches what the Privacy
// policy promises customers about audit log retention.

import { db } from "../db";
import { integrationLogs } from "@shared/schema";
import { lt } from "drizzle-orm";

const RETENTION_DAYS = 30;
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000; // once per day

async function runOnce(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    const deleted = await db
      .delete(integrationLogs)
      .where(lt(integrationLogs.createdAt, cutoff))
      .returning({ id: integrationLogs.id });
    if (deleted.length > 0) {
      console.log(
        `[integration-logs-cleanup] deleted ${deleted.length} rows older than ${cutoff.toISOString()}`,
      );
    }
  } catch (err) {
    console.error("[integration-logs-cleanup] failed:", err);
  }
}

/** Register the cleanup loop. Call once at server boot. */
export function startIntegrationLogsCleanup(): void {
  // First sweep ~1 minute after boot so we don't compete with startup work,
  // then once a day.
  setTimeout(() => {
    runOnce();
    setInterval(runOnce, RUN_INTERVAL_MS);
  }, 60_000).unref?.();
}
