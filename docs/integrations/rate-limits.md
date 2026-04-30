# Rate limits & errors

## Limits

| Resource                          | Limit                      | What happens on hit                          |
| --------------------------------- | -------------------------- | -------------------------------------------- |
| Requests per API key              | 30 per minute              | `429` with `Retry-After` header (seconds)    |
| Message body size                 | 8 KB                       | `413` before we call OpenAI                  |
| Idempotency cache                 | 24 hours                   | Duplicate calls replay the original response |

Limits are per-instance and in-memory for pre-seed. If you're a design partner and need higher limits, let us know and we can tune per-key.

## Error codes

All error responses carry a JSON body with at least `{ "message": "..." }` and, where applicable, a machine-readable `validationErrors` array.

| Status | Meaning                                                            |
| ------ | ------------------------------------------------------------------ |
| `400`  | Required field missing or malformed                                |
| `401`  | Missing, malformed, or revoked API key                             |
| `403`  | Integration disabled, company not verified, or scope not granted   |
| `404`  | Unknown integration / session / conversation                       |
| `409`  | Tender draft is not yet ready to launch (see `validationErrors`)   |
| `413`  | Request body exceeds size cap                                      |
| `429`  | Rate limit tripped. Wait `Retry-After` seconds and try again.      |
| `5xx`  | Something broke on our side. Retries are safe — use idempotency    |

## Idempotency

For any message or launch call that you might retry (network timeouts, n8n retry nodes), pass a stable `idempotencyKey` in the body. The first call's response is cached for 24 hours; subsequent calls with the same key return the cached response (with `X-Idempotent-Replay: true` header) instead of re-processing.

```json
{
  "conversationId": "user-123-thread-456",
  "message": "...",
  "idempotencyKey": "msg-42-retry"
}
```

## Observability

Every external call is logged to the integration's activity feed with status, latency, error code, and a preview of the request and response. Check **Settings → Integrations & API → Recent activity** when something looks off.
