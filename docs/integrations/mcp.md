# MCP integration

We expose the Copilot as a **Model Context Protocol** server so Claude Desktop, Cursor, and any other MCP-aware LLM client can use it as a tool — draft a tender conversationally, then publish it.

## Endpoint

- URL: `https://<your-host>/mcp`
- Transport: **HTTP JSON-RPC 2.0** (no SSE). Single POST = single RPC call.
- Auth: `X-Api-Key` or `Authorization: ApiKey` header on every request.

## Tools exposed

| Tool                       | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `copilot_create_session`   | Start a new conversation. Returns `sessionId`.                   |
| `copilot_send_message`     | Send a user message, get the agent's reply + current draft.      |
| `copilot_launch_tender`    | Publish the tender from the session's current draft.             |
| `copilot_get_session`      | Fetch the full message history and draft state (for debugging).  |

> Tool names use underscores (not dots) so they pass OpenAI's function-calling
> name regex. If you wrap the MCP server in an agent framework (n8n's AI Agent,
> LangChain, etc.) that forwards tools to OpenAI, you need this form.

## Claude Desktop

Claude Desktop only speaks stdio MCP. Use the `mcp-remote` shim to bridge.

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bidcore-copilot": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://<your-host>/mcp",
        "--header",
        "X-Api-Key:bidc_live_<your-key>"
      ]
    }
  }
}
```

Restart Claude Desktop. You should see `bidcore-copilot` in the tool list.

## Cursor

Cursor supports remote MCP directly. Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bidcore-copilot": {
      "url": "https://<your-host>/mcp",
      "headers": {
        "X-Api-Key": "bidc_live_<your-key>"
      }
    }
  }
}
```

## Example tool-call sequence

1. `copilot_create_session({ name: "ACME RFP" })` → `{ sessionId }`
2. `copilot_send_message({ sessionId, message: "We need a 3-month IT migration" })` → `{ reply, tenderDraft, readyToLaunch, ... }`
3. Continue sending messages until `readyToLaunch === true`.
4. `copilot_launch_tender({ sessionId })` → `{ tenderId, tenderUrl }`

## Errors

Tool calls return JSON-RPC errors with standard codes:

- `-32602` — invalid params (missing scope, session not found, draft not ready, etc.)
- `-32603` — internal error
- `-32601` — unknown tool
- HTTP `429` — rate limited (`Retry-After` header present)

## Limits

Same as the webhook: 30 requests/min per key, 8 KB max message body.
