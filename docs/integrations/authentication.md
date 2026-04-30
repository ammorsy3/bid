# Authentication

Every external integration (webhook, MCP, direct API) authenticates with an **API key** that your company's admin creates in **Settings → Integrations**.

## Creating a key

1. Log into your BidCore dashboard as a company admin.
2. Navigate to **Settings → Integrations**.
3. Click **Create API key**.
4. Give it a human-readable name (e.g. `n8n procurement flow`, `Claude Desktop`).
5. Select the scopes you want the key to carry. See below.
6. Click **Create**. Copy the raw key shown — **you will never see it again**. We only store a hash.

## Scopes

Scopes limit what a key can do. Grant the minimum needed.

| Scope           | What it allows                                      |
| --------------- | --------------------------------------------------- |
| `copilot:chat`  | Talk to the Copilot agent (messages, read sessions) |
| `tender:create` | Create real tenders from a completed session        |

A key without `tender:create` can chat and draft endlessly but cannot publish a tender. Useful for testing.

## Using a key

Send it on every request via one of:

- `X-Api-Key: bidc_live_<your-key>`
- `Authorization: ApiKey bidc_live_<your-key>`

## Rotating or revoking

There is no in-place rotation. To rotate:

1. Create a new key with the same scopes.
2. Update the integration (n8n, Make, Claude Desktop) to use the new key.
3. Verify traffic is flowing on the new key (check **Last used** in Settings).
4. Revoke the old key via the trash icon.

Revocation is **immediate** — the next request with that key returns `401`.

## Rate limits

- **30 requests per minute per API key** (default).
- **Max message body size:** 8 KB.
- Exceeding either returns `429` (with `Retry-After` seconds) or `413`.

If you need higher limits for a design partner, contact us — we can tune per-key.

## What the server sees

Requests authenticated with an API key are logged in your company's activity log with:

- `source = api_key | webhook | mcp`
- `apiKeyId`
- `integrationId` (when routed through a webhook/MCP integration)
- `sessionId` (when tied to a conversation)

You can spot anomalies by reviewing recent tender-creation events in your admin activity view.
