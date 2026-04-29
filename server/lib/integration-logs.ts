// Small fire-and-forget logger for external-integration traffic (webhook, MCP,
// public REST API). Meant for post-hoc debugging of design-partner setups —
// "what did their bot send, what did we reply with, was it fast, did it fail."

import { db } from "../db";
import { integrationLogs } from "@shared/schema";

export type IntegrationLogAction =
  | "message"
  | "launch"
  | "error"
  | "api_key.created"
  | "api_key.revoked";
export type IntegrationLogStatus = "ok" | "4xx" | "5xx" | "rate_limited" | "idempotent_replay";

export interface IntegrationLogEvent {
  companyId: string;
  integrationId?: string | null;
  apiKeyId?: string | null;
  sessionId?: string | null;
  action: IntegrationLogAction;
  status: IntegrationLogStatus;
  errorCode?: string | null;
  requestBytes?: number;
  responseBytes?: number;
  latencyMs?: number;
  requestPreview?: string;
  responsePreview?: string;
  /**
   * For lifecycle events (api_key.created, api_key.revoked) — the user who
   * performed the action. Stored in `request_preview` so we don't need a
   * schema migration for this rare case; queries can filter by action and
   * read the preview to find the actor.
   */
  actorUserId?: string;
}

const PREVIEW_MAX = 500;

function truncate(s: string | undefined | null, max: number = PREVIEW_MAX): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

/** Fire-and-forget. Never throws — a failed log must not break the request. */
export function logIntegrationEvent(event: IntegrationLogEvent): void {
  // For lifecycle events, encode the actor in requestPreview so a single
  // schema serves both traffic logs and admin events.
  const requestPreview = event.actorUserId
    ? truncate(`actor=${event.actorUserId}${event.requestPreview ? ` ${event.requestPreview}` : ""}`)
    : truncate(event.requestPreview);

  db.insert(integrationLogs)
    .values({
      companyId: event.companyId,
      integrationId: event.integrationId ?? null,
      apiKeyId: event.apiKeyId ?? null,
      sessionId: event.sessionId ?? null,
      action: event.action,
      status: event.status,
      errorCode: event.errorCode ?? null,
      requestBytes: event.requestBytes,
      responseBytes: event.responseBytes,
      latencyMs: event.latencyMs,
      requestPreview,
      responsePreview: truncate(event.responsePreview),
    })
    .catch((err) => {
      console.error("[integration-logs] write failed:", err);
    });
}
