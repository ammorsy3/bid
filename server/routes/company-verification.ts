// Company verification request (package A of BID-UX-BUGFIX-20261020).
//
//   PATCH /api/companies/:companyId/verify-info              save legal details (draft; owner/admin)
//   POST  /api/companies/:companyId/documents                attach an uploaded document (draft; owner/admin)
//   POST  /api/companies/:companyId/verification/submit      submit the request for review (owner/admin)
//
// Saving details or uploading a document never submits anything. Only the
// submit endpoint moves a company to 'under_review', and only when the request
// is complete (shared/company-verification.ts). The state checks and the writes
// happen together under a row lock in server/lib/company-verification-store.ts;
// this file only authorises the caller and validates input.
//
// Reading stays where it was in server/routes.ts (GET verify-info, GET documents),
// and the object handler there grants company members and platform admins read
// access to the files.

import type { Express, Response, RequestHandler } from "express";
import { verifyCompanySchema } from "@shared/schema";
import { isUploadObjectPath, isVerificationDocumentType } from "@shared/company-verification";
import { storage } from "../storage";
import { getObjectProvenance } from "../objectAcl";
import { attachProblem } from "../lib/object-provenance";
import { VerificationError, verificationStore } from "../lib/company-verification-store";
import type { AuthRequest } from "../middleware/auth-types";

interface Middleware {
  authenticateToken: RequestHandler;
  requireCompanyContext: RequestHandler;
}

const MANAGER_ROLES = new Set(["owner", "admin"]);

/**
 * The caller may manage verification for :companyId — it is their ACTIVE
 * company, a company workspace, and they are its owner or admin. Answers the
 * request and returns null otherwise.
 */
async function loadManagedCompany(req: AuthRequest, res: Response) {
  const { companyId } = req.params;
  if (companyId !== req.auth!.activeCompanyId) {
    res.status(403).json({ message: "Switch to this company to manage its verification." });
    return null;
  }
  const role = await storage.getUserRoleInCompany(req.auth!.userId, companyId);
  if (!role || !MANAGER_ROLES.has(role)) {
    res.status(403).json({ code: "ROLE_REQUIRED", message: "Only the company owner or an admin can manage verification." });
    return null;
  }
  const company = await storage.getCompany(companyId);
  if (!company) {
    res.status(404).json({ message: "Company not found" });
    return null;
  }
  if (company.accountType !== "company") {
    res.status(400).json({ code: "NOT_A_COMPANY", message: "Only company workspaces are verified." });
    return null;
  }
  return company;
}

/** Answers a VerificationError (nothing was written). Returns false for anything else. */
export function sendVerificationError(res: Response, err: unknown): boolean {
  if (!(err instanceof VerificationError)) return false;
  res.status(err.status).json({ code: err.code, message: err.message, ...err.extra });
  return true;
}

function uniqueViolation(res: Response, error: any): boolean {
  if (error?.code !== "23505") return false;
  const constraint = error?.constraint || "";
  if (constraint.includes("vat_number")) {
    res.status(409).json({ code: "VAT_TAKEN", message: "This VAT number is already registered to another workspace." });
    return true;
  }
  if (constraint.includes("cr_number")) {
    res.status(409).json({ code: "CR_TAKEN", message: "This CR number is already registered to another workspace." });
    return true;
  }
  return false;
}

export function registerCompanyVerificationRoutes(app: Express, mw: Middleware) {
  const { authenticateToken, requireCompanyContext } = mw;

  app.patch("/api/companies/:companyId/verify-info", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const company = await loadManagedCompany(req, res);
      if (!company) return;

      const parsed = verifyCompanySchema.safeParse(req.body);
      if (!parsed.success) {
        const first = parsed.error.errors[0];
        return res.status(400).json({
          message: first ? `${first.path.join(".")}: ${first.message}` : "Invalid verification data",
          errors: parsed.error.errors,
        });
      }
      const data = parsed.data;
      const { company: updated, invalidated } = await verificationStore().saveDetails(company.id, req.auth!.userId, {
        legalName: data.legalName,
        crNumber: data.crNumber,
        vatNumber: data.vatNumber ?? "",
        city: data.city,
      });
      res.json({
        invalidated,
        company: {
          id: updated.id,
          legalName: updated.legalName,
          crNumber: updated.crNumber,
          vatNumber: updated.vatNumber,
          city: updated.city,
          verificationStatus: updated.verificationStatus,
        },
      });
    } catch (error: any) {
      if (sendVerificationError(res, error) || uniqueViolation(res, error)) return;
      console.error("Update verification info error:", error);
      res.status(500).json({ code: "SAVE_FAILED", message: "Failed to save verification details" });
    }
  });

  app.post("/api/companies/:companyId/documents", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const company = await loadManagedCompany(req, res);
      if (!company) return;

      const { documentType, fileUrl, originalName, label } = req.body ?? {};
      if (!isVerificationDocumentType(documentType)) {
        return res.status(400).json({ message: "Invalid document type" });
      }
      // Only a private upload issued for THIS company and uploaded by the caller
      // (company provenance, migrations/0017). Attaching any other object path —
      // including the caller's own upload for another company they belong to —
      // would make it readable by this company's members and platform admins
      // through the verification-document rule in the object handler. A legacy
      // (pre-provenance) file must be uploaded again.
      if (!isUploadObjectPath(fileUrl) || attachProblem(await getObjectProvenance(fileUrl), company.id, req.auth!.userId)) {
        return res.status(400).json({ code: "INVALID_FILE", message: "Upload the file again, then attach it." });
      }

      const doc = await verificationStore().attachDocument({
        companyId: company.id,
        userId: req.auth!.userId,
        documentType,
        fileUrl,
        originalName: typeof originalName === "string" ? originalName.slice(0, 255) : null,
        label: typeof label === "string" ? label.slice(0, 120) : null,
      });
      res.status(201).json(doc);
    } catch (error) {
      if (sendVerificationError(res, error)) return;
      console.error("Create company document error:", error);
      res.status(500).json({ code: "ATTACH_FAILED", message: "Failed to save the document. Your previous file, if any, is unchanged." });
    }
  });

  app.post("/api/companies/:companyId/verification/submit", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const company = await loadManagedCompany(req, res);
      if (!company) return;
      const result = await verificationStore().submit(company.id, req.auth!.userId);
      res.json(result);
    } catch (error) {
      if (sendVerificationError(res, error)) return;
      // The transaction rolled back: status, audit record and notification were
      // all discarded, so "not submitted" is the truth and a retry is safe.
      console.error("Submit verification error:", error);
      res.status(500).json({ code: "SUBMIT_FAILED", message: "Your request was not submitted. Please try again." });
    }
  });
}
