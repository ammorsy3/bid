-- 0015: plan limits (entitlements) and who keeps what they already use.
--
-- Free company workspaces now have limits (3 tenders, one seat, no marketplace,
-- AI builder, own templates, in-app Q&A, Traction Link, AI ranking, API — see
-- shared/entitlements.ts). Anything a free company already uses keeps working;
-- only NEW use needs the plan. Per-item things (an existing tender's Q&A or
-- marketplace listing, an existing template) are grandfathered by simply
-- existing. Three things are per-company switches rather than items, so they are
-- stamped here, once, from today's usage:
--
--   traction   the company already has a Traction Link
--   api        the company already has an active API key
--   aiBuilder  the company has an unfinished AI-copilot draft (no tender made
--              from it yet), so a draft in progress can still be finished
--
-- Nothing ever adds to this column after this backfill — a free company cannot
-- unlock a feature by using it later. Additive only; safe to re-run (the
-- backfill only ever adds values, and only where missing).
-- Must be applied to BOTH databases — run scripts/which-db.sh first.

BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS grandfathered_features text[] NOT NULL DEFAULT '{}';

UPDATE companies c
   SET grandfathered_features = array_append(c.grandfathered_features, 'traction')
 WHERE c.account_type = 'company'
   AND NOT ('traction' = ANY (c.grandfathered_features))
   AND EXISTS (SELECT 1 FROM company_profiles p WHERE p.company_id = c.id AND p.traction_slug IS NOT NULL);

UPDATE companies c
   SET grandfathered_features = array_append(c.grandfathered_features, 'api')
 WHERE c.account_type = 'company'
   AND NOT ('api' = ANY (c.grandfathered_features))
   AND EXISTS (SELECT 1 FROM api_keys k WHERE k.company_id = c.id AND k.revoked_at IS NULL);

UPDATE companies c
   SET grandfathered_features = array_append(c.grandfathered_features, 'aiBuilder')
 WHERE c.account_type = 'company'
   AND NOT ('aiBuilder' = ANY (c.grandfathered_features))
   AND EXISTS (SELECT 1 FROM ai_chat_sessions s WHERE s.company_id = c.id AND s.tender_id IS NULL);

COMMIT;

-- ── Runbook ──────────────────────────────────────────────────────────────────
-- 0. ./scripts/which-db.sh
-- 1. Dev:   psql "$DATABASE_URL"      -f migrations/0015_entitlements.sql
-- 2. Prod:  psql "$PROD_DATABASE_URL" -f migrations/0015_entitlements.sql
-- 3. Verify on each:
--      SELECT unnest(grandfathered_features) f, count(*) FROM companies GROUP BY 1;
