// Whether a record's reference to an uploaded file counts as that record's file
// (reads), and whether a new reference may be made (writes). The only evidence
// is the file's ACL provenance, written by the server at issuance
// (server/objectAcl.ts); a reference never vouches for itself.
//
// Reads (GET /objects/*):
//   company-issued file   counts for a record of the SAME company — any member's
//                         upload, including people who have since left
//   legacy file (NULL)    counts only when the uploader authored the record
//                         (the pre-0017 rule; existing references keep working)
//   pending onboarding    counts for no record (only its uploader reads it)
//
// Writes (offer documents, request attachments/media, profile logo):
//   only a company-issued file of the writing company may be newly referenced;
//   legacy files must be uploaded again (accepted policy), pending ones are only
//   usable when their company is created.

import type { ObjectProvenance } from "../objectAcl";

export function referenceIsTrusted(
  acl: ObjectProvenance | null,
  record: { companyId: string | null | undefined; authorId: string | null | undefined },
): boolean {
  if (!acl) return false;
  if (acl.provenance === "company") return !!record.companyId && acl.ownerCompanyId === record.companyId;
  if (acl.provenance === null) return !!acl.ownerId && !!record.authorId && acl.ownerId === record.authorId;
  return false;
}

export type AttachProblem = "FILE_NOT_OWNED" | "REUPLOAD_REQUIRED";

/**
 * Why `companyId` may not newly reference this file, or null when it may.
 * `uploaderId`, when given, also requires the caller to be the uploader (offer
 * documents: a sealed bid is its submitter's own file).
 */
export function attachProblem(
  acl: ObjectProvenance | null,
  companyId: string | null | undefined,
  uploaderId?: string,
): AttachProblem | null {
  if (!acl || !companyId) return "FILE_NOT_OWNED";
  if (acl.provenance === "company") {
    if (acl.ownerCompanyId !== companyId) return "FILE_NOT_OWNED";
    if (uploaderId !== undefined && acl.ownerId !== uploaderId) return "FILE_NOT_OWNED";
    return null;
  }
  // Legacy: the caller's own old upload must be uploaded again; anyone else's is simply not theirs.
  if (acl.provenance === null && acl.ownerId && (uploaderId === undefined || acl.ownerId === uploaderId)) return "REUPLOAD_REQUIRED";
  return "FILE_NOT_OWNED";
}
