// Structured (itemized / RFQ) requests: the write-side rules (proposal §2, §5,
// §7; Amendment A1). The client sends `structured` next to the usual request
// fields; everything in it is re-validated here in the strict API form.

import { z } from "zod";
import { itemColumnSchema } from "@shared/schema";
import { validateItems, normalizeItem, type BoqItemInput, type ItemColumn } from "@shared/boq-items";
import { isUploadObjectPath } from "@shared/company-verification";
import { MAX_ITEMS } from "@shared/boq-money";
import { attachProblem } from "./object-provenance";
import type { ObjectProvenance } from "../objectAcl";

export const ITEMIZED_SUBMISSION_TYPES = ["itemized_only", "tech_fin_proposal", "video_only", "tech_fin_with_video"] as const;

export class StructuredRequestError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "StructuredRequestError";
  }
  toBody() {
    return { message: this.message, code: this.code, ...(this.details ?? {}) };
  }
}

const itemSchema = z.object({
  name: z.string().max(1000),
  description: z.string().max(5000).nullish(),
  unit: z.string().max(200),
  quantity: z.string().max(40),
  referenceUnitPrice: z.string().max(40).nullish(),
  imageUrl: z.string().max(1000).nullish(),
  customValues: z.record(z.string().max(64), z.string().max(2000).nullable()).nullish(),
}).strict();

export const structuredRequestSchema = z.object({
  requestType: z.enum(["rfp", "rfq"]),
  itemizedPricing: z.boolean(),
  showReferencePrices: z.boolean().optional().default(false),
  itemColumns: z.array(itemColumnSchema).max(10).optional().default([]),
  items: z.array(itemSchema).max(MAX_ITEMS),
}).strict();

export interface StructuredRequest {
  requestType: "rfp" | "rfq";
  itemizedPricing: true;
  showReferencePrices: boolean;
  itemColumns: ItemColumn[];
  submissionType: (typeof ITEMIZED_SUBMISSION_TYPES)[number];
  items: ReturnType<typeof normalizeItem>[];
}

/**
 * The structured part of a create request, or null for a legacy request.
 * Throws StructuredRequestError for anything the invariants do not allow.
 */
export async function parseStructuredRequest(
  body: Record<string, unknown>,
  companyId: string,
  getObjectProvenance: (objectPath: string) => Promise<ObjectProvenance | null>,
): Promise<StructuredRequest | null> {
  const submissionType = typeof body.submissionType === "string" ? body.submissionType : null;
  const raw = body.structured;
  if (raw === undefined || raw === null) {
    if (submissionType === "itemized_only") {
      throw new StructuredRequestError(400, "ITEMIZED_ONLY_REQUIRES_ITEMS", "Prices-only submission needs an item list.");
    }
    return null;
  }
  const parsed = structuredRequestSchema.safeParse(raw);
  if (!parsed.success) throw new StructuredRequestError(400, "STRUCTURED_INVALID", "Invalid item list.");
  const s = parsed.data;

  // Invariant 1: an RFQ is always itemized. A non-itemized RFP carries no items.
  if (s.requestType === "rfq" && !s.itemizedPricing) throw new StructuredRequestError(400, "RFQ_REQUIRES_ITEMIZED", "An RFQ always uses itemized pricing.");
  if (!s.itemizedPricing) {
    if (s.items.length) throw new StructuredRequestError(400, "ITEMS_WITHOUT_ITEMIZED", "Items need itemized pricing.");
    if (submissionType === "itemized_only") throw new StructuredRequestError(400, "ITEMIZED_ONLY_REQUIRES_ITEMS", "Prices-only submission needs an item list.");
    return null;
  }
  // Amendment A1: itemized + quote_only would duplicate the item total.
  const type = (submissionType ?? "itemized_only") as StructuredRequest["submissionType"];
  if (!(ITEMIZED_SUBMISSION_TYPES as readonly string[]).includes(type)) {
    throw new StructuredRequestError(400, "SUBMISSION_TYPE_INVALID", "This submission method cannot be combined with itemized pricing.");
  }
  // The deliverables mirror is derived from the items, never written directly.
  if (Array.isArray(body.deliverables) && body.deliverables.length > 0) {
    throw new StructuredRequestError(400, "DELIVERABLES_NOT_ALLOWED", "Itemized requests take their deliverables from the item list.");
  }

  const items = s.items as BoqItemInput[];
  const v = validateItems(items, s.itemColumns, { lenient: false });
  if (!v.ok) throw new StructuredRequestError(400, "ITEMS_INVALID", "Some items are not valid.", { rows: v.rows, list: v.list });

  // Item images must be this company's own uploads (company provenance).
  for (const [i, item] of items.entries()) {
    if (!item.imageUrl) continue;
    if (!isUploadObjectPath(item.imageUrl)) throw new StructuredRequestError(400, "INVALID_FILE_REFERENCE", "This image cannot be attached.", { row: i });
    const problem = attachProblem(await getObjectProvenance(item.imageUrl), companyId);
    if (problem) throw new StructuredRequestError(400, problem, "This image cannot be attached.", { row: i });
  }

  return {
    requestType: s.requestType,
    itemizedPricing: true,
    showReferencePrices: s.showReferencePrices,
    itemColumns: s.itemColumns,
    submissionType: type,
    items: items.map((it) => normalizeItem(it, s.itemColumns, false)),
  };
}

