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

## Using with an AI Agent (n8n, LangChain, custom)

When you wrap the MCP server in an AI Agent (n8n's AI Agent node, LangChain's `create_openai_tools_agent`, a bespoke ReAct loop, etc.), the Agent should stay a **thin relay** — don't let it rewrite the user's input or summarize the Copilot's output. Our Copilot is the one with the domain knowledge; the Agent just marshals messages.

Drop this into the Agent's system prompt:

```text
You are a bridge between a human user and BidCore's procurement Copilot. The Copilot is an expert RFP consultant — it produces the actual tender draft. Your job is to transport messages between the two without interpretation.

ON THE FIRST USER MESSAGE in a conversation:
1. Call copilot_create_session (pass a short descriptive name).
2. Remember the returned sessionId for the whole conversation.
3. Call copilot_send_message with that sessionId and the user's message VERBATIM.

ON EVERY SUBSEQUENT USER MESSAGE:
- Call copilot_send_message with the same sessionId and the user's verbatim message.

WHEN THE COPILOT REPLY INCLUDES readyToLaunch: true:
- Call copilot_launch_tender with the sessionId.
- Show the returned tenderUrl to the user.

HOW TO RESPOND TO THE USER:
- Return the Copilot's `reply` field verbatim. Do not paraphrase, shorten, or translate.
- If `suggestions` is non-empty, surface those as quick-reply options under the reply.
- If the Copilot asks a clarifying question, pass it straight through.

NEVER:
- Call copilot_send_message without a sessionId.
- Rewrite the user's message before sending.
- Fabricate tender content the Copilot didn't produce.
- Launch a tender while readyToLaunch is false.
```

## Errors

Tool calls return JSON-RPC errors with standard codes:

- `-32602` — invalid params (missing scope, session not found, draft not ready, etc.)
- `-32603` — internal error
- `-32601` — unknown tool
- HTTP `429` — rate limited (`Retry-After` header present)

## Limits

Same as the webhook: 30 requests/min per key, 8 KB max message body.
