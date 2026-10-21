// An offer's document fields must point at a file issued for the offering
// company and uploaded by the submitter (S5 + company provenance). Without this,
// a vendor could name any stored object — a competitor's sealed bid, another
// request's attachment, a file from another company it belongs to — in its offer
// and then read it through the offer-file rule in GET /objects/*.
//
// A canonical private-upload path is required; provenance comes from the ACL row
// written at issuance (server/objectAcl.ts, server/lib/object-provenance.ts). A
// legacy (pre-provenance) file must be uploaded again. An empty value means "not
// provided" (the offer form sends "" for unused fields). videoUrl is an external
// link, not a managed upload, and is not checked here.

import { isUploadObjectPath } from "@shared/company-verification";
import type { ObjectProvenance } from "../objectAcl";
import { attachProblem } from "./object-provenance";

export const OFFER_FILE_FIELDS = ["technicalFileUrl", "financialFileUrl", "combinedFileUrl"] as const;
export type OfferFileField = (typeof OFFER_FILE_FIELDS)[number];

export type OfferFileProblem = {
  field: OfferFileField;
  code: "INVALID_FILE_REFERENCE" | "FILE_NOT_OWNED" | "REUPLOAD_REQUIRED";
};

/** The first problem with the offer's file references, or null when all are the submitter's company-issued uploads. */
export async function findOfferFileProblem(
  offer: Partial<Record<OfferFileField, string | null>>,
  submitter: { userId: string; companyId: string },
  getObjectProvenance: (objectPath: string) => Promise<ObjectProvenance | null>,
): Promise<OfferFileProblem | null> {
  for (const field of OFFER_FILE_FIELDS) {
    const value = offer[field];
    if (value === undefined || value === null || value === "") continue;
    if (!isUploadObjectPath(value)) return { field, code: "INVALID_FILE_REFERENCE" };
    const problem = attachProblem(await getObjectProvenance(value), submitter.companyId, submitter.userId);
    if (problem) return { field, code: problem };
  }
  return null;
}
