// A company profile's brand fields (logoUrl) are shown to every signed-in
// user, so a managed file placed there is published. Only a file issued for
// that company may be published this way (S6 + company provenance); otherwise
// any company admin could expose someone else's private file — a proposal, a
// private request's attachment, a file from another company they belong to — by
// naming it as their logo. A colleague's upload for the same company is fine.
//
// Accepted values:
//   - empty / null: clears the field
//   - a public-bucket brand path (/objects/company-logos/..., /objects/company-headers/...,
//     /objects/profile-pictures/...): issued by the server's own upload endpoints
//   - a private upload issued for this company (/objects/uploads/<id>): accepted and published
//   - anything not under /objects/ (an external image URL): stored as before; it is
//     not a managed file and no /objects route serves it
// Any other managed path is refused; a legacy (pre-provenance) upload must be
// uploaded again. At company creation the logo is a pending onboarding upload and
// is bound instead (server/lib/company-onboarding.ts).

import { isUploadObjectPath } from "@shared/company-verification";
import type { ObjectProvenance } from "../objectAcl";
import { attachProblem } from "./object-provenance";

const PUBLIC_BRAND_PATH = /^\/objects\/(company-logos|company-headers|profile-pictures)\/[A-Za-z0-9._-]+$/;

export type BrandValueKind = "none" | "external" | "public-bucket" | "upload" | "invalid";

/** The shape of a submitted brand value, before any ownership question. */
export function classifyBrandValue(value: unknown): BrandValueKind {
  if (value === undefined || value === null || value === "") return "none";
  if (typeof value !== "string") return "invalid";
  if (!value.startsWith("/objects/")) return "external";
  if (PUBLIC_BRAND_PATH.test(value)) return "public-bucket";
  if (isUploadObjectPath(value)) return "upload";
  return "invalid";
}

export type BrandAssetCheck =
  | { ok: true; publishPath?: string }
  | { ok: false; code: "INVALID_BRAND_ASSET" | "FILE_NOT_OWNED" | "REUPLOAD_REQUIRED" };

/** For an existing company's profile: may `companyId` set this logo, and must it be published? */
export async function checkBrandAssetReference(
  value: unknown,
  companyId: string,
  getObjectProvenance: (objectPath: string) => Promise<ObjectProvenance | null>,
): Promise<BrandAssetCheck> {
  const kind = classifyBrandValue(value);
  if (kind === "invalid") return { ok: false, code: "INVALID_BRAND_ASSET" };
  if (kind !== "upload") return { ok: true };
  const problem = attachProblem(await getObjectProvenance(value as string), companyId);
  if (problem) return { ok: false, code: problem };
  return { ok: true, publishPath: value as string };
}
