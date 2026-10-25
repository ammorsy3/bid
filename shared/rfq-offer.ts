// An itemized offer as the vendor's pricing page sends it (drafts and final
// submission), the document rules per submission method (Amendment A1), and
// the canonical JSON used for the snapshot and idempotency hashes.
import { z } from "zod";
import { RESPONSE_STATES } from "./rfq-pricing";

const decimal = z.string().max(40);
const text = (max: number) => z.string().max(max);

export const alternativeInputSchema = z.object({
  name: text(1000).nullish(),
  description: text(5000).nullish(),
  unit: text(200).nullish(),
  quantity: decimal.nullish(),
  unitPrice: decimal.nullish(),
  reason: text(5000).nullish(),
  imageUrl: text(1000).nullish(),
}).strict();

export const itemResponseSchema = z.object({
  itemId: z.string().min(1).max(100),
  state: z.enum(RESPONSE_STATES).nullish(),
  unitPrice: decimal.nullish(),
  alternative: alternativeInputSchema.nullish(),
}).strict();

export const offerDocumentsSchema = z.object({
  technicalFileUrl: text(1000).nullish(),
  financialFileUrl: text(1000).nullish(),
  combinedFileUrl: text(1000).nullish(),
  videoUrl: text(1000).nullish(),
}).strict();

export const pricingPayloadSchema = z.object({
  responses: z.array(itemResponseSchema).max(2000),
  tax: z.object({ applyVat: z.boolean(), mixedTreatment: z.boolean() }).strict(),
  notes: text(5000).nullish(),
  documents: offerDocumentsSchema.nullish(),
}).strict();
export type PricingPayload = z.infer<typeof pricingPayloadSchema>;

export const saveDraftSchema = z.object({
  baseVersion: z.number().int().min(1).nullable(),
  itemsRevision: z.number().int().min(1),
  payload: pricingPayloadSchema,
}).strict();

export const submitItemizedOfferSchema = pricingPayloadSchema.extend({
  submissionKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  itemsRevision: z.number().int().min(1),
  // The shared draft version this submission was built from (null: no draft yet).
  // A different stored version means a team member changed it: 409, nothing written (PB-2).
  draftVersion: z.number().int().min(1).nullable(),
}).strict();
export type SubmitItemizedOffer = z.infer<typeof submitItemizedOfferSchema>;

export type DocumentProblem = { code: "DOCUMENTS_REQUIRED" | "VIDEO_REQUIRED" | "VIDEO_URL_INVALID"; field: string };

const isHttpUrl = (v: string) => { try { const u = new URL(v); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; } };

/**
 * The documents the request's submission method requires next to the item
 * prices — enforced on the server for the itemized path (the legacy route left
 * this to the client).
 */
export function documentProblem(submissionType: string | null | undefined, videoRequired: boolean | null | undefined, docs: z.infer<typeof offerDocumentsSchema> | null | undefined): DocumentProblem | null {
  const d = docs ?? {};
  const has = (v: string | null | undefined) => typeof v === "string" && v.trim() !== "";
  const docsOk = has(d.combinedFileUrl) || (has(d.technicalFileUrl) && has(d.financialFileUrl));
  if (has(d.videoUrl) && !isHttpUrl(d.videoUrl!.trim())) return { code: "VIDEO_URL_INVALID", field: "videoUrl" };
  switch (submissionType) {
    case "tech_fin_proposal":
      return docsOk ? null : { code: "DOCUMENTS_REQUIRED", field: "combinedFileUrl" };
    case "video_only":
      return has(d.videoUrl) ? null : { code: "VIDEO_REQUIRED", field: "videoUrl" };
    case "tech_fin_with_video":
      if (!docsOk) return { code: "DOCUMENTS_REQUIRED", field: "combinedFileUrl" };
      return videoRequired && !has(d.videoUrl) ? { code: "VIDEO_REQUIRED", field: "videoUrl" } : null;
    default:
      return null; // itemized_only: prices only
  }
}

/** Deterministic JSON (sorted keys) so equal content always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const o = value as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
}
