import type { Express, Request, Response, RequestHandler } from "express";
import { runCopilotTurnStream } from "./engine";

export {
  runCopilotTurn,
  runCopilotTurnStream,
  mergeForValidation,
  readinessFailures,
  CopilotParseError,
} from "./engine";
export type {
  CopilotTurnInput,
  CopilotTurnResult,
  CopilotChatHistoryEntry,
  CopilotStreamEvent,
} from "./engine";

export function registerCopilotRoutes(app: Express, authenticateToken: RequestHandler): void {
  app.post("/api/copilot/chat", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { message, companyData, chatHistory, tenderDraft, language } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const ev of runCopilotTurnStream({
        message,
        companyData,
        chatHistory,
        tenderDraft,
        language,
      })) {
        if (ev.type === "delta") {
          res.write(`data: ${JSON.stringify({ content: ev.delta })}\n\n`);
        } else if (ev.type === "done") {
          res.write(`data: ${JSON.stringify({ done: true, parsed: ev.result.parsed })}\n\n`);
        } else if (ev.type === "parse_error") {
          res.write(`data: ${JSON.stringify({ done: true, raw: ev.raw })}\n\n`);
        }
      }

      res.end();
    } catch (error) {
      console.error("Copilot chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to process message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });
}
