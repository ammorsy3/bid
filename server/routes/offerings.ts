// Vendor offerings (BID-OFFERING-CLASSIFICATION).
//
//   GET  /api/companies/:companyId/offerings                          read (any member of the ACTIVE company)
//   PUT  /api/companies/:companyId/offerings                          replace (owner/admin; completes vendor registration)
//   POST /api/companies/:companyId/vendor-registration/requester-only a company that only requests (owner/admin)
//
// Offerings are private organization data: only members of that organization
// read them, only its owner/admin change them, and nothing here is exposed by
// public profiles, company listings, invitations or search. The catalogue
// itself is not private and ships with the client bundle.
//
// The completion rule lives in server/lib/offering-store.ts. This file only
// authorises the caller and validates the request shape; no client-supplied
// status, company ID or role is trusted.

import type { Express, RequestHandler, Response } from "express";
import { saveOfferingsSchema } from "@shared/offering-catalogue/selection";
import { z } from "zod";
import { storage } from "../storage";
import { OfferingError, offeringStore as defaultStore, type OfferingState, type OfferingStore } from "../lib/offering-store";
import type { AuthRequest } from "../middleware/auth-types";

interface Deps {
  authenticateToken: RequestHandler;
  requireCompanyContext: RequestHandler;
  store?: () => OfferingStore;
}

const EDITOR_ROLES = new Set(["owner", "admin"]);

/** The caller's live role in :companyId, which must be their ACTIVE company. Answers and returns null otherwise. */
async function memberRole(req: AuthRequest, res: Response): Promise<string | null> {
  const { companyId } = req.params;
  if (companyId !== req.auth!.activeCompanyId) {
    res.status(403).json({ code: "WRONG_WORKSPACE", message: "Switch to this organization to see its offerings." });
    return null;
  }
  const role = await storage.getUserRoleInCompany(req.auth!.userId, companyId);
  if (!role) {
    res.status(403).json({ code: "NOT_A_MEMBER", message: "You are not a member of this organization." });
    return null;
  }
  return role;
}

function view(state: OfferingState, role: string) {
  return {
    status: state.status,
    revision: state.revision,
    catalogueVersion: state.catalogueVersion,
    registeredAt: state.registeredAt,
    updatedAt: state.updatedAt,
    groups: state.selection.groups,
    canEdit: EDITOR_ROLES.has(role),
  };
}

function sendError(res: Response, err: unknown, what: string) {
  if (err instanceof OfferingError) return res.status(err.status).json({ code: err.code, message: err.message, ...err.extra });
  if (err instanceof z.ZodError) return res.status(400).json({ code: "INVALID_REQUEST", message: "Invalid offerings data" });
  console.error(`offerings ${what} failed`, err);
  // Nothing was saved: every write runs in one transaction.
  return res.status(500).json({ code: "SAVE_FAILED", message: "Your offerings were not saved. Try again." });
}

export function registerOfferingRoutes(app: Express, { authenticateToken, requireCompanyContext, store = defaultStore }: Deps) {
  app.get("/api/companies/:companyId/offerings", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const role = await memberRole(req, res);
      if (!role) return;
      res.set("Cache-Control", "private, no-store");
      res.json(view(await store().read(req.params.companyId), role));
    } catch (err) { sendError(res, err, "read"); }
  });

  app.put("/api/companies/:companyId/offerings", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const role = await memberRole(req, res);
      if (!role) return;
      if (!EDITOR_ROLES.has(role)) {
        return res.status(403).json({ code: "ROLE_REQUIRED", message: "Only the organization owner or an admin can change its offerings." });
      }
      const body = saveOfferingsSchema.parse(req.body);
      const result = await store().save({
        companyId: req.params.companyId,
        actorId: req.auth!.userId,
        expectedRevision: body.expectedRevision,
        selection: { groups: body.groups },
        activateVendor: body.activateVendor === true,
      });
      res.set("Cache-Control", "private, no-store");
      res.json({ ...view(result.state, role), changed: result.changed, completedRegistration: result.completedRegistration });
      if (result.completedRegistration) {
        // After commit; carries no selections.
        storage.logProductEvent({ eventType: "vendor_registration_completed", companyId: req.params.companyId, userId: req.auth!.userId, metadata: {} })
          .catch((e) => console.error("product event failed", e));
      }
    } catch (err) { sendError(res, err, "save"); }
  });

  app.post("/api/companies/:companyId/vendor-registration/requester-only", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const role = await memberRole(req, res);
      if (!role) return;
      if (!EDITOR_ROLES.has(role)) {
        return res.status(403).json({ code: "ROLE_REQUIRED", message: "Only the organization owner or an admin can change this." });
      }
      const body = z.object({ expectedRevision: z.number().int().min(0) }).strict().parse(req.body);
      const state = await store().declareRequesterOnly({ companyId: req.params.companyId, actorId: req.auth!.userId, expectedRevision: body.expectedRevision });
      res.set("Cache-Control", "private, no-store");
      res.json(view(state, role));
    } catch (err) { sendError(res, err, "requester-only"); }
  });
}
