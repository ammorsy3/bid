// Paid plans (StreamPay). Settings → Plans & Billing drives these.
//
//   GET   /api/billing                          current plan + prefilled details (any member)
//   POST  /api/billing/checkouts                open/reuse a checkout for {plan, term}   (owner/admin)
//   PATCH /api/billing/details                  auto-save one or more typed fields      (owner/admin)
//   POST  /api/billing/checkouts/:id/pay        create the StreamPay link, return its url (owner/admin)
//   POST  /api/billing/checkouts/:id/confirm    after the redirect back: re-read StreamPay
//   POST  /api/billing/portal                   StreamPay customer portal (cancel, card, invoices)
//   GET   /api/cron/billing-followups           daily Vercel cron (07:00 UTC = 10:00 Riyadh): one email per unfinished checkout
//   GET   /api/admin/billing/checkouts          every checkout attempt, for personal follow-up
//
// The webhook is registered separately (registerBillingWebhook) because it
// needs the raw request body, before express.json() runs — see server/app.ts.

import express, { type Express, type Request, type Response, type RequestHandler } from "express";
import { z } from "zod";
import { BILLING_TERMS, PAID_PLANS } from "@shared/billing-plans";
import { billingDetailsPatchSchema } from "@shared/billing-details";
import {
  BillingError,
  confirmCheckout,
  getBillingSummary,
  getCheckout,
  getCompanySubscription,
  handleWebhookEvent,
  listCheckoutsForAdmin,
  openCheckout,
  getBillingDetails,
  runCheckoutFollowups,
  saveBillingDetails,
  startPayment,
  syncCompanySubscription,
  type StreamPayWebhook,
} from "../lib/billing";
import {
  StreamPayError,
  createPortalSession,
  getStreamPayWebhookSecret,
  verifyWebhookSignature,
} from "../lib/streampay";
import { publicOrigin } from "../lib/campaigns";
import { sendCheckoutFollowupEmail } from "../email";
import { storage } from "../storage";
import type { AuthRequest } from "../middleware/auth-types";

interface MiddlewareDeps {
  authenticateToken: RequestHandler;
  requireCompanyContext: RequestHandler;
  requireCompanyRole: (minRole: "owner" | "admin" | "member" | "viewer") => RequestHandler;
  requireAdmin: RequestHandler;
}

const checkoutBodySchema = z.object({
  plan: z.enum(PAID_PLANS),
  term: z.enum(BILLING_TERMS),
});

const confirmBodySchema = z.object({
  status: z.string().max(40).optional(),
  message: z.string().max(200).optional(),
});

function sendError(res: Response, err: unknown, what: string) {
  if (err instanceof BillingError) {
    return res.status(err.status).json({ message: err.message, code: err.code, ...err.extra });
  }
  if (err instanceof z.ZodError) {
    // Field → the i18n key of the problem (see billingDetailsPatchSchema).
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) fieldErrors[String(issue.path[0] ?? "_")] = issue.message;
    return res.status(400).json({ message: "Invalid input", code: "INVALID_INPUT", fieldErrors });
  }
  if (err instanceof StreamPayError) {
    console.error(`[Billing] ${what}: StreamPay ${err.code} (${err.status}) ${err.message}`);
    if (err.code === "NOT_CONFIGURED" || err.code === "PRODUCTS_MISSING") {
      return res.status(503).json({ message: "Payments are not set up yet.", code: err.code });
    }
    return res.status(502).json({ message: "The payment provider didn't respond as expected. Please try again.", code: "PROVIDER_ERROR" });
  }
  console.error(`[Billing] ${what} failed:`, err);
  return res.status(500).json({ message: "Server error" });
}

export function registerBillingRoutes(app: Express, deps: MiddlewareDeps): void {
  const { authenticateToken, requireCompanyContext, requireCompanyRole, requireAdmin } = deps;
  const member = [authenticateToken, requireCompanyContext];
  const manager = [authenticateToken, requireCompanyContext, requireCompanyRole("admin")];

  app.get("/api/billing", ...member, async (req: AuthRequest, res) => {
    try {
      const { userId, activeCompanyId, roleInCompany } = req.auth!;
      const summary = await getBillingSummary(activeCompanyId!, userId);
      res.json({ ...summary, canManage: roleInCompany === "owner" || roleInCompany === "admin" });
    } catch (err) {
      sendError(res, err, "GET /api/billing");
    }
  });

  app.post("/api/billing/checkouts", ...manager, async (req: AuthRequest, res) => {
    try {
      const { plan, term } = checkoutBodySchema.parse(req.body);
      const { userId, activeCompanyId } = req.auth!;
      const current = await getCompanySubscription(activeCompanyId!);
      if (current && (current.status === "active" || current.status === "trialing")) {
        throw new BillingError("This workspace already has an active plan.", 409, "ALREADY_SUBSCRIBED");
      }
      const checkout = await openCheckout(activeCompanyId!, userId, plan, term);
      const details = await getBillingDetails(activeCompanyId!, userId);
      res.json({ checkoutId: checkout.id, plan: checkout.plan, term: checkout.term, details });
    } catch (err) {
      sendError(res, err, "POST /api/billing/checkouts");
    }
  });

  app.patch("/api/billing/details", ...manager, async (req: AuthRequest, res) => {
    try {
      const patch = billingDetailsPatchSchema.parse(req.body ?? {});
      const { userId, activeCompanyId } = req.auth!;
      const details = await saveBillingDetails(activeCompanyId!, userId, patch);
      res.json({ details });
    } catch (err) {
      sendError(res, err, "PATCH /api/billing/details");
    }
  });

  app.post("/api/billing/checkouts/:id/pay", ...manager, async (req: AuthRequest, res) => {
    try {
      const { userId, activeCompanyId } = req.auth!;
      const checkout = await getCheckout(String(req.params.id), activeCompanyId!);
      if (!checkout) return res.status(404).json({ message: "Checkout not found" });
      if (checkout.status === "paid") {
        throw new BillingError("This checkout is already paid.", 409, "ALREADY_PAID");
      }
      const { url } = await startPayment(checkout, userId, publicOrigin(req));
      res.json({ url });
    } catch (err) {
      sendError(res, err, "POST /api/billing/checkouts/:id/pay");
    }
  });

  app.post("/api/billing/checkouts/:id/confirm", ...member, async (req: AuthRequest, res) => {
    try {
      const { activeCompanyId } = req.auth!;
      const hint = confirmBodySchema.parse(req.body ?? {});
      const checkout = await getCheckout(String(req.params.id), activeCompanyId!);
      if (!checkout) return res.status(404).json({ message: "Checkout not found" });
      const result = await confirmCheckout(checkout, hint);
      res.json({
        status: result.checkout.status,
        failureReason: result.checkout.failureReason,
        plan: result.checkout.plan,
        term: result.checkout.term,
      });
    } catch (err) {
      sendError(res, err, "POST /api/billing/checkouts/:id/confirm");
    }
  });

  app.post("/api/billing/refresh", ...member, async (req: AuthRequest, res) => {
    try {
      await syncCompanySubscription(req.auth!.activeCompanyId!);
      res.json(await getBillingSummary(req.auth!.activeCompanyId!, req.auth!.userId));
    } catch (err) {
      sendError(res, err, "POST /api/billing/refresh");
    }
  });

  app.post("/api/billing/portal", ...manager, async (req: AuthRequest, res) => {
    try {
      const company = await storage.getCompany(req.auth!.activeCompanyId!);
      if (!company?.streampayConsumerId) {
        throw new BillingError("There's no billing account for this workspace yet.", 404, "NO_BILLING_ACCOUNT");
      }
      const sub = await getCompanySubscription(company.id);
      const session = await createPortalSession(company.streampayConsumerId, sub?.streampaySubscriptionId);
      res.json({ url: session.url });
    } catch (err) {
      sendError(res, err, "POST /api/billing/portal");
    }
  });

  // Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
  app.get("/api/cron/billing-followups", async (req: Request, res: Response) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const result = await runCheckoutFollowups(({ checkout, user, companyName }) =>
        sendCheckoutFollowupEmail({
          email: user.email,
          name: user.name,
          language: user.language === "ar" ? "ar" : "en",
          companyName,
          plan: checkout.plan as "pro" | "business",
          term: checkout.term as "monthly" | "yearly",
          failureReason: checkout.status === "failed" ? checkout.failureReason : null,
          checkoutId: checkout.id,
        }),
      );
      console.log(`[Billing] follow-ups: ${JSON.stringify(result)}`);
      res.json(result);
    } catch (err) {
      sendError(res, err, "cron billing-followups");
    }
  });

  app.get("/api/admin/billing/checkouts", authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
    try {
      res.json(await listCheckoutsForAdmin());
    } catch (err) {
      sendError(res, err, "GET /api/admin/billing/checkouts");
    }
  });
}

/**
 * POST /api/billing/streampay/webhook — StreamPay → Bid.
 * Must be registered before express.json(): the signature covers the exact
 * bytes StreamPay sent, which JSON re-serialisation would not reproduce.
 */
export function registerBillingWebhook(app: Express): void {
  app.post(
    "/api/billing/streampay/webhook",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req: Request, res: Response) => {
      const secret = getStreamPayWebhookSecret();
      if (!secret) {
        console.error("[Billing] webhook received but STREAMPAY_WEBHOOK_SECRET is not set");
        return res.status(503).json({ message: "Webhook not configured" });
      }
      const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      const verified = verifyWebhookSignature(raw, req.header("x-webhook-signature"), secret);
      if (!verified) {
        console.warn("[Billing] webhook rejected: bad or missing signature");
        return res.status(401).json({ message: "Invalid signature" });
      }

      let event: StreamPayWebhook;
      try {
        event = JSON.parse(raw.toString("utf8"));
      } catch {
        return res.status(400).json({ message: "Invalid JSON" });
      }
      if (!event?.event_type || !event?.entity_id) {
        return res.status(400).json({ message: "Missing event_type or entity_id" });
      }

      try {
        const outcome = await handleWebhookEvent(event, verified.timestamp);
        console.log(`[Billing] webhook ${event.event_type} ${event.entity_id}: ${outcome}`);
        res.json({ ok: true, outcome });
      } catch (err) {
        // Non-2xx → StreamPay retries (5m, 30m, 2h, 6h, 12h).
        console.error(`[Billing] webhook ${event.event_type} ${event.entity_id} failed:`, err);
        res.status(500).json({ message: "Processing failed" });
      }
    },
  );
}
