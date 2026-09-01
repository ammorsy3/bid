// Influencer campaign routes: the public short link and click beacon, plus the
// admin CRUD and reporting behind Growth → Campaigns.
//
// Two of these are deliberately unauthenticated — a click has to be countable
// before anyone signs in — so both are rate limited per IP and neither reads or
// returns anything about an existing user.

import type { Express, Request, Response, RequestHandler } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  attributionPayloadSchema,
  campaignVisits,
  createCampaignSchema,
  marketingCampaigns,
  updateCampaignSchema,
} from "@shared/schema";
import { takeToken } from "../lib/rate-limit";
import {
  campaignStats,
  clientIp,
  destinationUrl,
  publicOrigin,
  recordVisit,
  resolveCampaign,
  shortUrl,
  uniqueCampaignCode,
  unmatchedVisitSummary,
} from "../lib/campaigns";
import type { AuthRequest } from "../middleware/auth-types";

interface MiddlewareDeps {
  authenticateToken: RequestHandler;
  requireAdmin: RequestHandler;
}

export function registerMarketingRoutes(app: Express, deps: MiddlewareDeps): void {
  const { authenticateToken, requireAdmin } = deps;
  const adminGate = [authenticateToken, requireAdmin];

  // =========================================================================
  // PUBLIC
  // =========================================================================

  /**
   * GET /r/:code — the link an influencer actually posts.
   *
   * Logs the click, then 302s to the expanded UTM URL. 302 and not 301: a
   * permanent redirect would be cached by the visitor's browser forever, which
   * would both stop counting repeat clicks and make the destination
   * un-editable after the influencer has published the link — the entire
   * reason for having a short link in the first place.
   */
  app.get("/r/:code", async (req: Request, res: Response) => {
    const origin = publicOrigin(req);
    try {
      const code = String(req.params.code || "").toLowerCase().slice(0, 64);
      const campaign = await resolveCampaign({ code });

      // An unknown or retired code sends the visitor to the home page rather
      // than a 404: they clicked a link in good faith, and a dead end here is a
      // lost signup.
      if (!campaign || campaign.status === "ended") {
        return res.redirect(302, `${origin}/`);
      }

      const limit = takeToken(`shortlink:${clientIp(req) || "unknown"}`, {
        capacity: 30,
        refillPerMinute: 30,
      });

      // The visitor id is minted by the browser on the landing page; at this
      // point we have not met them yet, so the click is keyed by a
      // request-scoped id. The landing beacon that follows carries the real one
      // and is what the later signup is matched on.
      const visitorId = `sl_${(clientIp(req) || "anon").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}_${campaign.code}`;

      if (limit.allowed) {
        await recordVisit({
          campaignId: campaign.id,
          visitorId,
          source: "shortlink",
          utm: {
            utmSource: campaign.utmSource,
            utmMedium: campaign.utmMedium,
            utmCampaign: campaign.utmCampaign,
            utmContent: campaign.utmContent,
            utmTerm: campaign.utmTerm,
          },
          landingPath: campaign.landingPath,
          referrer: (req.headers.referer as string) || null,
          req,
        });
      }

      return res.redirect(302, destinationUrl(origin, campaign));
    } catch (err) {
      console.error("[marketing] short link error:", err);
      // Never leave a visitor on an error page for a tracking failure.
      return res.redirect(302, `${origin}/`);
    }
  });

  /**
   * POST /api/track/visit — the landing beacon.
   *
   * Fired by the browser when a page loads carrying UTM parameters. This is the
   * hit that owns the real visitor id, and therefore the one a later signup is
   * joined to. Always answers 204, success or not: the caller is a fire-and-
   * forget beacon and has nothing useful to do with an error.
   */
  app.post("/api/track/visit", async (req: Request, res: Response) => {
    try {
      const limit = takeToken(`track:${clientIp(req) || "unknown"}`, {
        capacity: 20,
        refillPerMinute: 20,
      });
      if (!limit.allowed) return res.status(204).end();

      const parsed = attributionPayloadSchema.safeParse(req.body);
      if (!parsed.success) return res.status(204).end();
      const p = parsed.data;

      const campaign = await resolveCampaign({
        code: p.code,
        utmCampaign: p.utmCampaign,
        utmContent: p.utmContent,
      });

      // Traffic with UTMs we don't recognise is still recorded, with a null
      // campaign, and surfaces in the "unmatched" panel. Traffic with no UTMs
      // at all is not our business and is dropped.
      if (!campaign && !p.utmCampaign && !p.utmSource) return res.status(204).end();

      await recordVisit({
        campaignId: campaign?.id ?? null,
        visitorId: p.visitorId,
        source: "landing",
        utm: {
          utmSource: p.utmSource ?? null,
          utmMedium: p.utmMedium ?? null,
          utmCampaign: p.utmCampaign ?? null,
          utmContent: p.utmContent ?? null,
          utmTerm: p.utmTerm ?? null,
        },
        landingPath: p.landingPath ?? null,
        referrer: p.referrer ?? null,
        req,
      });
      return res.status(204).end();
    } catch (err) {
      console.error("[marketing] track visit error:", err);
      return res.status(204).end();
    }
  });

  // =========================================================================
  // ADMIN
  // =========================================================================

  // GET /api/admin/campaigns — every campaign with its funnel and links.
  app.get("/api/admin/campaigns", ...adminGate, async (req: Request, res: Response) => {
    try {
      const origin = publicOrigin(req);
      const rows = await db
        .select()
        .from(marketingCampaigns)
        .orderBy(desc(marketingCampaigns.createdAt));
      const stats = await campaignStats();
      const byId = new Map(stats.map((s) => [s.campaignId, s]));

      res.json({
        campaigns: rows.map((c) => ({
          ...c,
          shortUrl: shortUrl(origin, c),
          destinationUrl: destinationUrl(origin, c),
          stats: byId.get(c.id) ?? {
            campaignId: c.id,
            clicks: 0,
            visitors: 0,
            signups: 0,
            companiesCreated: 0,
            companiesVerified: 0,
            firstTenders: 0,
          },
        })),
        unmatched: await unmatchedVisitSummary(),
      });
    } catch (err) {
      console.error("[marketing] list campaigns error:", err);
      res.status(500).json({ message: "Failed to load campaigns" });
    }
  });

  // GET /api/admin/campaigns/:id — one campaign, its funnel, who it brought in.
  app.get("/api/admin/campaigns/:id", ...adminGate, async (req: Request, res: Response) => {
    try {
      const origin = publicOrigin(req);
      const [campaign] = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.id, req.params.id))
        .limit(1);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });

      const [stats] = await campaignStats(campaign.id);

      // The people this campaign brought in, each with how far they got. The
      // milestones are computed here rather than stored, so they stay true even
      // for a user who created their company months after signing up.
      const signups = await db.execute<{
        user_id: string;
        name: string;
        email: string;
        signed_up_at: string;
        signup_method: string | null;
        company_name: string | null;
        verification_status: string | null;
        tenders_created: string;
      }>(sql`
        SELECT u.id            AS user_id,
               u.name,
               u.email,
               ca.created_at   AS signed_up_at,
               ca.signup_method,
               c.name          AS company_name,
               c.verification_status,
               (SELECT COUNT(*) FROM tenders t WHERE t.created_by = u.id)::bigint
                               AS tenders_created
          FROM campaign_attributions ca
          JOIN users u ON u.id = ca.user_id
          LEFT JOIN LATERAL (
            SELECT co.name, co.verification_status
              FROM user_companies uc
              JOIN companies co ON co.id = uc.company_id
             WHERE uc.user_id = u.id AND uc.deleted_at IS NULL
             ORDER BY uc.joined_at ASC
             LIMIT 1
          ) c ON TRUE
         WHERE ca.campaign_id = ${campaign.id}
         ORDER BY ca.created_at DESC
         LIMIT 200
      `);

      const recentVisits = await db
        .select({
          id: campaignVisits.id,
          source: campaignVisits.source,
          country: campaignVisits.country,
          referrer: campaignVisits.referrer,
          landingPath: campaignVisits.landingPath,
          createdAt: campaignVisits.createdAt,
        })
        .from(campaignVisits)
        .where(eq(campaignVisits.campaignId, campaign.id))
        .orderBy(desc(campaignVisits.createdAt))
        .limit(50);

      // Clicks per day for the last 30 days, for the sparkline.
      const daily = await db.execute<{ day: string; clicks: string }>(sql`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
               COUNT(*)::bigint AS clicks
          FROM campaign_visits
         WHERE campaign_id = ${campaign.id}
           AND created_at > now() - interval '30 days'
         GROUP BY 1
         ORDER BY 1
      `);

      res.json({
        campaign: {
          ...campaign,
          shortUrl: shortUrl(origin, campaign),
          destinationUrl: destinationUrl(origin, campaign),
        },
        stats,
        signups: (signups.rows ?? []).map((r) => ({
          userId: r.user_id,
          name: r.name,
          email: r.email,
          signedUpAt: r.signed_up_at,
          signupMethod: r.signup_method,
          companyName: r.company_name,
          verificationStatus: r.verification_status,
          tendersCreated: Number(r.tenders_created),
        })),
        recentVisits,
        daily: (daily.rows ?? []).map((r) => ({ day: r.day, clicks: Number(r.clicks) })),
      });
    } catch (err) {
      console.error("[marketing] campaign detail error:", err);
      res.status(500).json({ message: "Failed to load campaign" });
    }
  });

  // POST /api/admin/campaigns — create.
  app.post("/api/admin/campaigns", ...adminGate, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = createCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message || "Invalid campaign",
          field: parsed.error.issues[0]?.path.join("."),
        });
      }
      const d = parsed.data;

      // A code the admin typed is respected as-is; otherwise it's built from
      // the influencer handle and campaign name, which is what makes the link
      // readable in a bio ("/r/sara-launch" rather than "/r/9f2c1a").
      const desired = d.code || [d.influencerHandle || d.influencerName, d.utmCampaign].filter(Boolean).join("-");
      const code = await uniqueCampaignCode(desired || d.name);

      const [row] = await db
        .insert(marketingCampaigns)
        .values({
          code,
          name: d.name,
          influencerName: d.influencerName || null,
          influencerHandle: d.influencerHandle?.replace(/^@/, "") || null,
          platform: d.platform,
          utmSource: d.utmSource || d.platform,
          utmMedium: d.utmMedium,
          utmCampaign: d.utmCampaign,
          utmContent: d.utmContent || null,
          utmTerm: d.utmTerm || null,
          landingPath: d.landingPath.startsWith("/") ? d.landingPath : `/${d.landingPath}`,
          feeAmount: d.feeAmount ?? null,
          currency: d.currency,
          notes: d.notes || null,
          startsAt: d.startsAt ? new Date(d.startsAt) : null,
          endsAt: d.endsAt ? new Date(d.endsAt) : null,
          createdBy: req.auth?.userId ?? null,
        })
        .returning();

      const origin = publicOrigin(req);
      res.status(201).json({
        ...row,
        shortUrl: shortUrl(origin, row),
        destinationUrl: destinationUrl(origin, row),
      });
    } catch (err) {
      console.error("[marketing] create campaign error:", err);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // PATCH /api/admin/campaigns/:id — edit. The code is immutable: it is already
  // published in someone's bio, and reassigning it would silently re-point a
  // live link.
  app.patch("/api/admin/campaigns/:id", ...adminGate, async (req: Request, res: Response) => {
    try {
      const parsed = updateCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid update" });
      }
      const d = parsed.data;

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (d.name !== undefined) patch.name = d.name;
      if (d.influencerName !== undefined) patch.influencerName = d.influencerName || null;
      if (d.influencerHandle !== undefined) patch.influencerHandle = d.influencerHandle?.replace(/^@/, "") || null;
      if (d.platform !== undefined) patch.platform = d.platform;
      if (d.utmSource !== undefined) patch.utmSource = d.utmSource;
      if (d.utmMedium !== undefined) patch.utmMedium = d.utmMedium;
      if (d.utmCampaign !== undefined) patch.utmCampaign = d.utmCampaign;
      if (d.utmContent !== undefined) patch.utmContent = d.utmContent || null;
      if (d.utmTerm !== undefined) patch.utmTerm = d.utmTerm || null;
      if (d.landingPath !== undefined) {
        patch.landingPath = d.landingPath.startsWith("/") ? d.landingPath : `/${d.landingPath}`;
      }
      if (d.feeAmount !== undefined) patch.feeAmount = d.feeAmount ?? null;
      if (d.currency !== undefined) patch.currency = d.currency;
      if (d.notes !== undefined) patch.notes = d.notes || null;
      if (d.status !== undefined) patch.status = d.status;
      if (d.startsAt !== undefined) patch.startsAt = d.startsAt ? new Date(d.startsAt) : null;
      if (d.endsAt !== undefined) patch.endsAt = d.endsAt ? new Date(d.endsAt) : null;

      const [row] = await db
        .update(marketingCampaigns)
        .set(patch)
        .where(eq(marketingCampaigns.id, req.params.id))
        .returning();
      if (!row) return res.status(404).json({ message: "Campaign not found" });

      const origin = publicOrigin(req);
      res.json({ ...row, shortUrl: shortUrl(origin, row), destinationUrl: destinationUrl(origin, row) });
    } catch (err) {
      console.error("[marketing] update campaign error:", err);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  // DELETE /api/admin/campaigns/:id — only while it has no history. Once a
  // campaign has clicks or signups, deleting it would erase where real users
  // came from, so it is ended instead.
  app.delete("/api/admin/campaigns/:id", ...adminGate, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const [{ count }] = await db
        .select({ count: sql<number>`
          (SELECT COUNT(*) FROM campaign_visits WHERE campaign_id = ${id})
          + (SELECT COUNT(*) FROM campaign_attributions WHERE campaign_id = ${id})
        ` })
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.id, id));

      if (Number(count) > 0) {
        return res.status(409).json({
          message: "This campaign already has traffic. Set it to Ended instead of deleting it.",
          code: "campaign_has_traffic",
        });
      }

      const [row] = await db
        .delete(marketingCampaigns)
        .where(eq(marketingCampaigns.id, id))
        .returning({ id: marketingCampaigns.id });
      if (!row) return res.status(404).json({ message: "Campaign not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[marketing] delete campaign error:", err);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });
}
