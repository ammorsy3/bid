// The requester's "new proposal" email, one policy for every submission path
// (legacy offers and itemized offers, PB-5). Called only after the offer is
// committed, never for a replayed (idempotent) submission. Never throws: a
// failed email is logged and does not affect the submission.
//
// Policy (unchanged from the legacy route): the 1st proposal, then every 5th;
// owners and admins of the requesting company, filtered by their
// 'new_proposal' email preference.

import { storage } from "../storage";
import { sendNewOfferNotification } from "../email";

export interface ProposalNotice {
  tender: { id: string; title: string | null; companyId: string | null };
  vendorCompanyId: string;
  vendorCompanyName: string;
  submittedAt: Date;
}

export type NoticeResult = "sent" | "skipped" | "failed";

export async function notifyRequesterOfProposal(n: ProposalNotice): Promise<NoticeResult> {
  try {
    if (!n.tender.companyId) return "skipped";
    const proposalCount = (await storage.getOffersByTender(n.tender.id)).length;
    if (proposalCount !== 1 && proposalCount % 5 !== 0) return "skipped";

    const members = await storage.getCompanyMembers(n.tender.companyId);
    const recipientsAll = members
      .filter((m) => (m.roleInCompany === "owner" || m.roleInCompany === "admin") && m.user.email)
      .map((m) => ({ userId: m.user.id, email: m.user.email, name: m.user.name || undefined, language: (m.user.language || "en") as "en" | "ar" }));
    const recipients = await storage.filterRecipientsByPreference(recipientsAll, n.tender.companyId, "new_proposal", "email");

    // The display name is best effort: a failed profile lookup still sends (PB-5-R1).
    const vendorProfile = await storage.getCompanyProfile(n.vendorCompanyId).catch((err) => {
      console.error("[Email] vendor profile lookup failed; using the company name:", err);
      return null;
    });
    await sendNewOfferNotification({
      tenderTitle: n.tender.title || "Untitled Tender",
      tenderId: n.tender.id,
      vendorCompanyName: vendorProfile?.displayName || n.vendorCompanyName,
      submittedAt: n.submittedAt,
      proposalCount,
      recipients,
    });
    return "sent";
  } catch (err) {
    console.error("[Email] New offer notification failed:", err);
    return "failed";
  }
}
