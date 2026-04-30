// Maps a Copilot-produced tender draft into the real tender schema payload
// (what `POST /api/tenders` expects). Historically this lived on the client
// inside TenderAICopilot.tsx; moved here so the server can launch tenders
// directly from an external channel (webhook, MCP, public REST API) without
// bouncing the draft through the browser.
//
// This mapping must never widen silently: anything the LLM invents outside
// the allow-list of fields is dropped.

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface DraftToTenderPayloadExtras {
  language?: string;
  emailFallback?: string;
}

export function draftToTenderPayload(
  draft: Record<string, any>,
  extras?: DraftToTenderPayloadExtras,
): Record<string, any> {
  const out: Record<string, any> = {};

  if (typeof draft.title === "string" && draft.title.trim()) {
    out.title = draft.title.trim();
  }

  // LLM emits `serviceDescription`; schema column is `description`.
  if (typeof draft.serviceDescription === "string" && draft.serviceDescription.trim()) {
    out.description = draft.serviceDescription.trim();
  }

  if (typeof draft.projectObjective === "string" && draft.projectObjective.trim()) {
    out.objective = draft.projectObjective.trim();
  }

  if (typeof draft.category === "string" && draft.category.trim()) {
    out.category = draft.category.trim();
  }

  if (Array.isArray(draft.skills)) {
    const skills = draft.skills
      .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s: string) => s.trim());
    if (skills.length > 0) out.skills = skills;
  }

  if (typeof draft.projectSize === "string") {
    const v = draft.projectSize.toLowerCase();
    if (["small", "medium", "large"].includes(v)) out.projectSize = v;
  }

  if (typeof draft.scope === "string" && draft.scope.trim()) {
    out.scope = draft.scope.trim();
  }

  // LLM emits `submissionDeadline`; schema column is `deadline`.
  if (typeof draft.submissionDeadline === "string" && draft.submissionDeadline.trim()) {
    out.deadline = draft.submissionDeadline.trim();
  }

  // LLM emits `timeline`; schema column is `projectTimeline`.
  if (typeof draft.timeline === "string" && draft.timeline.trim()) {
    out.projectTimeline = draft.timeline.trim();
  }

  if (typeof draft.duration === "string" && draft.duration.trim()) {
    out.duration = draft.duration.trim();
  }

  if (typeof draft.startDate === "string" && draft.startDate.trim()) {
    out.startDate = draft.startDate.trim();
  }

  if (typeof draft.endDate === "string" && draft.endDate.trim()) {
    out.endDate = draft.endDate.trim();
  }

  // Budget can be a number or { min, max }; schema has both budget (text) and
  // budgetMin/budgetMax (integers). Fill what we can.
  if (draft.budget && typeof draft.budget === "object") {
    const min = Number(draft.budget.min);
    const max = Number(draft.budget.max);
    if (Number.isFinite(min)) out.budgetMin = Math.round(min);
    if (Number.isFinite(max)) out.budgetMax = Math.round(max);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      out.budget = `${Math.round(min)} - ${Math.round(max)} SAR`;
    }
  } else if (draft.budget != null) {
    const n = Number(draft.budget);
    if (Number.isFinite(n)) {
      out.budget = String(Math.round(n));
      out.budgetMin = Math.round(n);
      out.budgetMax = Math.round(n);
    } else if (typeof draft.budget === "string" && draft.budget.trim()) {
      out.budget = draft.budget.trim();
    }
  }

  if (draft.budgetType === "fixed" || draft.budgetType === "milestone") {
    out.pricingModel = draft.budgetType;
  }

  if (typeof draft.showPriceToVendors === "boolean") {
    out.showPriceToVendors = draft.showPriceToVendors;
  }

  out.currency = out.currency ?? "SAR";

  // Deliverables: accept either structured objects from the new prompt, or a
  // plain string[] for backwards compatibility with older drafts.
  if (Array.isArray(draft.deliverables) && draft.deliverables.length > 0) {
    out.deliverables = draft.deliverables
      .map((d: any, i: number) => {
        if (typeof d === "string") {
          return d.trim()
            ? {
                id: `d-${generateId()}-${i}`,
                name: d.trim(),
                description: "",
                unit: "item",
                quantity: 1,
              }
            : null;
        }
        if (d && typeof d === "object" && typeof d.name === "string" && d.name.trim()) {
          const quantity = Number(d.quantity);
          return {
            id: d.id || `d-${generateId()}-${i}`,
            name: d.name.trim(),
            description: typeof d.description === "string" ? d.description.trim() : "",
            unit: typeof d.unit === "string" && d.unit.trim() ? d.unit.trim() : "item",
            quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
          };
        }
        return null;
      })
      .filter(Boolean);
    if (out.deliverables.length === 0) delete out.deliverables;
  }

  if (Array.isArray(draft.milestones) && draft.milestones.length > 0) {
    out.milestones = draft.milestones
      .map((m: any, i: number) => {
        if (!m || typeof m !== "object" || typeof m.name !== "string" || !m.name.trim()) return null;
        return {
          id: m.id || `m-${generateId()}-${i}`,
          name: m.name.trim(),
          description: typeof m.description === "string" ? m.description.trim() : "",
          dueDate: typeof m.dueDate === "string" && m.dueDate.trim() ? m.dueDate.trim() : null,
          amount: m.amount != null ? String(m.amount) : "",
        };
      })
      .filter(Boolean);
    if (out.milestones.length === 0) delete out.milestones;
  }

  if (Array.isArray(draft.vendorRequirements) && draft.vendorRequirements.length > 0) {
    out.vendorRequirements = draft.vendorRequirements
      .map((v: any, i: number) => {
        if (!v || typeof v !== "object" || typeof v.text !== "string" || !v.text.trim()) return null;
        const type = v.type === "preferred" ? "preferred" : "mandatory";
        return { id: v.id || `vr-${generateId()}-${i}`, text: v.text.trim(), type };
      })
      .filter(Boolean);
    if (out.vendorRequirements.length === 0) delete out.vendorRequirements;
  }

  if (draft.evaluationCriteria && typeof draft.evaluationCriteria === "object") {
    const ec = draft.evaluationCriteria;
    const weights = Array.isArray(ec.weights)
      ? ec.weights
          .filter((w: any) => w && typeof w.categoryId === "string" && Number.isFinite(Number(w.weight)))
          .map((w: any) => ({ categoryId: w.categoryId, weight: Math.round(Number(w.weight)) }))
      : [];
    const customCriteria = Array.isArray(ec.customCriteria)
      ? ec.customCriteria
          .filter((c: any) => c && typeof c.text === "string" && c.text.trim())
          .map((c: any, i: number) => ({
            id: c.id || `cc-${generateId()}-${i}`,
            text: c.text.trim(),
            weight: Number.isFinite(Number(c.weight)) ? Math.round(Number(c.weight)) : 0,
          }))
      : [];
    if (weights.length > 0 || customCriteria.length > 0) {
      out.evaluationCriteria = {
        weights,
        customCriteria,
        requirements: Array.isArray(ec.requirements) ? ec.requirements : [],
      };
    }
  }

  if (typeof draft.submissionType === "string") {
    const allowed = ["quote_only", "tech_fin_proposal", "video_only", "tech_fin_with_video"];
    if (allowed.includes(draft.submissionType)) out.submissionType = draft.submissionType;
  }

  if (typeof draft.videoRequired === "boolean") out.videoRequired = draft.videoRequired;

  if (typeof draft.inquiryType === "string") {
    const allowed = ["inside_bid", "email_whatsapp"];
    if (allowed.includes(draft.inquiryType)) out.inquiryType = draft.inquiryType;
  }

  if (typeof draft.whatsappContact === "string" && draft.whatsappContact.trim()) {
    out.whatsappContact = draft.whatsappContact.trim();
  }

  if (typeof draft.emailContact === "string" && draft.emailContact.trim()) {
    out.emailContact = draft.emailContact.trim();
  } else if (out.inquiryType === "email_whatsapp" && extras?.emailFallback) {
    out.emailContact = extras.emailFallback;
  }

  // Custom form-builder cards the LLM added on user request.
  if (Array.isArray(draft.formCards) && draft.formCards.length > 0) {
    const allowedTypes = new Set(["custom-text", "custom-textarea", "custom-date", "custom-select"]);
    out.formCards = draft.formCards
      .map((c: any, i: number) => {
        if (!c || typeof c !== "object" || !allowedTypes.has(c.type) || typeof c.label !== "string" || !c.label.trim()) return null;
        const card: Record<string, any> = {
          id: c.id || `fc-${generateId()}-${i}`,
          type: c.type,
          label: c.label.trim(),
          isRequired: Boolean(c.isRequired),
          value: null,
          touched: false,
        };
        if (typeof c.placeholder === "string" && c.placeholder.trim()) card.placeholder = c.placeholder.trim();
        if (c.type === "custom-select" && Array.isArray(c.options)) {
          card.options = c.options
            .filter((o: unknown): o is string => typeof o === "string" && o.trim().length > 0)
            .map((o: string) => o.trim());
        }
        return card;
      })
      .filter(Boolean);
    if (out.formCards.length === 0) delete out.formCards;
  }

  if (extras?.language && (extras.language === "en" || extras.language === "ar")) {
    out.language = extras.language;
  } else {
    out.language = "en";
  }
  out.allowTranslation = Boolean(draft.allowTranslation);

  // User-uploaded media (not LLM-invented).
  if (typeof draft.voiceNoteUrl === "string" && draft.voiceNoteUrl.trim()) {
    out.voiceNoteUrl = draft.voiceNoteUrl.trim();
  }
  if (typeof draft.videoUrl === "string" && draft.videoUrl.trim()) {
    out.videoUrl = draft.videoUrl.trim();
  }
  if (Array.isArray(draft.attachments) && draft.attachments.length > 0) {
    out.attachments = draft.attachments.filter(
      (a: any) => a && typeof a === "object" && typeof a.url === "string" && typeof a.name === "string",
    );
    if (out.attachments.length === 0) delete out.attachments;
  }

  return out;
}
