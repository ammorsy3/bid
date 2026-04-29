import OpenAI from "openai";
import { SYSTEM_PROMPT, buildContext } from "./prompt";

// Default to gpt-4.1; override via COPILOT_OPENAI_MODEL so we don't redeploy
// to switch models. Per-tenant override flows through CopilotTurnInput.
const DEFAULT_MODEL = process.env.COPILOT_OPENAI_MODEL || "gpt-4.1";
const sharedOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function clientFor(apiKey?: string): OpenAI {
  if (apiKey && apiKey.trim()) return new OpenAI({ apiKey: apiKey.trim() });
  return sharedOpenAI;
}

const MIN_DESCRIPTION_WORDS = 50;
const MIN_DELIVERABLES = 2;

function wordCount(s: unknown): number {
  if (typeof s !== "string") return 0;
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// Extract the prose value of the top-level "message" key from an in-progress JSON
// buffer, decoding JSON escapes on the fly. Pauses at any incomplete escape so we
// never emit half a unicode codepoint.
function extractMessageProse(buffer: string): { text: string; closed: boolean } {
  const keyMatch = buffer.match(/"message"\s*:\s*"/);
  if (!keyMatch || keyMatch.index === undefined) return { text: "", closed: false };
  let i = keyMatch.index + keyMatch[0].length;
  let out = "";
  while (i < buffer.length) {
    const c = buffer[i];
    if (c === "\\") {
      if (i + 1 >= buffer.length) break;
      const esc = buffer[i + 1];
      if (esc === "u") {
        if (i + 5 >= buffer.length) break;
        out += String.fromCharCode(parseInt(buffer.slice(i + 2, i + 6), 16));
        i += 6;
      } else {
        const map: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", '"': '"', "\\": "\\", "/": "/" };
        out += map[esc] ?? esc;
        i += 2;
      }
    } else if (c === '"') {
      return { text: out, closed: true };
    } else {
      out += c;
      i++;
    }
  }
  return { text: out, closed: false };
}

// Merge so readiness checks see the full accumulated draft, not just the fields
// the LLM sent this turn. Mirrors the client's mergeDraft: null deletes, undefined
// leaves alone.
export function mergeForValidation(prev: unknown, patch: unknown): Record<string, any> {
  const next: Record<string, any> = { ...((prev as Record<string, any>) || {}) };
  if (patch && typeof patch === "object") {
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      if (v === null) delete next[k];
      else if (v !== undefined) next[k] = v;
    }
  }
  return next;
}

// Gate readyToLaunch on minimum content quality. Returns the list of failures
// so callers can show the user what's missing.
export function readinessFailures(draft: any): string[] {
  const fails: string[] = [];
  if (!draft?.title || String(draft.title).trim().length < 3) fails.push("title");
  const wc = wordCount(draft?.serviceDescription);
  if (wc < MIN_DESCRIPTION_WORDS) fails.push(`serviceDescription (${wc}/${MIN_DESCRIPTION_WORDS} words)`);
  if (!draft?.submissionDeadline) fails.push("submissionDeadline");
  if (!draft?.budget) fails.push("budget");
  if (!draft?.submissionType) fails.push("submissionType");
  if (!draft?.inquiryType) fails.push("inquiryType");
  if (!Array.isArray(draft?.deliverables) || draft.deliverables.length < MIN_DELIVERABLES) {
    fails.push(`deliverables (≥${MIN_DELIVERABLES})`);
  }
  const weights = draft?.evaluationCriteria?.weights;
  if (Array.isArray(weights) && weights.length > 0) {
    const sum = weights.reduce((a: number, w: any) => a + (Number(w?.weight) || 0), 0);
    if (Math.abs(sum - 100) > 0.5) fails.push(`evaluationCriteria weights sum ${sum}≠100`);
  }
  return fails;
}

export interface CopilotChatHistoryEntry {
  role: "user" | "assistant";
  content: string | Record<string, unknown>;
}

export interface CopilotTurnInput {
  message?: string;
  companyData?: any;
  chatHistory?: CopilotChatHistoryEntry[];
  tenderDraft?: any;
  language?: "en" | "ar";
  /**
   * Optional per-integration persona / tone override. Appended to the system
   * context so the base SYSTEM_PROMPT stays the source of truth for structure
   * and only voice/content can be tweaked per tenant.
   */
  persona?: string;
  /**
   * Optional per-tenant OpenAI API key. When set, overrides the shared
   * OPENAI_API_KEY for this turn so a tenant can bring their own billing.
   */
  apiKey?: string;
  /**
   * Optional model override. Defaults to COPILOT_OPENAI_MODEL env or gpt-4.1.
   */
  model?: string;
}

export interface CopilotTurnResult {
  message: string;
  suggestions: string[];
  tenderData: Record<string, unknown>;
  readyToLaunch: boolean;
  validation?: { failures: string[] };
  /** The tenderDraft after applying this turn's patch. */
  mergedDraft: Record<string, any>;
  /** Raw JSON string as returned by the LLM. */
  raw: string;
  /**
   * Full parsed JSON object, with readyToLaunch possibly downgraded and
   * validation attached. The SSE route forwards this verbatim so existing
   * clients see the same shape as before.
   */
  parsed: Record<string, any>;
}

export class CopilotParseError extends Error {
  public readonly raw: string;
  constructor(raw: string) {
    super("Copilot returned unparseable JSON");
    this.name = "CopilotParseError";
    this.raw = raw;
  }
}

function buildMessages(input: CopilotTurnInput): OpenAI.Chat.ChatCompletionMessageParam[] {
  const lang = input.language === "ar" ? "ar" : "en";
  let context = buildContext(input.companyData, input.tenderDraft, lang);
  if (input.persona && input.persona.trim()) {
    context += `\n\n# Persona override\n${input.persona.trim()}`;
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT + context },
    ...(input.chatHistory || []).map((msg) => ({
      role: msg.role,
      content: typeof msg.content === "object" ? JSON.stringify(msg.content) : msg.content,
    })),
  ];

  if (input.message) {
    messages.push({ role: "user", content: input.message });
  }

  return messages;
}

function finalizeResult(raw: string, tenderDraft: unknown): CopilotTurnResult {
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CopilotParseError(raw);
  }

  const tenderData = (parsed?.tenderData as Record<string, unknown> | undefined) ?? {};
  const merged = mergeForValidation(tenderDraft, tenderData);

  if (parsed?.readyToLaunch) {
    const fails = readinessFailures(merged);
    if (fails.length > 0) {
      parsed.readyToLaunch = false;
      parsed.validation = { failures: fails };
    }
  }

  return {
    message: typeof parsed?.message === "string" ? parsed.message : "",
    suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions : [],
    tenderData,
    readyToLaunch: Boolean(parsed?.readyToLaunch),
    validation: parsed?.validation,
    mergedDraft: merged,
    raw,
    parsed,
  };
}

/**
 * Run one Copilot conversation turn end-to-end, non-streaming.
 * Used by the public REST API, webhook adapter, and MCP server.
 */
export async function runCopilotTurn(input: CopilotTurnInput): Promise<CopilotTurnResult> {
  const messages = buildMessages(input);

  const completion = await clientFor(input.apiKey).chat.completions.create({
    model: input.model || DEFAULT_MODEL,
    messages,
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  return finalizeResult(raw, input.tenderDraft);
}

export type CopilotStreamEvent =
  | { type: "delta"; delta: string }
  | { type: "done"; result: CopilotTurnResult }
  | { type: "parse_error"; raw: string };

/**
 * Run one Copilot turn and yield incremental events: text deltas for the
 * `message` prose, then a final `done` event with the fully-parsed result.
 * If the LLM returns invalid JSON, yields `parse_error` with the raw string.
 * Used by the in-app SSE route.
 */
export async function* runCopilotTurnStream(
  input: CopilotTurnInput,
): AsyncGenerator<CopilotStreamEvent, void, undefined> {
  const messages = buildMessages(input);

  const stream = await clientFor(input.apiKey).chat.completions.create({
    model: input.model || DEFAULT_MODEL,
    messages,
    stream: true,
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
  });

  let fullResponse = "";
  let emittedLength = 0;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (!content) continue;
    fullResponse += content;
    const { text } = extractMessageProse(fullResponse);
    if (text.length > emittedLength) {
      const delta = text.slice(emittedLength);
      emittedLength = text.length;
      yield { type: "delta", delta };
    }
  }

  try {
    const result = finalizeResult(fullResponse, input.tenderDraft);
    yield { type: "done", result };
  } catch (err) {
    if (err instanceof CopilotParseError) {
      yield { type: "parse_error", raw: err.raw };
    } else {
      throw err;
    }
  }
}
