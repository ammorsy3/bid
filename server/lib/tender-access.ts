// Who may read a request (tender), and its own files, in which lifecycle state.
// One policy for GET /api/tenders/:id and the request-file rules in GET /objects/*.
//
//   owner company           every state
//   approved marketplace    published
//   invited                 published, closed      (a company invitation row, or an
//                                                    email invitation for the caller)
//   company with an offer   published, closed, cancelled (read-only: offers are
//                                                    refused unless published)
//   any other non-owner     nothing; never a draft
//
// The public invitation link is not a read grant here: the link pages
// (/api/tenders/by-token, /api/tenders/:id/invite) are public by design and serve
// the request text. For the request's own files a signed-in caller may present the
// link's invitation token (X-Invitation-Token); that opens only the files of that
// one request, only while it is published. Offer documents are never decided here.

export type TenderStatus = "draft" | "published" | "closed" | "cancelled" | string;

export type TenderReadGrant = "owner" | "marketplace" | "invited" | "offer_holder" | "invitation_link";

export interface TenderAccessFacts {
  isOwner: boolean;
  isInvited: boolean;
  hasOffer: boolean;
  /** Only for request files: the caller presented this request's invitation token. */
  presentedInvitationToken?: boolean;
}

interface TenderLike {
  status: TenderStatus;
  isMarketplace?: boolean | null;
  marketplaceStatus?: string | null;
}

const INVITED_STATES = new Set(["published", "closed"]);
const OFFER_HOLDER_STATES = new Set(["published", "closed", "cancelled"]);

/** Pure decision: the strongest grant that applies, or null. */
export function tenderReadGrant(tender: TenderLike, facts: TenderAccessFacts): TenderReadGrant | null {
  if (facts.isOwner) return "owner";
  if (tender.status === "draft") return null;
  if (tender.isMarketplace && tender.marketplaceStatus === "approved" && tender.status === "published") return "marketplace";
  if (facts.isInvited && INVITED_STATES.has(tender.status)) return "invited";
  if (facts.hasOffer && OFFER_HOLDER_STATES.has(tender.status)) return "offer_holder";
  if (facts.presentedInvitationToken && tender.status === "published") return "invitation_link";
  return null;
}

export interface TenderAccessViewer {
  userId?: string | null;
  companyId?: string | null;
  /** Raw X-Invitation-Token header value; only considered for request files. */
  invitationToken?: string | null;
}

export interface TenderAccessStorage {
  getInvitationsByTender(tenderId: string): Promise<{ companyId: string | null }[]>;
  getInvitationLinkByTenderAndEmail(tenderId: string, email: string): Promise<unknown>;
  getOfferByTenderAndCompany(tenderId: string, companyId: string): Promise<unknown>;
  getUser(id: string): Promise<{ email?: string | null } | undefined>;
}

function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Looks up only the facts needed, in the policy's order, and returns the grant.
 * `forFiles` enables the invitation-token grant (request files only).
 */
export async function resolveTenderReadGrant(
  tender: TenderLike & { id: string; companyId?: string | null; invitationToken?: string | null },
  viewer: TenderAccessViewer,
  storage: TenderAccessStorage,
  { forFiles = false }: { forFiles?: boolean } = {},
): Promise<TenderReadGrant | null> {
  const isOwner = !!viewer.companyId && !!tender.companyId && viewer.companyId === tender.companyId;
  if (isOwner) return "owner";
  if (tender.status === "draft") return null;
  if (tender.isMarketplace && tender.marketplaceStatus === "approved" && tender.status === "published") return "marketplace";

  let isInvited = false;
  if (INVITED_STATES.has(tender.status)) {
    if (viewer.companyId) {
      const invitations = await storage.getInvitationsByTender(tender.id);
      isInvited = invitations.some((inv) => inv.companyId === viewer.companyId);
    }
    if (!isInvited && viewer.userId) {
      const email = (await storage.getUser(viewer.userId))?.email;
      if (email) isInvited = !!(await storage.getInvitationLinkByTenderAndEmail(tender.id, email));
    }
  }
  const hasOffer = !isInvited && !!viewer.companyId && OFFER_HOLDER_STATES.has(tender.status)
    ? !!(await storage.getOfferByTenderAndCompany(tender.id, viewer.companyId))
    : false;
  const presentedInvitationToken = forFiles && !!viewer.userId && !!viewer.invitationToken && !!tender.invitationToken
    && sameToken(viewer.invitationToken, tender.invitationToken);

  return tenderReadGrant(tender, { isOwner, isInvited, hasOffer, presentedInvitationToken });
}

// ── Who may submit an offer (S7) ──────────────────────────────────────────────
// Reading a request is not permission to bid on it, and submitting must not be
// how a company gets read access. A company may submit to a published request
// only on explicit evidence:
//
//   approved marketplace request        any (other) company
//   invited                             a company invitation row, or an email
//                                        invitation for the signed-in user
//   invitation link                     the request's own token, presented in
//                                        X-Invitation-Token (a raw tender id is not one)
//   authorized resubmission             the requester allowed this company to resubmit
//   the requester's own company         never (self-submission)
//
// Role (viewers may not submit), verification, deadline, audience and
// published state are checked by the route as before.

export type SubmissionBasis = "marketplace" | "invited" | "invitation_link" | "resubmission";
export type SubmissionEligibility =
  | { ok: true; basis: SubmissionBasis }
  | { ok: false; code: "SELF_SUBMISSION" | "NOT_PUBLISHED" | "NOT_INVITED" };

export async function resolveSubmissionEligibility(
  tender: TenderLike & { id: string; companyId?: string | null; invitationToken?: string | null },
  viewer: TenderAccessViewer,
  storage: TenderAccessStorage,
): Promise<SubmissionEligibility> {
  if (viewer.companyId && tender.companyId && viewer.companyId === tender.companyId) return { ok: false, code: "SELF_SUBMISSION" };
  if (tender.status !== "published") return { ok: false, code: "NOT_PUBLISHED" };
  if (tender.isMarketplace && tender.marketplaceStatus === "approved") return { ok: true, basis: "marketplace" };

  if (viewer.companyId) {
    const invitations = await storage.getInvitationsByTender(tender.id);
    if (invitations.some((inv) => inv.companyId === viewer.companyId)) return { ok: true, basis: "invited" };
  }
  if (viewer.userId) {
    const email = (await storage.getUser(viewer.userId))?.email;
    if (email && (await storage.getInvitationLinkByTenderAndEmail(tender.id, email))) return { ok: true, basis: "invited" };
  }
  if (viewer.invitationToken && tender.invitationToken && sameToken(viewer.invitationToken, tender.invitationToken)) {
    return { ok: true, basis: "invitation_link" };
  }
  if (viewer.companyId) {
    const existing = (await storage.getOfferByTenderAndCompany(tender.id, viewer.companyId)) as { resubmissionAllowed?: boolean } | null;
    if (existing?.resubmissionAllowed) return { ok: true, basis: "resubmission" };
  }
  return { ok: false, code: "NOT_INVITED" };
}
