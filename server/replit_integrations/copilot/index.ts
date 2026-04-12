import type { Express, Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Bid Copilot, a friendly AI assistant that helps users create professional tender documents through natural conversation.

Your goal is to gather the following information through conversation (not in a rigid order):
1. What service or product they need to procure
2. Budget range or expectations
3. Timeline and duration
4. Key deliverables and requirements
5. Submission deadline (CRITICAL - always ask for this before finishing)

Guidelines:
- Start by warmly greeting the user and asking what they need help procuring today
- Be conversational and natural - don't feel like a form
- Proactively suggest realistic budgets and timelines based on the service type
- Ask follow-up questions to clarify requirements
- Keep responses concise but helpful
- Offer clickable suggestion buttons for common responses
- When you have enough info to create a tender, summarize and ask for confirmation
- The serviceDescription field MUST be at least 50 words. Write a thorough, detailed description covering scope, context, goals, and requirements — never a one-liner

IMPORTANT: Always respond in valid JSON format with this structure:
{
  "message": "Your conversational message to the user",
  "suggestions": ["Quick reply 1", "Quick reply 2", "Quick reply 3"],
  "tenderData": {
    // Any tender fields you've extracted or suggested
    // "title": "string",
    // "serviceDescription": "string (MINIMUM 50 words - must be detailed and comprehensive)",
    // "projectType": "ongoing|one-time|project-based",
    // "budget": { "min": number, "max": number } or number,
    // "timeline": "string",
    // "deliverables": ["item1", "item2"],
    // "submissionDeadline": "string"
  },
  "readyToLaunch": false // Set to true only when user confirms they're ready to launch
}

Keep suggestions short (2-5 words) and actionable.`;

function buildContext(companyData: any, tenderDraft: any) {
  let context = "";
  
  if (companyData?.name) {
    context += `\nUser's Company: ${companyData.name}`;
    if (companyData.category) context += ` (${companyData.category})`;
    if (companyData.city) context += ` in ${companyData.city}`;
  }
  
  if (Object.keys(tenderDraft || {}).length > 0) {
    context += `\n\nTender draft so far:\n${JSON.stringify(tenderDraft, null, 2)}`;
    
    const missing: string[] = [];
    if (!tenderDraft.title) missing.push("title");
    if (!tenderDraft.serviceDescription) missing.push("service description");
    if (!tenderDraft.budget) missing.push("budget");
    if (!tenderDraft.timeline) missing.push("timeline");
    if (!tenderDraft.submissionDeadline) missing.push("submission deadline (CRITICAL)");
    
    if (missing.length > 0) {
      context += `\n\nStill need: ${missing.join(", ")}`;
    } else {
      context += `\n\nAll key fields collected! Ask user to review and confirm to launch.`;
    }
  }
  
  return context;
}

export function registerCopilotRoutes(app: Express): void {
  app.post("/api/copilot/chat", async (req: Request, res: Response) => {
    try {
      const { message, companyData, chatHistory, tenderDraft } = req.body;
      
      const context = buildContext(companyData, tenderDraft);
      
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT + context },
        ...(chatHistory || []).map((msg: any) => ({
          role: msg.role as "user" | "assistant",
          content: typeof msg.content === "object" ? JSON.stringify(msg.content) : msg.content,
        })),
      ];
      
      if (message) {
        messages.push({ role: "user", content: message });
      }
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      const stream = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
        stream: true,
        max_completion_tokens: 1024,
        response_format: { type: "json_object" },
      });
      
      let fullResponse = "";
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      
      try {
        const parsed = JSON.parse(fullResponse);
        res.write(`data: ${JSON.stringify({ done: true, parsed })}\n\n`);
      } catch {
        res.write(`data: ${JSON.stringify({ done: true, raw: fullResponse })}\n\n`);
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
