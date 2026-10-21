// Every write that can change what a verification reviewer sees goes through
// here: legal details, verification documents, and the submit itself.
//
// Each one runs in a single transaction that first locks the company row
// (SELECT … FOR UPDATE) and only then reads the state it depends on. That lock
// is what makes the rules hold under concurrency — a transaction on its own
// does not: under READ COMMITTED two replacements could each insert their file
// and delete "the others" without ever seeing each other's row.
//
//   - Two replacements of one document slot run one after the other, so exactly
//     one file remains, and a replacement that fails rolls back leaving the
//     previous file in place.
//   - A save or an upload that started before a submit and finishes after it
//     sees 'under_review' once it gets the lock, and is refused.
//   - Submit checks completeness against the same locked rows it then submits,
//     and writes the status, the audit record and the admin notification in the
//     same transaction: all of them are committed, or none is.
//
// See docs/ai/CURRENT_TASK.md, BID-UX-BUGFIX-20261020 findings A-R1…A-R4.

import { and, desc, eq, ne } from "drizzle-orm";
import { adminNotifications, companies, companyDocuments, memberActivityLog, type Company, type CompanyDocument } from "@shared/schema";
import {
  canSubmitVerification,
  isVerificationLocked,
  missingVerificationItems,
  type VerificationDocumentType,
  type VerificationRequirement,
} from "@shared/company-verification";
import { db as defaultDb } from "../db";

type Database = typeof defaultDb;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** A refusal the route turns into a 4xx. Thrown inside the transaction, so nothing is written. */
export class VerificationError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "VerificationError";
  }
}

export const LOCKED_MESSAGE =
  "Your verification request is under review. You can make changes once the review is finished.";

/** Fields that, when changed, mean an earlier verification no longer describes this company. */
export const LEGAL_IDENTITY_FIELDS = ["legalName", "crNumber", "vatNumber"] as const;
export const VERIFICATION_DETAIL_FIELDS = ["legalName", "crNumber", "vatNumber", "city"] as const;
export type VerificationDetailField = typeof VERIFICATION_DETAIL_FIELDS[number];
export type VerificationDetailsPatch = Partial<Record<VerificationDetailField, string | null>>;

export interface AttachDocumentInput {
  companyId: string;
  userId: string;
  documentType: VerificationDocumentType;
  fileUrl: string;
  originalName: string | null;
  label: string | null;
}

export interface SubmitResult {
  verificationStatus: string;
  alreadySubmitted: boolean;
  submittedAt?: Date;
}

export interface VerificationStore {
  attachDocument(input: AttachDocumentInput): Promise<CompanyDocument>;
  /** Applies only the fields that actually change. Returns the company and whether a verification was invalidated. */
  saveDetails(companyId: string, userId: string, patch: VerificationDetailsPatch): Promise<{ company: Company; invalidated: boolean; changed: VerificationDetailField[] }>;
  submit(companyId: string, userId: string): Promise<SubmitResult>;
}

async function lockCompany(tx: Tx, companyId: string): Promise<Company> {
  const [row] = await tx.select().from(companies).where(eq(companies.id, companyId)).for("update");
  if (!row) throw new VerificationError(404, "NOT_FOUND", "Company not found");
  return row;
}

const norm = (v: string | null | undefined) => (v ?? "").trim();

export function createVerificationStore(database: Database): VerificationStore {
  return {
    async attachDocument(input) {
      return database.transaction(async (tx) => {
        const company = await lockCompany(tx, input.companyId);
        if (isVerificationLocked(company.verificationStatus)) {
          throw new VerificationError(409, "VERIFICATION_LOCKED", LOCKED_MESSAGE);
        }
        const [doc] = await tx.insert(companyDocuments).values({
          companyId: input.companyId,
          documentType: input.documentType,
          fileUrl: input.fileUrl,
          originalName: input.originalName,
          label: input.label,
          uploadedBy: input.userId,
        }).returning();
        // A replacement supersedes earlier uploads of the same slot. 'other' can hold several.
        if (input.documentType !== "other") {
          await tx.delete(companyDocuments).where(and(
            eq(companyDocuments.companyId, input.companyId),
            eq(companyDocuments.documentType, input.documentType),
            ne(companyDocuments.id, doc.id),
          ));
        }
        await tx.insert(memberActivityLog).values({
          companyId: input.companyId,
          actorUserId: input.userId,
          action: "company.verification_doc_uploaded",
          targetType: "document",
          targetId: doc.id,
          summary: `Uploaded verification document: ${input.documentType}`,
          metadata: { documentType: input.documentType, originalName: input.originalName },
        });
        return doc;
      });
    },

    async saveDetails(companyId, userId, patch) {
      return database.transaction(async (tx) => {
        const company = await lockCompany(tx, companyId);

        const changed = VERIFICATION_DETAIL_FIELDS.filter(
          (f) => patch[f] !== undefined && norm(patch[f]) !== norm(company[f]),
        );
        if (changed.length === 0) return { company, invalidated: false, changed };

        if (isVerificationLocked(company.verificationStatus)) {
          throw new VerificationError(409, "VERIFICATION_LOCKED", LOCKED_MESSAGE, { fields: changed });
        }

        const updates: Partial<Company> = { updatedAt: new Date() };
        for (const f of changed) updates[f] = norm(patch[f]) || null;

        if (updates.crNumber) {
          const [taken] = await tx.select({ id: companies.id }).from(companies)
            .where(and(eq(companies.crNumber, updates.crNumber), ne(companies.id, companyId))).limit(1);
          if (taken) throw new VerificationError(409, "CR_TAKEN", "This CR number is already registered to another workspace on Bid.");
        }

        // A verified company whose legal identity changes is no longer verified
        // — but it is not submitted either. It goes back to 'not_verified' and
        // stays editable until someone explicitly submits a new request.
        // Individuals and teams are exempt (auto-verified, no review path; Q-015).
        const identityChanged = changed.some((f) => (LEGAL_IDENTITY_FIELDS as readonly string[]).includes(f));
        const invalidated = company.accountType === "company" && company.verificationStatus === "verified" && identityChanged;
        if (invalidated) {
          updates.verificationStatus = "not_verified";
          updates.verifiedAt = null;
        }

        const [updated] = await tx.update(companies).set(updates).where(eq(companies.id, companyId)).returning();
        await tx.insert(memberActivityLog).values({
          companyId,
          actorUserId: userId,
          action: invalidated ? "company.verification_invalidated" : "company.verification_details_saved",
          targetType: "company",
          targetId: companyId,
          summary: invalidated
            ? "Changed the company's legal identity; verification removed until a new request is submitted"
            : "Saved company verification details",
          metadata: { fields: changed, previous: Object.fromEntries(changed.map((f) => [f, company[f] ?? null])) },
        });
        return { company: updated, invalidated, changed };
      });
    },

    async submit(companyId, userId) {
      return database.transaction(async (tx) => {
        const company = await lockCompany(tx, companyId);
        if (company.verificationStatus === "verified") {
          throw new VerificationError(409, "ALREADY_VERIFIED", "This company is already verified.", { verificationStatus: "verified" });
        }
        if (isVerificationLocked(company.verificationStatus)) {
          // A repeat click or a second tab: the request already exists.
          return { verificationStatus: "under_review", alreadySubmitted: true };
        }
        if (!canSubmitVerification(company.verificationStatus)) {
          throw new VerificationError(409, "NOT_SUBMITTABLE", "This request cannot be submitted right now.");
        }

        const docs = await tx.select().from(companyDocuments)
          .where(eq(companyDocuments.companyId, companyId))
          .orderBy(desc(companyDocuments.uploadedAt));
        const missing: VerificationRequirement[] = missingVerificationItems(company, docs.map((d) => d.documentType));
        if (missing.length > 0) {
          throw new VerificationError(400, "VERIFICATION_INCOMPLETE", "Complete the request before submitting it.", { missing });
        }

        const now = new Date();
        const [updated] = await tx.update(companies)
          .set({ verificationStatus: "under_review", rejectionReason: null, updatedAt: now })
          .where(eq(companies.id, companyId))
          .returning();
        // The documents as submitted, so a reviewer (or an audit) can tell exactly what was sent.
        const submittedDocuments = docs.map((d) => ({ id: d.id, documentType: d.documentType, fileUrl: d.fileUrl, originalName: d.originalName }));
        await tx.insert(memberActivityLog).values({
          companyId,
          actorUserId: userId,
          action: "company.verification_submitted",
          targetType: "company",
          targetId: companyId,
          summary: "Submitted the company verification request",
          metadata: {
            previousStatus: company.verificationStatus,
            details: { legalName: company.legalName, crNumber: company.crNumber, vatNumber: company.vatNumber, city: company.city },
            documents: submittedDocuments,
          },
        });
        // Admins learn about a request from this row. It is written in the same
        // transaction as the status, so a committed submission always has exactly
        // one notification and a rolled-back one has none.
        await tx.insert(adminNotifications).values({
          type: "company_verification",
          title: `Company awaiting verification: ${company.name}`,
          body: `${company.name} submitted a verification request and is awaiting review.`,
          severity: "info",
          link: "/admin/vendors",
          relatedId: companyId,
          metadata: { accountType: company.accountType, resubmission: company.verificationStatus === "rejected" },
        });
        return { verificationStatus: updated.verificationStatus, alreadySubmitted: false, submittedAt: now };
      });
    },
  };
}

let defaultStore: VerificationStore | null = null;
/** The store backed by the app database, created on first use. */
export function verificationStore(): VerificationStore {
  return (defaultStore ??= createVerificationStore(defaultDb));
}
