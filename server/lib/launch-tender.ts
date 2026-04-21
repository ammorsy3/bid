// Shared entry point for "take a Copilot draft (or already-mapped payload)
// and turn it into a real tender." Used by:
//   - POST /api/tenders (the existing web route, with source='web')
//   - the Phase 1 public REST API (source='api_key')
//   - the Phase 2 webhook adapter (source='webhook')
//   - the Phase 2 MCP server (source='mcp')
//
// Owns the verification gate, marketplace-flag validation, category inference,
// email notification, translation scheduling, and the activity-log write.
// Routes only contribute transport concerns (HTTP status codes, JSON shaping).

import { storage } from "../storage";
import { createTenderSchema, type CreateTender } from "@shared/schema";
import { draftToTenderPayload, type DraftToTenderPayloadExtras } from "@shared/tender-mapping";
import { suggestTenderCategory, buildTenderTranslation } from "./tender-ai";
import { sendTenderCreatedNotification } from "../email";

export type TenderCreationSource = "web" | "api_key" | "webhook" | "mcp";

export interface LaunchMarketplaceOptions {
  publishToMarketplace?: boolean;
  marketplaceTenderType?: string;
  marketplaceDocumentFee?: number | null;
  marketplaceInquiryDeadline?: string | null;
}

export interface LaunchTenderContext {
  company: { id: string; verificationStatus: string };
  user: { id: string };
  source: TenderCreationSource;
  integrationId?: string;
  apiKeyId?: string;
  sessionId?: string;
  marketplace?: LaunchMarketplaceOptions;
}

export interface LaunchTenderResult {
  tender: Record<string, any>;
  invitationToken: string;
  tenderUrl: string;
  marketplaceRefNumber?: string;
}

export class CompanyNotVerifiedError extends Error {
  readonly code = "COMPANY_NOT_VERIFIED";
  constructor() {
    super(
      "Your company must be verified before creating tenders. Upload your documents in Settings to begin the verification process.",
    );
    this.name = "CompanyNotVerifiedError";
  }
}

export class MarketplaceValidationError extends Error {
  readonly code = "MARKETPLACE_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "MarketplaceValidationError";
  }
}

/** Create a tender from a raw Copilot draft (LLM output shape). */
export async function launchTenderFromDraft(
  draft: Record<string, any>,
  ctx: LaunchTenderContext,
  extras?: DraftToTenderPayloadExtras,
): Promise<LaunchTenderResult> {
  const payload = draftToTenderPayload(draft, extras);
  return launchTenderFromPayload(payload, ctx);
}

/** Create a tender from an already-mapped payload (used by the web wizard). */
export async function launchTenderFromPayload(
  payload: unknown,
  ctx: LaunchTenderContext,
): Promise<LaunchTenderResult> {
  assertCompanyVerified(ctx.company);
  if (ctx.marketplace?.publishToMarketplace) {
    assertMarketplaceOptionsValid(ctx.marketplace);
  }

  const tenderData = createTenderSchema.parse(payload);

  const invitationToken =
    Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

  let tender: Record<string, any> = await storage.createTender({
    ...tenderData,
    companyId: ctx.company.id,
    createdBy: ctx.user.id,
    invitationToken,
    allowConditionalSubmission: false,
    status: "published",
  });

  await storage.logMemberActivity({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "tender.created",
    targetType: "tender",
    targetId: tender.id,
    summary: `Created tender: ${tender.title || "Untitled"}`,
    metadata: {
      tenderId: tender.id,
      source: ctx.source,
      ...(ctx.integrationId ? { integrationId: ctx.integrationId } : {}),
      ...(ctx.apiKeyId ? { apiKeyId: ctx.apiKeyId } : {}),
      ...(ctx.sessionId ? { sessionId: ctx.sessionId } : {}),
      publishToMarketplace: !!ctx.marketplace?.publishToMarketplace,
    },
  });

  let marketplaceRefNumber: string | undefined;
  if (ctx.marketplace?.publishToMarketplace) {
    marketplaceRefNumber = `BID-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const updated = await storage.updateTender(tender.id, {
      isMarketplace: true,
      marketplaceStatus: "pending",
      referenceNumber: marketplaceRefNumber,
      tenderType: ctx.marketplace.marketplaceTenderType || "open_tender",
      documentFee: ctx.marketplace.marketplaceDocumentFee || null,
      inquiryDeadline: ctx.marketplace.marketplaceInquiryDeadline || null,
    });
    if (updated) tender = updated;
    await storage.logProductEvent({
      eventType: "marketplace_submission",
      companyId: ctx.company.id,
      userId: ctx.user.id,
      metadata: { tenderId: tender.id },
    });
  }

  if (!tender.category || tender.category === "Other") {
    try {
      const suggestedCategory = await suggestTenderCategory({
        title: tenderData.title,
        description: tenderData.description,
        objective: (tenderData as any).objective,
        skills: (tenderData as any).skills,
        deliverables: (tenderData as any).deliverables,
      });
      if (suggestedCategory) {
        const updated = await storage.updateTender(tender.id, { category: suggestedCategory });
        if (updated) tender = updated;
      }
    } catch (err) {
      console.error("[launchTender] category suggestion failed:", err);
    }
  }

  scheduleTenderPostCreationTasks(tender, Boolean((tenderData as CreateTender).allowTranslation), ctx);

  const outputTender = marketplaceRefNumber
    ? { ...tender, isMarketplace: true, marketplaceStatus: "pending", referenceNumber: marketplaceRefNumber }
    : tender;

  return {
    tender: outputTender,
    invitationToken,
    tenderUrl: `/tenders/${tender.id}`,
    marketplaceRefNumber,
  };
}

function assertCompanyVerified(company: { verificationStatus: string }) {
  if (company.verificationStatus !== "verified") {
    throw new CompanyNotVerifiedError();
  }
}

function assertMarketplaceOptionsValid(opts: LaunchMarketplaceOptions) {
  const VALID = ["open_tender", "direct_purchase", "framework_agreement"];
  if (opts.marketplaceTenderType && !VALID.includes(opts.marketplaceTenderType)) {
    throw new MarketplaceValidationError("Invalid marketplace tender type");
  }
  if (opts.marketplaceDocumentFee != null) {
    const fee = Number(opts.marketplaceDocumentFee);
    if (!Number.isInteger(fee) || fee < 0 || fee > 100_000) {
      throw new MarketplaceValidationError(
        "Document fee must be a non-negative integer up to 100,000 SAR",
      );
    }
  }
  if (opts.marketplaceInquiryDeadline) {
    const d = new Date(opts.marketplaceInquiryDeadline);
    if (isNaN(d.getTime())) {
      throw new MarketplaceValidationError("Invalid inquiry deadline date");
    }
  }
}

function scheduleTenderPostCreationTasks(
  tender: Record<string, any>,
  allowTranslation: boolean,
  ctx: LaunchTenderContext,
) {
  // Email team: fire-and-forget so we don't block the response.
  (async () => {
    try {
      const members = await storage.getCompanyMembers(ctx.company.id);
      const recipients = members
        .filter(
          (m: any) =>
            (m.roleInCompany === "owner" || m.roleInCompany === "admin") && m.user.email,
        )
        .map((m: any) => ({
          email: m.user.email as string,
          name: m.user.name || undefined,
          language: (m.user.language || "en") as "en" | "ar",
        }));
      console.log(
        `[Email] Tender created — sending to ${recipients.length} recipient(s):`,
        recipients.map((r: any) => r.email),
      );
      await sendTenderCreatedNotification({
        tenderTitle: tender.title || "Untitled Tender",
        tenderId: tender.id,
        recipients,
      });
    } catch (emailErr) {
      console.error("[Email] Tender created notification failed:", emailErr);
    }
  })();

  if (allowTranslation) {
    buildTenderTranslation(tender)
      .then((translatedContent) => {
        if (translatedContent) {
          storage.updateTender(tender.id, { translatedContent }).catch(console.error);
        }
      })
      .catch(console.error);
  }
}
