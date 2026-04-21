// HTTP MCP server exposing the Copilot as tools.
//
// Implements MCP (Model Context Protocol) over a single HTTP endpoint using
// JSON-RPC 2.0. Non-streaming — each POST is one RPC call and returns a single
// JSON response. Good enough for Claude Desktop (via mcp-remote), Cursor, and
// any other MCP-aware client or LLM agent.
//
// Auth: X-Api-Key header (or Authorization: ApiKey <key>). All tool calls are
// scoped to the key's company.

import type { Express, Request, Response } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { runCopilotTurn } from "../../replit_integrations/copilot/engine";
import {
  launchTenderFromDraft,
  CompanyNotVerifiedError,
  MarketplaceValidationError,
} from "../../lib/launch-tender";
import { authenticateApiKey } from "../../middleware/api-key";
import type { AuthRequest } from "../../middleware/auth-types";
import { takeToken } from "../../lib/rate-limit";

const MAX_MESSAGE_BYTES = 8 * 1024;
const RATE_LIMIT_CAPACITY = 30;
const RATE_LIMIT_PER_MINUTE = 30;

// ---- JSON-RPC 2.0 ----------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

const ERR = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const;

function rpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, result };
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown) {
  return {
    jsonrpc: "2.0" as const,
    id: id ?? null,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  };
}

// ---- Tool schemas ----------------------------------------------------------

const TOOLS = [
  {
    name: "copilot.create_session",
    description:
      "Start a new Copilot conversation. Returns a sessionId to pass to subsequent send_message / launch_tender calls.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Optional friendly label for the session." },
      },
    },
  },
  {
    name: "copilot.send_message",
    description:
      "Send a user message to the Copilot for a given session. Returns the agent's reply plus the current tender draft and a readiness flag.",
    inputSchema: {
      type: "object",
      required: ["sessionId", "message"],
      properties: {
        sessionId: { type: "string" },
        message: { type: "string" },
      },
    },
  },
  {
    name: "copilot.launch_tender",
    description:
      "Create the real tender from the current session draft. Fails if the draft isn't ready (missing fields) or the company isn't verified.",
    inputSchema: {
      type: "object",
      required: ["sessionId"],
      properties: {
        sessionId: { type: "string" },
      },
    },
  },
  {
    name: "copilot.get_session",
    description:
      "Return the current state of a session: all prior messages, the working tender draft, and whether it's ready to launch.",
    inputSchema: {
      type: "object",
      required: ["sessionId"],
      properties: {
        sessionId: { type: "string" },
      },
    },
  },
];

// ---- Tool implementations --------------------------------------------------

async function loadSession(sessionId: string, companyId: string) {
  const session = await storage.getAiChatSession(sessionId);
  if (!session || session.companyId !== companyId) return null;
  return session;
}

async function toolCreateSession(args: any, auth: AuthRequest["auth"]) {
  const session = await storage.createAiChatSession({
    userId: auth!.userId,
    companyId: auth!.activeCompanyId!,
    title: typeof args?.name === "string" && args.name.trim() ? args.name.trim() : "MCP Copilot session",
    tenderData: {},
  });
  return { sessionId: session.id };
}

async function toolSendMessage(args: any, auth: AuthRequest["auth"]) {
  if (typeof args?.sessionId !== "string" || !args.sessionId) {
    throw new McpError(ERR.INVALID_PARAMS, "`sessionId` is required");
  }
  if (typeof args?.message !== "string" || !args.message.trim()) {
    throw new McpError(ERR.INVALID_PARAMS, "`message` is required");
  }
  if (Buffer.byteLength(args.message, "utf8") > MAX_MESSAGE_BYTES) {
    throw new McpError(ERR.INVALID_PARAMS, `Message too large (max ${MAX_MESSAGE_BYTES} bytes)`);
  }
  if (!auth?.scopes?.includes("copilot:chat") && auth?.authMethod === "api_key") {
    throw new McpError(ERR.INVALID_PARAMS, "Missing required scope: copilot:chat");
  }

  const session = await loadSession(args.sessionId, auth!.activeCompanyId!);
  if (!session) throw new McpError(ERR.INVALID_PARAMS, "Session not found");

  const company = await storage.getCompany(auth!.activeCompanyId!);
  const companyData = company
    ? { name: company.name, category: (company as any).category, city: (company as any).city, bio: (company as any).bio }
    : undefined;

  const priorMessages = await storage.getAiChatMessages(session.id);
  const chatHistory = priorMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const result = await runCopilotTurn({
    message: args.message,
    companyData,
    chatHistory,
    tenderDraft: session.tenderData ?? {},
  });

  await storage.createAiChatMessage({
    sessionId: session.id,
    role: "user",
    content: args.message,
  });
  await storage.createAiChatMessage({
    sessionId: session.id,
    role: "assistant",
    content: result.message,
    suggestions: result.suggestions,
    tenderData: result.tenderData,
  });
  await storage.updateAiChatSession(session.id, { tenderData: result.mergedDraft });

  return {
    reply: result.message,
    suggestions: result.suggestions,
    tenderDraft: result.mergedDraft,
    readyToLaunch: result.readyToLaunch,
    ...(result.validation ? { validation: result.validation } : {}),
  };
}

async function toolLaunchTender(args: any, auth: AuthRequest["auth"]) {
  if (typeof args?.sessionId !== "string" || !args.sessionId) {
    throw new McpError(ERR.INVALID_PARAMS, "`sessionId` is required");
  }
  if (!auth?.scopes?.includes("tender:create") && auth?.authMethod === "api_key") {
    throw new McpError(ERR.INVALID_PARAMS, "Missing required scope: tender:create");
  }

  const session = await loadSession(args.sessionId, auth!.activeCompanyId!);
  if (!session) throw new McpError(ERR.INVALID_PARAMS, "Session not found");

  const draft = (session.tenderData ?? {}) as Record<string, any>;
  if (!draft || Object.keys(draft).length === 0) {
    throw new McpError(ERR.INVALID_PARAMS, "Session has no tender draft to launch");
  }

  const company = await storage.getCompany(auth!.activeCompanyId!);
  if (!company) throw new McpError(ERR.INTERNAL, "Company not found");

  try {
    const launchResult = await launchTenderFromDraft(draft, {
      company: { id: company.id, verificationStatus: company.verificationStatus },
      user: { id: auth!.userId },
      source: "mcp",
      apiKeyId: auth?.apiKeyId,
      sessionId: session.id,
    });
    await storage.updateAiChatSession(session.id, { tenderId: launchResult.tender.id });
    return {
      tenderId: launchResult.tender.id,
      tenderUrl: launchResult.tenderUrl,
      invitationToken: launchResult.invitationToken,
    };
  } catch (err) {
    if (err instanceof CompanyNotVerifiedError) {
      throw new McpError(ERR.INVALID_PARAMS, err.message);
    }
    if (err instanceof MarketplaceValidationError) {
      throw new McpError(ERR.INVALID_PARAMS, err.message);
    }
    if (err && typeof err === "object" && (err as any).name === "ZodError") {
      throw new McpError(ERR.INVALID_PARAMS, "Tender draft is not ready to launch", (err as any).errors);
    }
    throw err;
  }
}

async function toolGetSession(args: any, auth: AuthRequest["auth"]) {
  if (typeof args?.sessionId !== "string" || !args.sessionId) {
    throw new McpError(ERR.INVALID_PARAMS, "`sessionId` is required");
  }
  const session = await loadSession(args.sessionId, auth!.activeCompanyId!);
  if (!session) throw new McpError(ERR.INVALID_PARAMS, "Session not found");
  const messages = await storage.getAiChatMessages(session.id);
  return {
    sessionId: session.id,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
    tenderDraft: session.tenderData ?? {},
  };
}

// ---- Router ---------------------------------------------------------------

class McpError extends Error {
  constructor(public code: number, message: string, public data?: unknown) {
    super(message);
    this.name = "McpError";
  }
}

async function handleRpc(req: AuthRequest, rpc: JsonRpcRequest) {
  switch (rpc.method) {
    case "initialize":
      return rpcResult(rpc.id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "bidcore-copilot", version: "0.1.0" },
        capabilities: { tools: {} },
      });

    case "notifications/initialized":
      // Client notification; no response expected.
      return null;

    case "tools/list":
      return rpcResult(rpc.id, { tools: TOOLS });

    case "tools/call": {
      const name = rpc.params?.name;
      const args = rpc.params?.arguments ?? {};
      if (typeof name !== "string") {
        return rpcError(rpc.id, ERR.INVALID_PARAMS, "`name` is required");
      }
      try {
        let result: unknown;
        switch (name) {
          case "copilot.create_session":
            result = await toolCreateSession(args, req.auth);
            break;
          case "copilot.send_message":
            result = await toolSendMessage(args, req.auth);
            break;
          case "copilot.launch_tender":
            result = await toolLaunchTender(args, req.auth);
            break;
          case "copilot.get_session":
            result = await toolGetSession(args, req.auth);
            break;
          default:
            return rpcError(rpc.id, ERR.METHOD_NOT_FOUND, `Unknown tool: ${name}`);
        }
        // MCP convention: tool results are wrapped in { content: [{ type: "text", text: ... }] }
        return rpcResult(rpc.id, {
          content: [{ type: "text", text: JSON.stringify(result) }],
        });
      } catch (err) {
        if (err instanceof McpError) {
          return rpcError(rpc.id, err.code, err.message, err.data);
        }
        console.error("[mcp] tool error:", err);
        return rpcError(rpc.id, ERR.INTERNAL, "Tool execution failed");
      }
    }

    default:
      return rpcError(rpc.id, ERR.METHOD_NOT_FOUND, `Unknown method: ${rpc.method}`);
  }
}

export function registerMcpAdapter(app: Express): void {
  const r = Router();

  r.post("/", authenticateApiKey, async (req: AuthRequest, res: Response) => {
    // Rate limit the endpoint itself — each incoming RPC counts as one token.
    if (req.auth?.apiKeyId) {
      const result = takeToken(`apiKey:${req.auth.apiKeyId}`, {
        capacity: RATE_LIMIT_CAPACITY,
        refillPerMinute: RATE_LIMIT_PER_MINUTE,
      });
      if (!result.allowed) {
        res.setHeader("Retry-After", String(result.retryAfterSeconds));
        return res.status(429).json(
          rpcError(null, ERR.INTERNAL, "Rate limit exceeded", { retryAfterSeconds: result.retryAfterSeconds }),
        );
      }
    }

    const body = req.body;
    if (!body || typeof body !== "object" || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
      return res.status(400).json(rpcError(null, ERR.INVALID_REQUEST, "Invalid JSON-RPC request"));
    }

    try {
      const response = await handleRpc(req, body as JsonRpcRequest);
      if (response === null) {
        return res.status(204).end();
      }
      res.json(response);
    } catch (err) {
      console.error("[mcp] fatal error:", err);
      res.status(500).json(rpcError(body.id, ERR.INTERNAL, "Internal error"));
    }
  });

  app.use("/mcp", r);
}
