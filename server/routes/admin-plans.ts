// Admin plan management (BID-UX-BUGFIX item 7, package D-PLANS).
//
//   GET  /api/admin/companies/:companyId/plan                 verification, subscription, grant, effective plan
//   PUT  /api/admin/companies/:companyId/plan-grant           give or change an administrative plan
//   POST /api/admin/companies/:companyId/plan-grant/revoke    end the administrative plan
//
// Platform admins only (checked here on every route, not in the UI). The body
// repeats the company id (confirmCompanyId) and the grant the admin saw
// (expectedGrantId), so a request can neither land on another company nor
// overwrite a change it did not see. Every change is audited in
// server/lib/plan-grants.ts.

import type { Express, RequestHandler, Response } from "express";
import { setPlanGrantSchema, revokePlanGrantSchema, effectiveTier, planSource, isGrantActive } from "@shared/plan-grants";
import type { PlanTier } from "@shared/entitlements";
import { storage } from "../storage";
import { getCompanySubscription, isLiveSubscription } from "../lib/billing";
import { planGrants as defaultStore, PlanGrantError, type PlanGrantStore } from "../lib/plan-grants";
import type { AuthRequest } from "../middleware/auth-types";

interface Deps {
  authenticateToken: RequestHandler;
  store?: PlanGrantStore;
}

const requirePlatformAdmin: RequestHandler = (req, res, next) => {
  if (!(req as AuthRequest).auth?.isAdmin) return res.status(403).json({ message: "Admin access required", code: "ADMIN_REQUIRED" });
  next();
};

function sendError(res: Response, err: unknown, what: string) {
  if (err instanceof PlanGrantError) return res.status(err.status).json({ message: err.message, code: err.code });
  if ((err as { name?: string })?.name === "ZodError") return res.status(400).json({ message: "Invalid plan change", code: "INVALID_INPUT" });
  console.error(`[AdminPlans] ${what}:`, err);
  res.status(500).json({ message: "Server error" });
}

export function registerAdminPlanRoutes(app: Express, { authenticateToken, store = defaultStore }: Deps) {
  async function planView(companyId: string) {
    const company = await storage.getCompany(companyId);
    if (!company || company.deletedAt) return null;
    const [sub, grant, history] = await Promise.all([getCompanySubscription(companyId), store.current(companyId), store.history(companyId)]);
    const live = isLiveSubscription(sub);
    const paidTier: PlanTier = live && sub ? (sub.plan as PlanTier) : "free";
    return {
      company: { id: company.id, name: company.name, accountType: company.accountType, verificationStatus: company.verificationStatus },
      subscription: sub ? { plan: sub.plan, term: sub.term, status: sub.status, live, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd } : null,
      grant: grant ? { ...grant, active: isGrantActive(grant) } : null,
      effectiveTier: company.accountType === "company" ? effectiveTier(paidTier, grant) : null,
      planSource: company.accountType === "company" ? planSource(paidTier, grant) : null,
      history,
    };
  }

  app.get("/api/admin/companies/:companyId/plan", authenticateToken, requirePlatformAdmin, async (req, res) => {
    try {
      const view = await planView(req.params.companyId);
      if (!view) return res.status(404).json({ message: "Company not found", code: "NOT_FOUND" });
      res.json(view);
    } catch (err) { sendError(res, err, "read plan"); }
  });

  app.put("/api/admin/companies/:companyId/plan-grant", authenticateToken, requirePlatformAdmin, async (req: AuthRequest, res) => {
    try {
      const body = setPlanGrantSchema.parse(req.body);
      if (body.confirmCompanyId !== req.params.companyId) {
        return res.status(400).json({ message: "The confirmed company does not match the target.", code: "TARGET_MISMATCH" });
      }
      await store.set({ companyId: req.params.companyId, actorId: req.auth!.userId, plan: body.plan, duration: body.duration, reason: body.reason, expectedGrantId: body.expectedGrantId });
      res.json(await planView(req.params.companyId));
    } catch (err) { sendError(res, err, "set grant"); }
  });

  app.post("/api/admin/companies/:companyId/plan-grant/revoke", authenticateToken, requirePlatformAdmin, async (req: AuthRequest, res) => {
    try {
      const body = revokePlanGrantSchema.parse(req.body);
      if (body.confirmCompanyId !== req.params.companyId) {
        return res.status(400).json({ message: "The confirmed company does not match the target.", code: "TARGET_MISMATCH" });
      }
      await store.revoke({ companyId: req.params.companyId, actorId: req.auth!.userId, reason: body.reason, expectedGrantId: body.expectedGrantId });
      res.json(await planView(req.params.companyId));
    } catch (err) { sendError(res, err, "revoke grant"); }
  });
}
