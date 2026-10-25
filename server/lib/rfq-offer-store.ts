// Itemized offers: the shared pricing draft (D1) and the submission
// transaction (D2), proposal §6 with Amendment A2.
//
// Draft: one per (tender, vendor company). Saves are optimistic — the caller
// names the version it edited; a different stored version is a 409 carrying the
// latest draft. No silent last-writer-wins.
//
// Submission, in ONE transaction:
//   1. lock the vendor company row (serialises the company's members)
//   2. idempotency: (company, tender, submission key) — same request → the same
//      offer (replayed); different request under the same key → 409
//   3. re-read the request: published, deadline open, items revision unchanged
//   4. the company's current offer: none, or resubmittable → superseded (exactly 1 row)
//   5. price on the server from the items read in this transaction
//   6. insert offer, responses, alternatives, snapshot
//   7. delete the draft
// Any failure rolls everything back, including the supersede. Notifications
// are sent by the caller only after this returns.

import { createHash } from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import {
  companies, offers, offerItemAlternatives, offerItemResponses, offerPricingDrafts, tenderItems, tenders,
  type Offer, type OfferPricingDraft,
} from "@shared/schema";
import { priceOffer, serializeTotals, type PricingResult, type RfqItemSpec } from "@shared/rfq-pricing";
import { money, parseBoqQuantity, parsePrice } from "@shared/boq-money";
import { canonicalJson, type PricingPayload, type SubmitItemizedOffer } from "@shared/rfq-offer";
import { PROCUREMENT_TAX_POLICY } from "@shared/procurement-tax";
import { db as defaultDb } from "../db";
import { toStoredItem } from "./tender-items-store";

type Database = typeof defaultDb;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class RfqOfferError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "RfqOfferError";
  }
  toBody() {
    return { message: this.message, code: this.code, ...(this.details ?? {}) };
  }
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const draftView = (d: OfferPricingDraft | undefined | null) =>
  d ? { version: d.version, itemsRevision: d.itemsRevision, payload: d.payload as PricingPayload, updatedBy: d.updatedBy, updatedAt: d.updatedAt } : null;
export type DraftView = ReturnType<typeof draftView>;

export interface SubmitInput {
  tenderId: string;
  companyId: string;
  userId: string;
  body: SubmitItemizedOffer;
  /** Documents already checked for provenance by the route. */
  documents: { technicalFileUrl: string | null; financialFileUrl: string | null; combinedFileUrl: string | null; videoUrl: string | null };
  now?: Date;
}

export type SubmitResult = { offer: Offer; replayed: boolean; pricing: PricingResult | null };

function deadlinePassed(deadline: string | null | undefined, now: Date): boolean {
  if (!deadline) return false;
  const end = new Date(deadline);
  end.setHours(23, 59, 59, 999);
  return now > end;
}

async function loadItems(tx: Tx | Database, tenderId: string, revision: number) {
  const rows = await tx.select().from(tenderItems)
    .where(and(eq(tenderItems.tenderId, tenderId), eq(tenderItems.revision, revision)))
    .orderBy(asc(tenderItems.position));
  return rows.map(toStoredItem);
}

export function createRfqOfferStore(database: Database) {
  return {
    async getDraft(tenderId: string, companyId: string): Promise<DraftView> {
      const [d] = await database.select().from(offerPricingDrafts)
        .where(and(eq(offerPricingDrafts.tenderId, tenderId), eq(offerPricingDrafts.companyId, companyId)));
      return draftView(d);
    },

    async saveDraft(input: { tenderId: string; companyId: string; userId: string; baseVersion: number | null; itemsRevision: number; payload: PricingPayload; now?: Date }): Promise<DraftView> {
      const now = input.now ?? new Date();
      return database.transaction(async (tx) => {
        const [current] = await tx.select().from(offerPricingDrafts)
          .where(and(eq(offerPricingDrafts.tenderId, input.tenderId), eq(offerPricingDrafts.companyId, input.companyId)))
          .for("update");
        if ((current?.version ?? null) !== input.baseVersion) {
          throw new RfqOfferError(409, "DRAFT_CONFLICT", "Another team member updated this draft.", { latest: draftView(current) });
        }
        if (!current) {
          const inserted = await tx.insert(offerPricingDrafts).values({
            tenderId: input.tenderId, companyId: input.companyId, itemsRevision: input.itemsRevision,
            payload: input.payload, version: 1, updatedBy: input.userId, updatedAt: now,
          }).onConflictDoNothing().returning();
          if (!inserted.length) {
            // Another member created it between our read and insert.
            const [latest] = await tx.select().from(offerPricingDrafts)
              .where(and(eq(offerPricingDrafts.tenderId, input.tenderId), eq(offerPricingDrafts.companyId, input.companyId)));
            throw new RfqOfferError(409, "DRAFT_CONFLICT", "Another team member updated this draft.", { latest: draftView(latest) });
          }
          return draftView(inserted[0]);
        }
        const [updated] = await tx.update(offerPricingDrafts)
          .set({ payload: input.payload, itemsRevision: input.itemsRevision, version: current.version + 1, updatedBy: input.userId, updatedAt: now })
          .where(and(eq(offerPricingDrafts.id, current.id), eq(offerPricingDrafts.version, current.version)))
          .returning();
        return draftView(updated);
      });
    },

    async submit(input: SubmitInput): Promise<SubmitResult> {
      const now = input.now ?? new Date();
      const { body } = input;
      const requestHash = sha256(canonicalJson({ ...body, submissionKey: undefined }));
      return database.transaction(async (tx) => {
        // 1. One company at a time.
        const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, input.companyId)).for("update");
        if (!company) throw new RfqOfferError(404, "NOT_FOUND", "Company not found");

        // 2. Idempotency, scoped to this company and request.
        const [prior] = await tx.select().from(offers).where(and(
          eq(offers.companyId, input.companyId), eq(offers.tenderId, input.tenderId), eq(offers.submissionKey, body.submissionKey),
        ));
        if (prior) {
          if (prior.submissionRequestSha256 === requestHash) return { offer: prior, replayed: true, pricing: null };
          throw new RfqOfferError(409, "IDEMPOTENCY_KEY_REUSED", "This submission key was already used for a different offer.");
        }

        // 3. The request as it is now.
        const [tender] = await tx.select().from(tenders).where(eq(tenders.id, input.tenderId)).for("share");
        if (!tender) throw new RfqOfferError(404, "NOT_FOUND", "Tender not found");
        if (!tender.itemizedPricing) throw new RfqOfferError(409, "NOT_ITEMIZED", "This request does not use itemized pricing.");
        if (tender.companyId === input.companyId) throw new RfqOfferError(403, "SELF_SUBMISSION", "You cannot submit a proposal to your own company's request.");
        if (tender.status !== "published") throw new RfqOfferError(403, "NOT_PUBLISHED", `This request is ${tender.status} and not accepting proposals.`);
        if (deadlinePassed(tender.deadline, now)) throw new RfqOfferError(403, "DEADLINE_PASSED", "Submission deadline has passed.");
        if (tender.itemsRevision !== body.itemsRevision) {
          throw new RfqOfferError(409, "STALE_REVISION", "The request's items changed. Review the latest items.", { itemsRevision: tender.itemsRevision });
        }

        // 4. The company's current offer (any member).
        const [current] = await tx.select().from(offers).where(and(
          eq(offers.tenderId, input.tenderId), eq(offers.companyId, input.companyId), ne(offers.status, "superseded"),
        ));
        if (current && !current.resubmissionAllowed) {
          throw new RfqOfferError(409, "ALREADY_SUBMITTED", "You have already submitted an offer for this tender.", { existingOfferId: current.id });
        }
        // 4b. The shared draft must be the one this submission was built from (PB-2).
        const [draft] = await tx.select().from(offerPricingDrafts)
          .where(and(eq(offerPricingDrafts.tenderId, tender.id), eq(offerPricingDrafts.companyId, input.companyId)))
          .for("update");
        if ((draft?.version ?? null) !== body.draftVersion) {
          throw new RfqOfferError(409, "DRAFT_CONFLICT", "Another team member updated this draft. Reload the latest version before submitting.", { latest: draftView(draft) });
        }
        if (current) {
          const superseded = await tx.update(offers).set({ status: "superseded" })
            .where(and(eq(offers.id, current.id), ne(offers.status, "superseded"), eq(offers.resubmissionAllowed, true)))
            .returning({ id: offers.id });
          if (superseded.length !== 1) throw new RfqOfferError(409, "ALREADY_SUBMITTED", "The current offer changed. Reload and try again.");
        }

        // 5. Server-side pricing from the items read in this transaction.
        const items = await loadItems(tx, tender.id, tender.itemsRevision);
        const specs: RfqItemSpec[] = items.map((i) => ({ id: i.id, name: i.name, description: i.description, unit: i.unit, quantity: i.quantity }));
        const pricing = priceOffer(specs, body.responses, body.tax, { final: true });
        if (!pricing.complete || pricing.total === null || pricing.subtotal === null || pricing.vat === null) {
          const blocked = pricing.issues.some((i) => i.code === "TAX_TREATMENT_UNSUPPORTED");
          throw new RfqOfferError(422, blocked ? "TAX_TREATMENT_UNSUPPORTED" : "PRICING_INCOMPLETE",
            blocked ? "An offer with mixed tax treatments cannot be submitted through this form." : "Complete all required item responses before submitting.",
            { issues: pricing.issues });
        }

        // 6. The offer, exactly as submitted.
        const totals = serializeTotals(pricing);
        const byItem = new Map(body.responses.map((r) => [r.itemId, r]));
        const snapshot = {
          policy: "A",
          taxPolicy: PROCUREMENT_TAX_POLICY,
          tender: { id: tender.id, requestType: tender.requestType, itemsRevision: tender.itemsRevision, submissionType: tender.submissionType },
          items: items.map(({ referenceUnitPrice: _hidden, ...spec }) => spec),
          responses: items.map((i) => byItem.get(i.id)),
          tax: body.tax,
          totals,
        };
        const snapshotJson = canonicalJson(snapshot);
        const [offer] = await tx.insert(offers).values({
          tenderId: tender.id,
          companyId: input.companyId,
          createdBy: input.userId,
          notes: body.notes?.trim() || null,
          quotePrice: null,
          technicalFileUrl: input.documents.technicalFileUrl,
          financialFileUrl: input.documents.financialFileUrl,
          combinedFileUrl: input.documents.combinedFileUrl,
          videoUrl: input.documents.videoUrl,
          conditionalSubmission: false,
          resubmissionAllowed: false,
          status: "pending",
          decidedBy: null,
          decidedAt: null,
          submittedAt: now,
          itemsRevision: tender.itemsRevision,
          vatApplied: body.tax.applyVat,
          vatRateBp: pricing.rateBp,
          taxPolicy: PROCUREMENT_TAX_POLICY,
          pricingSubtotal: money(pricing.subtotal),
          pricingVat: money(pricing.vat),
          pricingTotal: money(pricing.total),
          pricingSnapshot: JSON.parse(snapshotJson),
          pricingSnapshotSha256: sha256(snapshotJson),
          submissionKey: body.submissionKey,
          submissionRequestSha256: requestHash,
        }).returning();

        for (const line of pricing.lines) {
          const r = byItem.get(line.itemId)!;
          const [response] = await tx.insert(offerItemResponses).values({
            offerId: offer.id,
            tenderItemId: line.itemId,
            state: line.state,
            unitPrice: line.state === "priced" ? (parsePrice(r.unitPrice) as { text: string }).text : null,
            lineTotal: line.originalLine === null ? null : money(line.originalLine),
          }).returning();
          if (r.alternative && line.alternativeLine !== null) {
            const a = r.alternative;
            await tx.insert(offerItemAlternatives).values({
              responseId: response.id,
              role: line.alternativeRole!,
              name: a.name!.trim(),
              description: a.description?.trim() || null,
              unit: a.unit!.trim(),
              quantity: (parseBoqQuantity(a.quantity) as { text: string }).text,
              unitPrice: (parsePrice(a.unitPrice) as { text: string }).text,
              lineTotal: money(line.alternativeLine),
              imageUrl: a.imageUrl || null,
              reason: a.reason!.trim(),
            });
          }
        }

        // 7. The draft has become the offer.
        await tx.delete(offerPricingDrafts).where(and(eq(offerPricingDrafts.tenderId, tender.id), eq(offerPricingDrafts.companyId, input.companyId)));
        return { offer, replayed: false, pricing };
      });
    },
  };
}

export type RfqOfferStore = ReturnType<typeof createRfqOfferStore>;
export const rfqOfferStore: RfqOfferStore = createRfqOfferStore(defaultDb);
