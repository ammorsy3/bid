// "Get a personalized Bid Tour": the public /contact-sales form and the admin
// list behind Admin → Growth → Contact sales.
//
// The POST is unauthenticated, so it is rate limited per IP, validated hard,
// and carries a hidden honeypot field that real visitors never fill in.

import type { Express, Request, Response, RequestHandler } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { CONTACT_SALES_STATUSES, CONTACT_SALES_TEAM_SIZES, contactSalesLeads } from "@shared/schema";
import { takeToken } from "../lib/rate-limit";
import { clientIp } from "../lib/client-ip";
import { publicOrigin } from "../lib/campaigns";
import { sendContactSalesNotification } from "../email";

interface Deps {
  authenticateToken: RequestHandler;
  requireAdmin: RequestHandler;
}

const leadSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  teamSize: z.enum(CONTACT_SALES_TEAM_SIZES).optional(),
  message: z.string().trim().max(2000).optional(),
  language: z.enum(["en", "ar"]).default("en"),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().max(200).optional(),
});

const statusSchema = z.object({ status: z.enum(CONTACT_SALES_STATUSES) });

export function registerContactSalesRoutes(app: Express, deps: Deps): void {
  const { authenticateToken, requireAdmin } = deps;

  app.post("/api/contact-sales", async (req: Request, res: Response) => {
    const limit = takeToken(`contact-sales:${clientIp(req)}`, { capacity: 5, refillPerMinute: 0.5 });
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSeconds));
      return res.status(429).json({ message: "Too many requests. Please try again later.", code: "RATE_LIMITED" });
    }

    const parsed = leadSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "_")] = issue.message;
      return res.status(400).json({ message: "Invalid input", code: "INVALID_INPUT", fieldErrors });
    }
    const { website, ...lead } = parsed.data;
    // A bot filled the hidden field: pretend it worked, save nothing.
    if (website && website.trim() !== "") return res.status(201).json({ ok: true });

    try {
      await db.insert(contactSalesLeads).values({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        teamSize: lead.teamSize ?? null,
        message: lead.message || null,
        language: lead.language,
      });
    } catch (err) {
      console.error("[ContactSales] failed to save lead:", err instanceof Error ? err.message : err);
      return res.status(500).json({ message: "Server error" });
    }

    // The lead is saved; a failed email must not turn into a failed form.
    sendContactSalesNotification({ ...lead, appBaseUrl: publicOrigin(req) })
      .catch((err) => console.error("[ContactSales] notification failed:", err instanceof Error ? err.message : err));

    res.status(201).json({ ok: true });
  });

  app.get("/api/admin/contact-sales", authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(contactSalesLeads).orderBy(desc(contactSalesLeads.createdAt)).limit(500);
      res.json(rows);
    } catch (err) {
      console.error("[ContactSales] list failed:", err instanceof Error ? err.message : err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/admin/contact-sales/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const parsed = statusSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Invalid status" });
    try {
      const [row] = await db
        .update(contactSalesLeads)
        .set({ status: parsed.data.status })
        .where(eq(contactSalesLeads.id, String(req.params.id)))
        .returning();
      if (!row) return res.status(404).json({ message: "Lead not found" });
      res.json(row);
    } catch (err) {
      console.error("[ContactSales] update failed:", err instanceof Error ? err.message : err);
      res.status(500).json({ message: "Server error" });
    }
  });
}
