// Offer documents read for AI proposal analysis (NF-2, SEC-PO-AUTHZ-R1).
//
// The analysis reads the offer's files on the server and sends their text to the
// AI provider, so it is a read like GET /objects/*: a file is read only when the
// offer's reference to it is trusted (server/lib/object-provenance.ts) — a
// company-issued file of the offering company, or a legacy file its uploader
// attached. An offer row that names another party's file (written before offer
// files were checked on submission, or forged directly) gets that file skipped
// before anything is fetched, and the analysis is told it was withheld.

import { isUploadObjectPath } from "@shared/company-verification";
import type { ObjectProvenance } from "../objectAcl";
import { referenceIsTrusted } from "./object-provenance";

const SECTIONS = [
  ["combinedFileUrl", "PROPOSAL DOCUMENT"],
  ["technicalFileUrl", "TECHNICAL PROPOSAL"],
  ["financialFileUrl", "FINANCIAL PROPOSAL"],
] as const;

export type OfferTextField = (typeof SECTIONS)[number][0];

type OfferFiles = { companyId: string | null; createdBy: string | null } & Partial<Record<OfferTextField, string | null>>;

export async function trustedOfferProposalText(
  offer: OfferFiles,
  deps: {
    getObjectProvenance: (objectPath: string) => Promise<ObjectProvenance | null>;
    extract: (objectPath: string) => Promise<string>;
  },
): Promise<{ text: string; withheld: OfferTextField[] }> {
  let text = "";
  const withheld: OfferTextField[] = [];
  for (const [field, label] of SECTIONS) {
    const url = offer[field];
    if (!url) continue;
    const trusted = isUploadObjectPath(url)
      && referenceIsTrusted(await deps.getObjectProvenance(url), { companyId: offer.companyId, authorId: offer.createdBy });
    if (!trusted) {
      withheld.push(field);
      text += `\n--- ${label}: withheld (the file could not be verified as this vendor's upload) ---`;
      continue;
    }
    const t = await deps.extract(url);
    if (t) text += `\n--- ${label} ---\n${t}`;
  }
  return { text, withheld };
}
