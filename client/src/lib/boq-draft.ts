// The bill of quantities while a request is being written (wizard draft in
// localStorage, AC3), and its conversion to the API's strict form.
import type { BoqItemInput, ItemColumn } from "@shared/boq-items";
import { parseBoqQuantity, parsePrice } from "@shared/boq-money";
import { cleanText } from "@shared/boq-items";

export interface DraftItem extends BoqItemInput {
  key: string;
}

export interface BoqDraft {
  items: DraftItem[];
  columns: ItemColumn[];
  showReferencePrices: boolean;
}

export const emptyBoq = (): BoqDraft => ({ items: [], columns: [], showReferencePrices: false });

export const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

export const blankItem = (): DraftItem => ({ key: newKey(), name: "", description: "", unit: "", quantity: "", referenceUnitPrice: "", imageUrl: null, customValues: {} });

/** Read the BOQ from a wizard draft, tolerating older or partial shapes. */
export function readBoq(draft: Record<string, unknown> | null | undefined): BoqDraft {
  const b = (draft?.boq ?? null) as Partial<BoqDraft> | null;
  if (!b || typeof b !== "object") return emptyBoq();
  return {
    items: Array.isArray(b.items) ? b.items.map((i) => ({ ...blankItem(), ...i, key: i.key || newKey() })) : [],
    columns: Array.isArray(b.columns) ? b.columns : [],
    showReferencePrices: b.showReferencePrices === true,
  };
}

/**
 * The `structured` block of the create request: typed text normalised to the
 * API's ASCII decimal strings (Arabic digits → ASCII; never rounded — an
 * invalid value is sent as typed and the server refuses it).
 */
export function toStructuredPayload(boq: BoqDraft, requestType: "rfp" | "rfq") {
  const num = (raw: unknown, parse: typeof parseBoqQuantity) => {
    const r = parse(raw, true);
    return r.ok ? r.text : cleanText(raw);
  };
  return {
    requestType,
    itemizedPricing: true,
    showReferencePrices: boq.showReferencePrices,
    itemColumns: boq.columns.map((c, position) => ({ id: c.id, label: cleanText(c.label), type: c.type, position })),
    items: boq.items.map((i) => {
      const ref = cleanText(i.referenceUnitPrice);
      const custom: Record<string, string> = {};
      for (const c of boq.columns) {
        const v = cleanText(i.customValues?.[c.id]);
        if (v) custom[c.id] = v;
      }
      return {
        name: cleanText(i.name),
        description: cleanText(i.description) || null,
        unit: cleanText(i.unit),
        quantity: num(i.quantity, parseBoqQuantity),
        referenceUnitPrice: ref ? num(ref, parsePrice) : null,
        imageUrl: i.imageUrl || null,
        customValues: Object.keys(custom).length ? custom : null,
      };
    }),
  };
}
