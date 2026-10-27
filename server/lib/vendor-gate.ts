// Vendor capabilities (submitting offers, pricing an itemized request) need a
// completed vendor registration — at least one effective offering
// (server/lib/offering-store.ts). This is registration completeness only: it is
// NOT verification, prequalification or permission to bid; those checks stay
// where they are and still apply.
//
// Organizations that predate classification (legacy_unclassified) are not
// blocked: existing vendors keep their access while they are asked to classify.

import type { Response, NextFunction } from "express";
import type { VendorRegistrationStatus } from "@shared/schema";
import type { AuthRequest } from "../middleware/auth-types";
import { offeringStore, VENDOR_BLOCKED_STATUSES } from "./offering-store";

export type VendorStatusLookup = (companyId: string) => Promise<VendorRegistrationStatus>;

export const defaultVendorStatus: VendorStatusLookup = (companyId) => offeringStore().status(companyId);

export const VENDOR_REGISTRATION_REQUIRED = "VENDOR_REGISTRATION_REQUIRED";

export async function vendorRegistrationBlock(companyId: string, lookup: VendorStatusLookup = defaultVendorStatus) {
  const status = await lookup(companyId);
  return VENDOR_BLOCKED_STATUSES.has(status) ? { code: VENDOR_REGISTRATION_REQUIRED, vendorRegistrationStatus: status } : null;
}

export function sendVendorRegistrationRequired(res: Response, block: { vendorRegistrationStatus: VendorRegistrationStatus }) {
  return res.status(403).json({
    code: VENDOR_REGISTRATION_REQUIRED,
    vendorRegistrationStatus: block.vendorRegistrationStatus,
    message: block.vendorRegistrationStatus === "requester_only"
      ? "Your company is registered as a requester only. Add the services or products it offers to submit proposals."
      : "Complete your vendor registration by adding at least one service or product your organization offers.",
  });
}

/** Express guard for the active company. */
export function requireVendorRegistration(lookup: VendorStatusLookup = defaultVendorStatus) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.auth?.activeCompanyId;
      if (!companyId) return res.status(403).json({ message: "Company access required" });
      const block = await vendorRegistrationBlock(companyId, lookup);
      if (block) return sendVendorRegistrationRequired(res, block);
      next();
    } catch (err) {
      console.error("vendor registration check failed", err);
      res.status(500).json({ message: "Could not check your vendor registration. Try again." });
    }
  };
}
