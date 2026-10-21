// Company creation with the files uploaded during onboarding, all or nothing
// (SEC-S4S5 r8; docs/ai/tasks/SEC-PROVENANCE-PROPOSAL.md, r6 correction).
//
// One transaction creates the company, its profile and the owner membership, and
// binds every supplied onboarding upload (documents and logo) to the new company
// (server/objectAcl.ts bindOnboardingObject: once, by its uploader, within the
// window). If ANY supplied file cannot be bound, the whole transaction rolls back
// — company, profile, membership, documents, activity rows and every binding made
// earlier in it — and the caller gets the list of fields to upload again. Nothing
// is silently dropped. Notifications and product events happen after commit, in
// the route.

import type { db as Database } from "../db";
import {
  companies,
  companyProfiles,
  userCompanies,
  companyDocuments,
  memberActivityLog,
  type Company,
  type CompanyProfile,
  type InsertCompany,
  type InsertCompanyProfile,
} from "@shared/schema";
import { bindOnboardingObject, publishCompanyObject } from "../objectAcl";

export interface OnboardingDocument {
  documentType: string;
  fileUrl: string;
  originalName?: string | null;
  label?: string | null;
}

export class OnboardingFileError extends Error {
  constructor(public readonly fields: string[]) {
    super("Some uploaded files could not be used for this company. Upload them again and retry.");
    this.name = "OnboardingFileError";
  }
}

export async function createCompanyWithOnboardingFiles(
  database: typeof Database,
  input: {
    userId: string;
    company: InsertCompany;
    profile: Omit<InsertCompanyProfile, "companyId">;
    documents: OnboardingDocument[];
    /** A private upload path to bind and publish as the logo; null when the logo is external, public-bucket or absent. */
    logoUploadPath: string | null;
  },
): Promise<{ company: Company; profile: CompanyProfile }> {
  return database.transaction(async (tx) => {
    const [company] = await tx.insert(companies).values(input.company).returning();
    const [profile] = await tx.insert(companyProfiles).values({ ...input.profile, companyId: company.id }).returning();
    await tx.insert(userCompanies).values({ userId: input.userId, companyId: company.id, roleInCompany: "owner", invitedBy: null });

    // Bind every supplied file; collect all failures so the client can name each one.
    const bound = new Set<string>();
    const failed: string[] = [];
    const bind = async (path: string, field: string) => {
      if (bound.has(path)) return;
      if (await bindOnboardingObject(tx, path, input.userId, company.id)) bound.add(path);
      else failed.push(field);
    };
    for (const d of input.documents) await bind(d.fileUrl, `documents.${d.documentType}`);
    if (input.logoUploadPath) await bind(input.logoUploadPath, "logoUrl");
    if (failed.length > 0) throw new OnboardingFileError(failed); // rolls back everything above

    for (const d of input.documents) {
      const [doc] = await tx.insert(companyDocuments).values({
        companyId: company.id,
        documentType: d.documentType,
        fileUrl: d.fileUrl,
        originalName: d.originalName || null,
        label: d.label || null,
        uploadedBy: input.userId,
      }).returning();
      await tx.insert(memberActivityLog).values({
        companyId: company.id,
        actorUserId: input.userId,
        action: "company.verification_doc_uploaded",
        targetType: "document",
        targetId: doc.id,
        summary: `Uploaded verification document: ${d.documentType}`,
        metadata: { documentType: d.documentType, originalName: d.originalName || null },
      });
    }
    if (input.logoUploadPath) await publishCompanyObject(input.logoUploadPath, company.id, tx);

    return { company, profile };
  });
}
