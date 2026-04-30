# Webhook integration

A single HTTP endpoint that n8n, Make.com, custom chatbots — anything that can POST JSON — can use to drive a full Copilot conversation and end up with a real tender.

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/integrations/webhook/{id}` | Send a message, get a Copilot reply |
| POST | `/integrations/webhook/{id}/launch` | Explicitly launch the tender for a conversation |

## Endpoint

`POST https://<your-host>/integrations/webhook/<integrationId>`

The `integrationId` comes from **Settings → Integrations** after you create a `webhook` integration.

## Headers

- `Content-Type: application/json`
- `X-Api-Key: bidc_live_<your-key>`

## Request body

```json
{
  "conversationId": "slack-thread-1732-user-U0123",
  "message": "We need a new HR consulting firm.",
  "idempotencyKey": "optional-retry-token"
}
```

- `conversationId` — any stable string you choose per end-user or thread. It's how we remember the conversation across calls. Same ID = continue the same chat.
- `message` — the user's message, ≤ 8 KB.
- `idempotencyKey` — optional. If your tool retries on timeout, pass the same key and we'll return the cached response instead of re-processing.

## Response

```json
{
  "reply": "Got it — what budget range are you working with in SAR?",
  "suggestions": ["Around 100–200k SAR", "Up to 500k", "Not sure yet"],
  "ready": false,
  "tenderUrl": null,
  "validationErrors": null
}
```

When the agent decides the draft is complete:

- With **autoLaunch** enabled on the integration: `ready: true` **and** `tenderUrl` will be a real URL.
- With **autoLaunch** disabled: `ready: true` and `tenderUrl: null`. Call the launch endpoint below to publish.

## Launch endpoint (when autoLaunch is off)

`POST https://<your-host>/integrations/webhook/<integrationId>/launch`

```json
{
  "conversationId": "slack-thread-1732-user-U0123",
  "idempotencyKey": "optional-retry-token"
}
```

Returns `{ tenderId, tenderUrl, invitationToken }` or a validation error if the draft isn't ready.

## n8n recipe

1. **HTTP Request** node
   - Method: `POST`
   - URL: `https://<your-host>/integrations/webhook/<integrationId>`
   - Authentication: **Header Auth** with name `X-Api-Key` and value `bidc_live_…`
   - Body: JSON with `conversationId` + `message`.
2. Downstream: use `{{$json.reply}}` to send the agent's reply back to your user surface (Slack, email, SMS).
3. On `{{$json.ready}} === true`: post the `tenderUrl` or trigger launch.

## Make.com recipe

1. **HTTP module** (POST)
   - URL: same as above
   - Headers: `X-Api-Key: bidc_live_…`, `Content-Type: application/json`
   - Body type: Raw JSON
2. **Router** on `ready`: one branch for `true` (send tender URL), one for `false` (continue the loop with the reply).

## Signing (optional)

If the env var `WEBHOOK_HMAC_SECRET_<companyId>` is set on our server, every response includes an `X-BidCore-Signature: sha256=<hex>` header computed over the raw response body. Use it to verify the response came from us (useful if your receiver is reachable from the open internet).

## Error codes

| Status | Meaning                                                 |
| ------ | ------------------------------------------------------- |
| `400`  | Missing / malformed field                               |
| `401`  | API key missing, revoked, or wrong                      |
| `403`  | Integration disabled, or company not verified           |
| `404`  | Unknown `integrationId`, or conversation doesn't exist  |
| `409`  | Draft isn't ready to launch                             |
| `413`  | Message body too large (> 8 KB)                         |
| `429`  | Rate limited — inspect `Retry-After` header             |
