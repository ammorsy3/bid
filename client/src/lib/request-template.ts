// Starting a request from the template gallery (RFQ brief §3). A template sets
// the starting configuration of the wizard draft; picking one when the draft
// already holds information asks first (gallery.changeWarning).

export const DRAFT_KEY = "tenderDraft";
export const FORM_STATE_KEY = "tender_form_state";

export type RequestType = "rfp" | "rfq";

/** The request-level settings a gallery choice establishes. */
export interface TemplateConfig {
  templateId: string;
  requestType: RequestType;
  itemizedPricing: boolean;
  submissionType?: string;
}

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

// A card's default value can be an object of empty fields; only real input counts.
const filled = (v: unknown): boolean => {
  if (v === null || v === undefined || v === "" || v === false) return false;
  if (Array.isArray(v)) return v.some(filled);
  if (typeof v === "object") return Object.values(v as object).some(filled);
  return true;
};

// Settings the gallery itself writes are not "information the user entered".
const CONFIG_KEYS = new Set(["templateId", "requestType", "itemizedPricing", "submissionType", "contactMethod"]);

/** True when the wizard draft or the form builder holds something the user entered. */
export function hasDraftContent(): boolean {
  const draft = read(DRAFT_KEY);
  if (draft && typeof draft === "object") {
    for (const [k, v] of Object.entries(draft as Record<string, unknown>)) {
      if (!CONFIG_KEYS.has(k) && filled(v)) return true;
    }
  }
  const cards = read(FORM_STATE_KEY);
  return Array.isArray(cards) && cards.some((c) => c && typeof c === "object" && filled((c as { value?: unknown }).value));
}

/** The draft's current template, if any (to tell "same template again" from a change). */
export function currentTemplateId(): string | null {
  const draft = read(DRAFT_KEY) as { templateId?: unknown } | null;
  return typeof draft?.templateId === "string" ? draft.templateId : null;
}

/** Start a fresh draft with this configuration (replaces what was there). */
export function startDraft(config: TemplateConfig, formCards: unknown[] | null): void {
  const draft: Record<string, unknown> = { templateId: config.templateId, requestType: config.requestType, itemizedPricing: config.itemizedPricing };
  if (config.submissionType) draft.submissionType = config.submissionType;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  if (formCards) localStorage.setItem(FORM_STATE_KEY, JSON.stringify(formCards));
  else localStorage.removeItem(FORM_STATE_KEY);
}
