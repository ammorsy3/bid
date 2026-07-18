// OpenAI-backed helpers for tender creation: category inference + full-document
// translation. Previously lived inline in server/routes.ts; extracted so the new
// tender-launch helper (and any future external-channel adapter) can reuse them
// without pulling in the whole routes module.

import { VENDOR_CATEGORIES } from "@shared/schema";
import { BANNED_FILLER_PHRASES_LIST } from "@shared/rfp-writing";

export function getOpenAIConfig(): { url: string; key: string } | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return { url: "https://api.openai.com/v1/chat/completions", key: openaiKey };
  }
  return null;
}

// Translate an array of texts to the target language using OpenAI gpt-4o-mini.
// Returns the translated strings in the same order, or the originals on failure.
export async function translateTexts(
  texts: string[],
  targetLanguage: "en" | "ar",
): Promise<string[]> {
  const config = getOpenAIConfig();
  if (!config || texts.length === 0) return texts;

  const langName = targetLanguage === "ar" ? "Arabic" : "English";
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional procurement translator. You will receive a numbered list of texts. For each text, detect its language: if it is already in ${langName}, return it unchanged; otherwise translate it to ${langName}. Respond ONLY with the same numbered list preserving numbering and order. Do not add any commentary.`,
          },
          { role: "user", content: numbered },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error("Translation API error:", response.status, await response.text().catch(() => ""));
      return texts;
    }
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";

    const results: string[] = [...texts];
    const lines = raw.split("\n");
    let currentIdx = -1;
    let currentLines: string[] = [];

    const flush = () => {
      if (currentIdx >= 0 && currentIdx < results.length) {
        results[currentIdx] = currentLines.join("\n").trim();
      }
    };

    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.*)/);
      if (match) {
        flush();
        currentIdx = parseInt(match[1], 10) - 1;
        currentLines = [match[2]];
      } else if (currentIdx >= 0) {
        currentLines.push(line);
      }
    }
    flush();

    return results;
  } catch {
    return texts;
  }
}

export async function suggestTenderCategory(tender: {
  title?: string;
  description?: string;
  objective?: string;
  skills?: string[];
  deliverables?: any[];
}): Promise<string | null> {
  const config = getOpenAIConfig();
  if (!config) return null;

  const categoryList = VENDOR_CATEGORIES.join(", ");
  const context = [
    tender.title && `Title: ${tender.title}`,
    tender.description && `Description: ${tender.description}`,
    tender.objective && `Objective: ${tender.objective}`,
    tender.skills?.length && `Skills: ${tender.skills.join(", ")}`,
    tender.deliverables?.length &&
      `Deliverables: ${tender.deliverables.map((d: any) => (typeof d === "string" ? d : d.name)).filter(Boolean).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a procurement specialist. Given an RFP brief, pick the single best-matching category from this list:\n${categoryList}\n\nRespond with ONLY the exact category name from the list, nothing else.`,
          },
          { role: "user", content: context },
        ],
        temperature: 0.2,
        max_tokens: 30,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const suggested = data.choices?.[0]?.message?.content?.trim();
    return (VENDOR_CATEGORIES as readonly string[]).includes(suggested) ? suggested : null;
  } catch {
    return null;
  }
}

// Draft a project description from the title + deliverables list, used by the
// "Suggest with AI" option on the description field in both the Bid Recommended
// template's project-scope step and the custom form builder.
export async function suggestTenderDescription(input: {
  title?: string;
  deliverables: { name: string; description?: string; unit?: string; quantity?: number }[];
  startDate?: string;
  endDate?: string;
  milestones?: { name: string; description?: string; dueDate?: string }[];
  language?: "en" | "ar";
}): Promise<string | null> {
  const config = getOpenAIConfig();
  if (!config || input.deliverables.length === 0) return null;

  const langInstruction =
    input.language === "ar"
      ? "Respond in formal Modern Standard Arabic (الفصحى) only — plain, professional business Arabic. Do not use any regional dialect (e.g. Saudi/Gulf colloquialisms) and do not mix in English words."
      : "Respond in English.";
  const deliverablesList = input.deliverables
    .map((d, i) => {
      const qty = d.quantity && d.unit ? ` (${d.quantity} × ${d.unit})` : "";
      return `${i + 1}. ${d.name}${qty}${d.description ? ` — ${d.description}` : ""}`;
    })
    .join("\n");

  const fmtDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  };

  const start = fmtDate(input.startDate);
  const end = fmtDate(input.endDate);
  const timeline = start && end ? `Project timeline: ${start} to ${end}` : null;

  const namedMilestones = (input.milestones || []).filter((m) => m.name?.trim());
  const milestonesList = namedMilestones.length
    ? `Milestones:\n${namedMilestones
        .map((m, i) => {
          const due = fmtDate(m.dueDate);
          return `${i + 1}. ${m.name}${due ? ` (due ${due})` : ""}${m.description ? ` — ${m.description}` : ""}`;
        })
        .join("\n")}`
    : null;

  const context = [
    input.title && `Project title: ${input.title}`,
    `Deliverables:\n${deliverablesList}`,
    timeline,
    milestonesList,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are drafting the project description section of an RFP (request for proposal) that a buyer will send to bidding vendors. This is a specification, not marketing copy — its only job is to tell the vendor exactly what is expected so they can scope and price the work. It is read by a procurement professional, not a customer.

Write instructions directed AT the vendor about what they must deliver — not a pitch or overview of the project's subject matter. For example, for a "cybersecurity awareness campaign" deliverable, do not describe what a cybersecurity campaign is or why awareness matters — state what the vendor is required to produce, run, or deliver.

Rules:
- Plain, specific, action-oriented language. No persuasive or promotional tone.
- Reference the actual quantity/unit of each deliverable where given (e.g. "across 3 campaigns", "for all 5 branch locations") instead of ignoring the numbers.
- Do not contradict or restate each deliverable's own scope in detail — they're already itemized separately. Use this section for the overall requirements, context, and expectations that tie the deliverables together (timeline expectations, quality bar, constraints, coordination needs, etc.), not a re-list of the line items.
- If a project timeline or milestones are given, ground the description in them (e.g. overall duration, key checkpoints vendors must plan around) instead of speaking about timing in the abstract. Do not restate each milestone individually — they're already itemized separately, same as deliverables.
- Never use generic filler phrases. Banned phrases and any close variant of them: ${BANNED_FILLER_PHRASES_LIST}.
- 2-4 short paragraphs. No headers, no bullet points, no markdown, no title.
- ${langInstruction}

Respond with ONLY the description text, nothing else.`,
          },
          { role: "user", content: context },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

// Build translatedContent for a tender in BOTH directions (en + ar).
// Handles mixed-language content by letting the AI detect each field's language.
// Returns { en: { title, description, ... }, ar: { title, description, ... } }
export async function buildTenderTranslation(
  tender: any,
): Promise<Record<string, Record<string, string>> | null> {
  const keys: string[] = [];
  const texts: string[] = [];

  if (tender.title) { keys.push("title"); texts.push(tender.title); }
  if (tender.description) { keys.push("description"); texts.push(tender.description); }
  if (tender.objective) { keys.push("objective"); texts.push(tender.objective); }
  if (tender.category) { keys.push("category"); texts.push(tender.category); }

  if (Array.isArray(tender.deliverables)) {
    tender.deliverables.forEach((d: any, i: number) => {
      const name = typeof d === "string" ? d : d?.name;
      if (name) { keys.push(`deliverable_name_${i}`); texts.push(name); }
      if (typeof d !== "string" && d?.description) {
        keys.push(`deliverable_desc_${i}`);
        texts.push(d.description);
      }
    });
  }

  if (Array.isArray(tender.milestones)) {
    tender.milestones.forEach((m: any, i: number) => {
      if (m?.name) { keys.push(`milestone_name_${i}`); texts.push(m.name); }
      if (m?.description) { keys.push(`milestone_desc_${i}`); texts.push(m.description); }
    });
  }

  if (Array.isArray(tender.vendorRequirements)) {
    tender.vendorRequirements.forEach((r: any, i: number) => {
      if (r?.text) { keys.push(`vendor_req_${i}`); texts.push(r.text); }
    });
  }

  if (Array.isArray(tender.skills)) {
    tender.skills.forEach((s: string, i: number) => {
      if (s) { keys.push(`skill_${i}`); texts.push(s); }
    });
  }

  if (Array.isArray(tender.formCards)) {
    tender.formCards.forEach((c: any, i: number) => {
      if (c?.label) { keys.push(`card_label_${i}`); texts.push(c.label); }
      if (typeof c?.value === "string" && c.value) {
        keys.push(`card_value_${i}`);
        texts.push(c.value);
      }
    });
  }

  if (texts.length === 0) return null;

  const [enTranslated, arTranslated] = await Promise.all([
    translateTexts(texts, "en"),
    translateTexts(texts, "ar"),
  ]);

  const enMap: Record<string, string> = {};
  const arMap: Record<string, string> = {};
  keys.forEach((key, idx) => {
    enMap[key] = enTranslated[idx] || texts[idx];
    arMap[key] = arTranslated[idx] || texts[idx];
  });

  return { en: enMap, ar: arMap };
}
