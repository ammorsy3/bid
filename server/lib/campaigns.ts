// Influencer campaign tracking: link building, click recording, and first-touch
// signup attribution.
//
// The write paths here are all best-effort. Nothing in this file may ever break
// a signup or a page load — if the tracking insert fails, the user still gets
// their account and the influencer just loses one data point. Every caller is
// expected to wrap accordingly, and the helpers below swallow their own errors
// rather than relying on that.

import crypto from "crypto";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  campaignAttributions,
  campaignVisits,
  marketingCampaigns,
  type AttributionPayload,
  type MarketingCampaign,
} from "@shared/schema";

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/** Lowercase, hyphenated, URL-safe. Arabic and other non-Latin input falls
 *  back to an empty string, which callers replace with a random code. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function randomCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

/** Builds a code that is not already taken, appending a suffix if needed. */
export async function uniqueCampaignCode(desired: string): Promise<string> {
  const base = slugify(desired) || `c-${randomCode()}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomCode().slice(0, 4)}`;
    const [existing] = await db
      .select({ id: marketingCampaigns.id })
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.code, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `${base}-${randomCode()}`;
}

// ---------------------------------------------------------------------------
// Link building
// ---------------------------------------------------------------------------

/**
 * The public origin to build links against. PUBLIC_APP_URL wins so the short
 * links printed in the admin UI are always the branded domain, even when the
 * request arrived at a vercel.app preview host.
 */
export function publicOrigin(req: { headers: Record<string, any>; protocol?: string }): string {
  const configured = process.env.PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  return `${proto}://${host}`;
}

/** The expanded URL a short link redirects to: landing path + UTM query. */
export function destinationUrl(origin: string, c: MarketingCampaign): string {
  const path = c.landingPath?.startsWith("/") ? c.landingPath : `/${c.landingPath || ""}`;
  const url = new URL(path, origin);
  url.searchParams.set("utm_source", c.utmSource);
  url.searchParams.set("utm_medium", c.utmMedium);
  url.searchParams.set("utm_campaign", c.utmCampaign);
  if (c.utmContent) url.searchParams.set("utm_content", c.utmContent);
  if (c.utmTerm) url.searchParams.set("utm_term", c.utmTerm);
  // Carries the campaign code through the redirect so the browser attributes
  // against the row itself rather than re-matching on UTM strings.
  url.searchParams.set("utm_id", c.code);
  return url.toString();
}

export function shortUrl(origin: string, c: MarketingCampaign): string {
  return `${origin}/r/${c.code}`;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Finds the campaign a visit belongs to. Tries the code first (short link, or
 * utm_id carried through the redirect), then falls back to matching the UTM
 * strings — which is what catches someone pasting the expanded link around.
 */
export async function resolveCampaign(input: {
  code?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
}): Promise<MarketingCampaign | null> {
  const code = input.code?.trim().toLowerCase();
  if (code) {
    const [byCode] = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.code, code))
      .limit(1);
    if (byCode) return byCode;
  }

  const utmCampaign = input.utmCampaign?.trim().toLowerCase();
  if (!utmCampaign) return null;

  const utmContent = input.utmContent?.trim().toLowerCase() || null;
  // utm_content distinguishes two influencers sharing one campaign name, so a
  // row with content set must only match a visit carrying the same content.
  const [match] = await db
    .select()
    .from(marketingCampaigns)
    .where(
      and(
        eq(marketingCampaigns.utmCampaign, utmCampaign),
        utmContent
          ? or(eq(marketingCampaigns.utmContent, utmContent), isNull(marketingCampaigns.utmContent))
          : isNull(marketingCampaigns.utmContent),
      ),
    )
    // Prefer the more specific row (content set) over the campaign-wide one.
    .orderBy(desc(marketingCampaigns.utmContent))
    .limit(1);

  return match ?? null;
}

// ---------------------------------------------------------------------------
// Visits
// ---------------------------------------------------------------------------

function ipHash(ip: string | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.JWT_SECRET || "bid-campaign-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function clientIp(req: any): string | undefined {
  const fwd = req.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || undefined;
}

/** How long before the same visitor on the same campaign counts as a new click. */
const VISIT_DEDUPE_MINUTES = 30;

export async function recordVisit(params: {
  campaignId: string | null;
  visitorId: string;
  source: "shortlink" | "landing";
  utm: Partial<Record<"utmSource" | "utmMedium" | "utmCampaign" | "utmContent" | "utmTerm", string | null>>;
  landingPath?: string | null;
  referrer?: string | null;
  req: any;
}): Promise<void> {
  try {
    // Collapse refreshes and the double-hit that a short link naturally causes
    // (the redirect logs one, then the landing page logs another).
    const since = new Date(Date.now() - VISIT_DEDUPE_MINUTES * 60_000);
    const [recent] = await db
      .select({ id: campaignVisits.id })
      .from(campaignVisits)
      .where(
        and(
          eq(campaignVisits.visitorId, params.visitorId),
          params.campaignId
            ? eq(campaignVisits.campaignId, params.campaignId)
            : isNull(campaignVisits.campaignId),
          gt(campaignVisits.createdAt, since),
        ),
      )
      .limit(1);
    if (recent) return;

    await db.insert(campaignVisits).values({
      campaignId: params.campaignId,
      visitorId: params.visitorId,
      source: params.source,
      utmSource: params.utm.utmSource ?? null,
      utmMedium: params.utm.utmMedium ?? null,
      utmCampaign: params.utm.utmCampaign ?? null,
      utmContent: params.utm.utmContent ?? null,
      utmTerm: params.utm.utmTerm ?? null,
      landingPath: params.landingPath ?? null,
      referrer: params.referrer?.slice(0, 500) ?? null,
      userAgent: (params.req.headers?.["user-agent"] as string | undefined)?.slice(0, 500) ?? null,
      country: (params.req.headers?.["x-vercel-ip-country"] as string | undefined)?.slice(0, 2) ?? null,
      ipHash: ipHash(clientIp(params.req)),
    });
  } catch (err) {
    console.error("[campaigns] recordVisit failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

/**
 * Links a brand-new user to the campaign that first sent them. Called from the
 * signup routes with whatever the browser captured on landing.
 *
 * First touch wins and is permanent: the insert does nothing if the user
 * already has a row, so a later campaign cannot steal an existing signup.
 * Silent on every failure — a signup must never fail because of tracking.
 */
export async function attributeSignup(
  userId: string,
  payload: AttributionPayload | undefined | null,
  signupMethod: "password" | "clerk",
): Promise<void> {
  if (!payload) return;
  try {
    const campaign = await resolveCampaign({
      code: payload.code,
      utmCampaign: payload.utmCampaign,
      utmContent: payload.utmContent,
    });
    if (!campaign) return;

    await db
      .insert(campaignAttributions)
      .values({
        campaignId: campaign.id,
        userId,
        visitorId: payload.visitorId,
        signupMethod,
        utmSnapshot: {
          utm_source: payload.utmSource ?? "",
          utm_medium: payload.utmMedium ?? "",
          utm_campaign: payload.utmCampaign ?? "",
          utm_content: payload.utmContent ?? "",
          utm_term: payload.utmTerm ?? "",
          landing_path: payload.landingPath ?? "",
          referrer: payload.referrer ?? "",
        },
        firstTouchAt: payload.firstTouchAt ? new Date(payload.firstTouchAt) : new Date(),
      })
      .onConflictDoNothing({ target: campaignAttributions.userId });
  } catch (err) {
    console.error("[campaigns] attributeSignup failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export interface CampaignStats {
  campaignId: string;
  clicks: number;
  visitors: number;
  signups: number;
  companiesCreated: number;
  companiesVerified: number;
  firstTenders: number;
}

/**
 * Per-campaign funnel, in one query.
 *
 * The activation half is derived, not stored: a signup counts as "company
 * created" once the attributed user owns a live membership, "verified" once
 * that company is verified, and "first tender" once they have authored one.
 * Counting DISTINCT users (not companies or tenders) keeps every column on the
 * same denominator, so the funnel can only ever narrow.
 */
export async function campaignStats(campaignId?: string): Promise<CampaignStats[]> {
  const rows = await db.execute<{
    campaign_id: string;
    clicks: string;
    visitors: string;
    signups: string;
    companies_created: string;
    companies_verified: string;
    first_tenders: string;
  }>(sql`
    WITH v AS (
      SELECT campaign_id,
             COUNT(*)::bigint                 AS clicks,
             COUNT(DISTINCT visitor_id)::bigint AS visitors
        FROM campaign_visits
       WHERE campaign_id IS NOT NULL
         ${campaignId ? sql`AND campaign_id = ${campaignId}` : sql``}
       GROUP BY campaign_id
    ),
    a AS (
      SELECT ca.campaign_id,
             COUNT(DISTINCT ca.user_id)::bigint AS signups,
             COUNT(DISTINCT uc.user_id) FILTER (WHERE uc.user_id IS NOT NULL)::bigint
               AS companies_created,
             COUNT(DISTINCT uc.user_id) FILTER (WHERE c.verification_status = 'verified')::bigint
               AS companies_verified,
             COUNT(DISTINCT t.created_by)::bigint AS first_tenders
        FROM campaign_attributions ca
        LEFT JOIN user_companies uc
               ON uc.user_id = ca.user_id AND uc.deleted_at IS NULL
        LEFT JOIN companies c
               ON c.id = uc.company_id
        LEFT JOIN tenders t
               ON t.created_by = ca.user_id
       WHERE TRUE
         ${campaignId ? sql`AND ca.campaign_id = ${campaignId}` : sql``}
       GROUP BY ca.campaign_id
    )
    SELECT mc.id AS campaign_id,
           COALESCE(v.clicks, 0)             AS clicks,
           COALESCE(v.visitors, 0)           AS visitors,
           COALESCE(a.signups, 0)            AS signups,
           COALESCE(a.companies_created, 0)  AS companies_created,
           COALESCE(a.companies_verified, 0) AS companies_verified,
           COALESCE(a.first_tenders, 0)      AS first_tenders
      FROM marketing_campaigns mc
      LEFT JOIN v ON v.campaign_id = mc.id
      LEFT JOIN a ON a.campaign_id = mc.id
     ${campaignId ? sql`WHERE mc.id = ${campaignId}` : sql``}
  `);

  return (rows.rows ?? []).map((r) => ({
    campaignId: r.campaign_id,
    clicks: Number(r.clicks),
    visitors: Number(r.visitors),
    signups: Number(r.signups),
    companiesCreated: Number(r.companies_created),
    companiesVerified: Number(r.companies_verified),
    firstTenders: Number(r.first_tenders),
  }));
}

/** Clicks that carried UTMs we don't have a campaign for — usually a typo in a
 *  link an influencer rebuilt by hand, which is worth seeing rather than losing. */
export async function unmatchedVisitSummary(): Promise<
  { utmSource: string | null; utmCampaign: string | null; utmContent: string | null; clicks: number; lastSeen: string }[]
> {
  const rows = await db.execute<{
    utm_source: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
    clicks: string;
    last_seen: string;
  }>(sql`
    SELECT utm_source, utm_campaign, utm_content,
           COUNT(*)::bigint AS clicks,
           MAX(created_at)  AS last_seen
      FROM campaign_visits
     WHERE campaign_id IS NULL
       AND (utm_source IS NOT NULL OR utm_campaign IS NOT NULL)
     GROUP BY utm_source, utm_campaign, utm_content
     ORDER BY clicks DESC
     LIMIT 20
  `);
  return (rows.rows ?? []).map((r) => ({
    utmSource: r.utm_source,
    utmCampaign: r.utm_campaign,
    utmContent: r.utm_content,
    clicks: Number(r.clicks),
    lastSeen: r.last_seen,
  }));
}
