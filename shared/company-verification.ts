// What a company verification request must contain before it can be submitted,
// in one place so the Settings flow, the tender-creation gate and the server's
// submit endpoint all agree on "complete".
//
// Uploading a document or saving the legal details never submits anything —
// only POST /api/companies/:id/verification/submit moves a company to
// 'under_review'. See docs/ai/CURRENT_TASK.md (BID-UX-BUGFIX-20261020, package A).

export const VERIFICATION_STATUSES = ["not_verified", "under_review", "verified", "rejected"] as const;
export type VerificationStatus = typeof VERIFICATION_STATUSES[number];

export const CR_NUMBER_PATTERN = /^\d{10}$/;

/** Document types a company may upload, and which of them a request needs. */
export const VERIFICATION_DOCUMENT_TYPES = [
  "cr_certificate",
  "vat_certificate",
  "gosi_certificate",
  "national_address_certificate",
  "other",
] as const;
export type VerificationDocumentType = typeof VERIFICATION_DOCUMENT_TYPES[number];
export const REQUIRED_VERIFICATION_DOCUMENTS: readonly VerificationDocumentType[] = ["cr_certificate"];

/** File rules shown to the user and enforced by the uploader (the server caps uploads at the same size). */
export const VERIFICATION_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;
export const VERIFICATION_MAX_FILE_MB = 50;

export function isVerificationDocumentType(v: unknown): v is VerificationDocumentType {
  return typeof v === "string" && (VERIFICATION_DOCUMENT_TYPES as readonly string[]).includes(v);
}

/** A request is frozen while reviewers look at it; nothing may change underneath them. */
export function isVerificationLocked(status: string | null | undefined): boolean {
  return status === "under_review";
}

/** Only these statuses can be (re)submitted. */
export function canSubmitVerification(status: string | null | undefined): boolean {
  return status === "not_verified" || status === "rejected" || !status;
}

export type VerificationRequirement = "legalName" | "crNumber" | "city" | VerificationDocumentType;

export interface VerificationDetails {
  legalName?: string | null;
  crNumber?: string | null;
  city?: string | null;
}

/** Everything still missing, in the order the form shows it. Empty means submittable. */
export function missingVerificationItems(
  details: VerificationDetails,
  documentTypes: Iterable<string>,
): VerificationRequirement[] {
  const missing: VerificationRequirement[] = [];
  if ((details.legalName ?? "").trim().length < 2) missing.push("legalName");
  if (!CR_NUMBER_PATTERN.test((details.crNumber ?? "").trim())) missing.push("crNumber");
  if (!(details.city ?? "").trim()) missing.push("city");
  const have = new Set(documentTypes);
  for (const type of REQUIRED_VERIFICATION_DOCUMENTS) {
    if (!have.has(type)) missing.push(type);
  }
  return missing;
}

/** Only the caller's own private upload may be attached as a verification document. */
export function isUploadObjectPath(fileUrl: unknown): fileUrl is string {
  return typeof fileUrl === "string" && /^\/objects\/uploads\/[A-Za-z0-9-]+$/.test(fileUrl);
}
