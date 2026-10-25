// Vendor pricing for itemized requests (RFQ-D1/D2/D4).
//
//   GET  /api/tenders/:id/pricing          the vendor's page: items (vendor view), the
//                                          company's shared draft, its current offer, what it may do
//   PUT  /api/tenders/:id/pricing-draft    save the shared draft (optimistic version)
//   POST /api/tenders/:id/itemized-offers  final submission (one transaction)
//   GET  /api/offers/:offerId/pricing      a submitted offer's stored pricing, for the
//                                          requester company and the offering company only
//
// Who (P5): owner, admin, business developer and member edit and submit; viewer
// reads only. Eligibility to submit is the shared S7 rule; a cancelled request
// stays readable, read-only, for companies that already offered (P11).
// Totals are always computed here; the client's are never read.

import type { Express, RequestHandler, Response } from "express";
import { vendorItemView } from "@shared/boq-items";
import { priceOffer, serializeTotals } from "@shared/rfq-pricing";
import { documentProblem, saveDraftSchema, submitItemizedOfferSchema, type PricingPayload } from "@shared/rfq-offer";
import { isUploadObjectPath } from "@shared/company-verification";
import { storage } from "../storage";
import { getObjectProvenance } from "../objectAcl";
import { attachProblem } from "../lib/object-provenance";
import { findOfferFileProblem } from "../lib/offer-files";
import { resolveSubmissionEligibility, resolveTenderReadGrant } from "../lib/tender-access";
import { tenderItemsStore as defaultItems, type TenderItemsStore } from "../lib/tender-items-store";
import { rfqOfferStore as defaultOffers, RfqOfferError, type RfqOfferStore } from "../lib/rfq-offer-store";
import { isStructuredPricingEnabled } from "../lib/structured-pricing-flag";
import { notifyRequesterOfProposal } from "../lib/proposal-notifications";
import type { AuthRequest } from "../middleware/auth-types";

interface Deps {
  authenticateToken: RequestHandler;
  requireCompanyContext: RequestHandler;
  itemsStore?: TenderItemsStore;
  offerStore?: RfqOfferStore;
}

const EDIT_ROLES = new Set(["owner", "admin", "business_developer", "member"]);

function send(res: Response, err: unknown, what: string) {
  if (err instanceof RfqOfferError) return res.status(err.status).json(err.toBody());
  if ((err as { name?: string })?.name === "ZodError") return res.status(400).json({ message: "Invalid pricing data", code: "INVALID_INPUT" });
  console.error(`[RfqPricing] ${what}:`, err);
  res.status(500).json({ message: "Server error" });
}

function deadlinePassed(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const end = new Date(deadline);
  end.setHours(23, 59, 59, 999);
  return new Date() > end;
}

/** Structural problems a draft may not contain either (unknown/duplicate items, malformed numbers). */
function draftShapeIssues(items: { id: string; name: string; unit: string; quantity: string }[], payload: PricingPayload) {
  return priceOffer(items, payload.responses, payload.tax, { final: false }).issues
    .filter((i) => i.code === "UNKNOWN_ITEM" || i.code === "DUPLICATE_RESPONSE" || i.code === "PRICE_INVALID" || i.code === "ALT_QUANTITY_INVALID" || i.code === "ALT_FIELD_TOO_LONG" || i.code === "TOO_MANY_ITEMS");
}

/** Alternative images must be the submitter's own company uploads (sealed-offer rule). */
async function alternativeImageProblem(payload: PricingPayload, companyId: string, userId: string) {
  for (const r of payload.responses) {
    const img = r.alternative?.imageUrl;
    if (!img) continue;
    if (!isUploadObjectPath(img)) return { code: "INVALID_FILE_REFERENCE", itemId: r.itemId };
    const problem = attachProblem(await getObjectProvenance(img), companyId, userId);
    if (problem) return { code: problem, itemId: r.itemId };
  }
  return null;
}

/**
 * The submitted offer as a starting draft for a resubmission (PB-6). Files keep
 * their ownership rules: a document or alternative image the current member may
 * not attach (S5: own company, own upload) is left out, to be uploaded again.
 */
async function prefillFromSnapshot(offer: { pricingSnapshot: unknown; notes: string | null; technicalFileUrl: string | null; financialFileUrl: string | null; combinedFileUrl: string | null; videoUrl: string | null }, companyId: string, userId: string): Promise<PricingPayload> {
  const snap = offer.pricingSnapshot as { responses?: (PricingPayload["responses"][number] | null)[]; tax?: PricingPayload["tax"] };
  const submitter = { userId, companyId };
  const keep = async (field: "technicalFileUrl" | "financialFileUrl" | "combinedFileUrl") =>
    offer[field] && !(await findOfferFileProblem({ [field]: offer[field] }, submitter, getObjectProvenance)) ? offer[field] : null;
  const responses: PricingPayload["responses"] = [];
  for (const r of snap.responses ?? []) {
    if (!r) continue;
    if (r.alternative?.imageUrl) {
      const ok = isUploadObjectPath(r.alternative.imageUrl) && !attachProblem(await getObjectProvenance(r.alternative.imageUrl), companyId, userId);
      responses.push(ok ? r : { ...r, alternative: { ...r.alternative, imageUrl: null } });
    } else responses.push(r);
  }
  return {
    responses,
    tax: snap.tax ?? { applyVat: true, mixedTreatment: false },
    notes: offer.notes,
    documents: { technicalFileUrl: await keep("technicalFileUrl"), financialFileUrl: await keep("financialFileUrl"), combinedFileUrl: await keep("combinedFileUrl"), videoUrl: offer.videoUrl },
  };
}

/** One post-commit step; its failure is logged and does not stop the others. */
async function isolated(step: string, fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (err) {
    console.error(`[RfqPricing] post-commit ${step} failed:`, err);
    return false;
  }
}

export async function runAfterCommit(
  ctx: { companyId: string; tender: { id: string; title: string | null; companyId: string | null } },
  userId: string,
  offer: { id: string; submittedAt?: Date | string | null },
): Promise<void> {
  await isolated("activity log", () => storage.logMemberActivity({
    companyId: ctx.companyId, actorUserId: userId, action: "offer.submitted", targetType: "offer", targetId: offer.id,
    summary: `Submitted offer for tender: ${ctx.tender.title || "Untitled"}`, metadata: { tenderId: ctx.tender.id, offerId: offer.id, itemized: true },
  }));
  await isolated("product event", () => storage.logProductEvent({ eventType: "proposal_submitted", companyId: ctx.companyId, userId, metadata: { tenderId: ctx.tender.id, itemized: true } }));
  // PB-5: the legacy route's recipient and preference policy. The vendor's name is
  // best effort: a failed lookup still sends (the profile name is tried inside).
  let vendorName = "";
  await isolated("company lookup", async () => { vendorName = (await storage.getCompany(ctx.companyId))?.name ?? ""; });
  await isolated("requester email", () => notifyRequesterOfProposal({
    tender: ctx.tender, vendorCompanyId: ctx.companyId, vendorCompanyName: vendorName, submittedAt: new Date(offer.submittedAt ?? Date.now()),
  }));
}

export function registerRfqPricingRoutes(app: Express, { authenticateToken, requireCompanyContext, itemsStore = defaultItems, offerStore = defaultOffers }: Deps) {
  /** Who the caller is for this request, and what they may do. Answers the request (and returns null) when nothing. */
  async function context(req: AuthRequest, res: Response) {
    const tender = await storage.getTender(req.params.id);
    if (!tender) { res.status(404).json({ message: "Tender not found" }); return null; }
    if (!tender.itemizedPricing) { res.status(409).json({ message: "This request does not use itemized pricing.", code: "NOT_ITEMIZED" }); return null; }
    const companyId = req.auth!.activeCompanyId!;
    const role = req.auth!.roleInCompany ?? null;
    if (tender.companyId === companyId) { res.status(403).json({ message: "You cannot price your own company's request.", code: "SELF_SUBMISSION" }); return null; }
    const viewer = { userId: req.auth!.userId, companyId, invitationToken: req.get("x-invitation-token") ?? null };
    const eligibility = await resolveSubmissionEligibility(tender, viewer, storage);
    const readGrant = eligibility.ok ? null : await resolveTenderReadGrant(tender, viewer, storage);
    if (!eligibility.ok && !readGrant) { res.status(403).json({ message: "You are not invited to submit a proposal to this request.", code: eligibility.code }); return null; }
    const company = await storage.getCompany(companyId);
    const verified = !company || company.accountType !== "company" || company.verificationStatus === "verified";
    const readOnlyReason =
      tender.status === "cancelled" ? "REQUEST_CANCELLED"
      : tender.status !== "published" ? "NOT_PUBLISHED"
      : deadlinePassed(tender.deadline) ? "DEADLINE_PASSED"
      : !eligibility.ok ? "NOT_INVITED"
      : !EDIT_ROLES.has(role ?? "") ? "VIEWER"
      : !isStructuredPricingEnabled() ? "STRUCTURED_PRICING_DISABLED"
      : !verified ? "VERIFICATION_REQUIRED"
      : null;
    return { tender, companyId, readOnlyReason };
  }

  app.get("/api/tenders/:id/pricing", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const ctx = await context(req, res);
      if (!ctx) return;
      const { tender, companyId } = ctx;
      const items = await itemsStore.getItems(tender.id, tender.itemsRevision);
      const [draft, current] = await Promise.all([offerStore.getDraft(tender.id, companyId), storage.getOfferByTenderAndCompany(tender.id, companyId)]);
      // PB-6: a reopened offer starts from what was submitted — only when no newer shared draft exists.
      const prefill = !draft && current?.resubmissionAllowed && current.pricingSnapshot
        ? await prefillFromSnapshot(current, companyId, req.auth!.userId)
        : null;
      res.json({
        tender: {
          id: tender.id, title: tender.title, status: tender.status, deadline: tender.deadline, requestType: tender.requestType,
          submissionType: tender.submissionType, videoRequired: tender.videoRequired, itemsRevision: tender.itemsRevision, currency: tender.currency ?? "SAR",
        },
        ...vendorItemView(items, tender.itemColumns, tender.showReferencePrices),
        draft,
        prefill,
        offer: current ? { id: current.id, status: current.status, resubmissionAllowed: current.resubmissionAllowed, submittedAt: current.submittedAt, pricingTotal: current.pricingTotal } : null,
        // An offer already in (and not reopened) is read-only too.
        readOnlyReason: ctx.readOnlyReason ?? (current && !current.resubmissionAllowed ? "ALREADY_SUBMITTED" : null),
      });
    } catch (err) { send(res, err, "load"); }
  });

  app.put("/api/tenders/:id/pricing-draft", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const ctx = await context(req, res);
      if (!ctx) return;
      if (ctx.readOnlyReason) return res.status(ctx.readOnlyReason === "VIEWER" ? 403 : 409).json({ message: "This draft cannot be changed.", code: ctx.readOnlyReason });
      const body = saveDraftSchema.parse(req.body);
      if (body.itemsRevision !== ctx.tender.itemsRevision) return res.status(409).json({ message: "The request's items changed.", code: "STALE_REVISION", itemsRevision: ctx.tender.itemsRevision });
      const items = await itemsStore.getItems(ctx.tender.id, ctx.tender.itemsRevision);
      const issues = draftShapeIssues(items, body.payload);
      if (issues.length) return res.status(400).json({ message: "Invalid pricing data", code: "INVALID_RESPONSES", issues });
      const draft = await offerStore.saveDraft({ tenderId: ctx.tender.id, companyId: ctx.companyId, userId: req.auth!.userId, baseVersion: body.baseVersion, itemsRevision: body.itemsRevision, payload: body.payload });
      res.json({ draft });
    } catch (err) { send(res, err, "save draft"); }
  });

  app.post("/api/tenders/:id/itemized-offers", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const ctx = await context(req, res);
      if (!ctx) return;
      if (ctx.readOnlyReason) {
        const status = ctx.readOnlyReason === "VIEWER" || ctx.readOnlyReason === "VERIFICATION_REQUIRED" || ctx.readOnlyReason === "NOT_INVITED" ? 403 : 409;
        return res.status(status).json({ message: "This offer cannot be submitted.", code: ctx.readOnlyReason });
      }
      const body = submitItemizedOfferSchema.parse(req.body);
      // Files before anything else: the submitter's own company uploads only (S5).
      const docs = body.documents ?? {};
      const fileProblem = await findOfferFileProblem(docs, { userId: req.auth!.userId, companyId: ctx.companyId }, getObjectProvenance);
      if (fileProblem) return res.status(400).json({ message: "Invalid offer data", code: fileProblem.code, field: fileProblem.field });
      const imgProblem = await alternativeImageProblem(body, ctx.companyId, req.auth!.userId);
      if (imgProblem) return res.status(400).json({ message: "Invalid offer data", ...imgProblem });
      const docProblem = documentProblem(ctx.tender.submissionType, ctx.tender.videoRequired, docs);
      if (docProblem) return res.status(422).json({ message: "Required documents are missing.", ...docProblem });

      const result = await offerStore.submit({
        tenderId: ctx.tender.id, companyId: ctx.companyId, userId: req.auth!.userId, body,
        documents: {
          technicalFileUrl: docs.technicalFileUrl || null, financialFileUrl: docs.financialFileUrl || null,
          combinedFileUrl: docs.combinedFileUrl || null, videoUrl: docs.videoUrl?.trim() || null,
        },
      });
      res.json({ offer: { id: result.offer.id, status: result.offer.status, pricingTotal: result.offer.pricingTotal }, replayed: result.replayed });

      // After commit only (a failed transaction never produces these) and never for
      // a replay. Each step is isolated (PB-5-R1): a failing log never stops the
      // requester's email, and a failing email never affects the answer.
      if (!result.replayed) void runAfterCommit(ctx, req.auth!.userId, result.offer);
    } catch (err) { send(res, err, "submit"); }
  });

  app.get("/api/offers/:offerId/pricing", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const offer = await storage.getOffer(req.params.offerId);
      if (!offer || !offer.pricingSnapshot) return res.status(404).json({ message: "Offer not found" });
      const tender = await storage.getTender(offer.tenderId);
      const companyId = req.auth!.activeCompanyId;
      // Sealed bid: the two parties only (no blanket platform-admin read).
      if (!tender || (companyId !== tender.companyId && companyId !== offer.companyId)) return res.status(403).json({ message: "Access denied" });
      const snapshot = offer.pricingSnapshot as { items: unknown[]; responses: unknown[]; tax: unknown; totals: ReturnType<typeof serializeTotals> };
      const alternatives = (snapshot.responses as ({ alternative?: unknown } | null)[]).filter((r) => r?.alternative).length;
      res.json({
        offerId: offer.id,
        status: offer.status,
        submittedAt: offer.submittedAt,
        vatApplied: offer.vatApplied,
        vatRateBp: offer.vatRateBp,
        taxPolicy: offer.taxPolicy,
        subtotal: offer.pricingSubtotal,
        vat: offer.pricingVat,
        total: offer.pricingTotal,
        snapshotSha256: offer.pricingSnapshotSha256,
        alternativesCount: alternatives,
        items: snapshot.items,
        responses: snapshot.responses,
        totals: snapshot.totals,
      });
    } catch (err) { send(res, err, "read offer pricing"); }
  });
}
