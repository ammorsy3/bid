import type { Express, Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface CopilotStep {
  id: number;
  name: string;
  key: string;
  completed: boolean;
}

const COPILOT_STEPS: CopilotStep[] = [
  { id: 1, name: "Company", key: "company", completed: false },
  { id: 2, name: "Service", key: "service", completed: false },
  { id: 3, name: "Details", key: "details", completed: false },
  { id: 4, name: "Prefs", key: "preferences", completed: false },
  { id: 5, name: "Review", key: "review", completed: false },
];

const SYSTEM_PROMPT = `You are Bid Copilot, an AI assistant that helps users create professional tender documents. You guide users through a 5-step process:

1. **Company Context** - Verify the user's company information
2. **Service Needed** - Understand what service/product they need to procure
3. **Requirements** - Gather detailed requirements (budget, timeline, deliverables, quality standards)
4. **Preferences** - Collect vendor preferences, certifications, and the submission deadline
5. **Review** - Summarize and finalize the tender

Guidelines:
- Be proactive and suggest concrete requirements based on the service type
- For budgets, suggest reasonable ranges based on industry standards
- For timelines, suggest realistic durations based on the project scope
- Always ask for the submission deadline - this is critical and cannot be guessed
- Structure your responses to be conversational but efficient
- When you have enough information for a step, indicate you're ready to move to the next step
- Format suggestions clearly so users can accept or modify them

Current step context will be provided. Focus on that step's requirements while maintaining context from previous steps.

IMPORTANT: Always respond in valid JSON format with this structure:
{
  "message": "Your conversational message to the user",
  "suggestions": ["Optional array of suggestions user can click to accept"],
  "tenderData": {
    // Any tender fields you've extracted or suggested, keyed by field name
    // e.g., "title": "Office Cleaning Services", "budget": { "min": 50000, "max": 100000 }
  },
  "readyForNextStep": false, // Set to true when current step is complete
  "currentStepProgress": 0 // Percentage 0-100 of current step completion
}`;

function buildStepContext(step: number, companyData: any, chatHistory: any[], tenderDraft: any) {
  const stepInfo = COPILOT_STEPS[step - 1];
  
  let stepContext = `\nCurrent Step: ${step}/5 - ${stepInfo.name}\n`;
  
  switch (step) {
    case 1:
      stepContext += `\nCompany data from database:
- Company Name: ${companyData?.name || "Not set"}
- Description: ${companyData?.bio || "Not set"}
- Category: ${companyData?.category || "Not set"}
- City: ${companyData?.city || "Not set"}
- Tags: ${companyData?.tags?.join(", ") || "None"}

Your task: Confirm this information is correct and ask if the user wants to make any changes. Be concise.`;
      break;
    
    case 2:
      stepContext += `\nYour task: Ask the user what service or product they want to procure. Let them describe it naturally. Once they explain, categorize it and prepare to gather requirements.`;
      break;
    
    case 3:
      stepContext += `\nBased on the service type: ${tenderDraft?.serviceDescription || "Unknown"}

Your task: Proactively suggest and gather:
- Project type (ongoing service, one-time, project-based)
- Budget range (suggest based on service type)
- Timeline/duration
- Quantity and scope
- Key deliverables
- Quality standards or certifications required

Be assertive with suggestions based on industry standards.`;
      break;
    
    case 4:
      stepContext += `\nYour task: Gather final preferences:
- Any specific vendor requirements
- Required certifications
- **CRITICAL: Ask for the submission deadline** (you cannot guess this)
- Any other procurement preferences`;
      break;
    
    case 5:
      stepContext += `\nTender draft so far:
${JSON.stringify(tenderDraft, null, 2)}

Your task: Present a summary of the tender and ask for final confirmation. Highlight any missing critical information.`;
      break;
  }
  
  return stepContext;
}

export function registerCopilotRoutes(app: Express): void {
  app.post("/api/copilot/chat", async (req: Request, res: Response) => {
    try {
      const { message, step, companyData, chatHistory, tenderDraft } = req.body;
      
      const stepContext = buildStepContext(step || 1, companyData, chatHistory || [], tenderDraft || {});
      
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT + stepContext },
        ...(chatHistory || []).map((msg: any) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
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
        max_completion_tokens: 2048,
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
  
  app.get("/api/copilot/steps", (req: Request, res: Response) => {
    res.json(COPILOT_STEPS);
  });
}
