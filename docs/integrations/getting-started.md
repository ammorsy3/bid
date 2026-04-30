# Getting started

Build an integration with BidCore in under 15 minutes.

## What you'll have at the end

A working pipeline where a user sends a message to your tool of choice (n8n, Make.com, a custom chatbot, Claude Desktop, Cursor) and, after a short back-and-forth with the Copilot agent, receives a real tender URL — without ever opening the BidCore app.

## 1. Create an account and verify your company

1. Sign up at [bidcore.app/signup](https://bidcore.app/signup).
2. Complete company onboarding (legal name, CR, VAT).
3. Upload verification documents. You can't publish tenders until your company is `verified`, and the same gate applies to tenders created via the API.

## 2. Create an API key

1. Log in as a company admin and go to **Settings → Integrations & API**.
2. Click **Create API key**.
3. Name it after the tool that will use it (e.g. `n8n procurement flow`).
4. Select both scopes: `copilot:chat` and `tender:create`.
5. **Copy the raw key on the screen that appears.** You won't see it again.

See [Authentication](/docs/authentication) for details on scopes and rotation.

## 3. Create an integration

Still on **Settings → Integrations & API**:

1. Click **Create integration**.
2. Pick the channel: **Webhook** (for n8n / Make / custom chatbots) or **MCP** (for Claude Desktop / Cursor).
3. Give it a name and, optionally, a persona override (e.g. "Speak formally, always in Arabic").
4. Copy the endpoint URL.

## 4. Call the agent

### Webhook

```bash
curl -X POST https://<your-host>/integrations/webhook/<integrationId> \
  -H "X-Api-Key: bidc_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "user-123-thread-456",
    "message": "We need a 3-month HR consulting engagement, budget 100k SAR"
  }'
```

You'll get back the agent's reply plus a `ready` flag. Keep sending messages on the same `conversationId` until `ready: true`, then either let autoLaunch fire (if enabled) or call the launch endpoint explicitly.

Full details: [Webhook API](/docs/webhook).

### MCP

For Claude Desktop / Cursor, see the connection snippets in [MCP Server](/docs/mcp).

## 5. Track what your integration does

Back in **Settings → Integrations & API**, expand **Recent activity** on any integration to see every message and launch event with status, latency, and a preview of what was sent and received.

## Next

- **[Authentication](/docs/authentication)** — scopes, rotation, key storage.
- **[Webhook API](/docs/webhook)** — endpoint reference with n8n and Make recipes.
- **[MCP Server](/docs/mcp)** — tool schemas, Claude Desktop + Cursor config.
- **[Rate limits & errors](/docs/rate-limits)** — the numbers you'll hit if you're not careful.
