-- Remove individual Discovery.
--
-- Migration 0004 paused Discovery by setting every individual profile's
-- `discoverable` flag to false. It is not coming back, so the supporting
-- storage goes too.
--
-- Removed in code alongside this migration:
--   * GET /api/individuals/directory                  (returned 404 already)
--   * GET /api/tenders/:id/suggested-individuals      (returned 404 already)
--   * GET /api/individuals/recommended-tenders        (was still live)
--   * the marketplace "Recommended for you" strip
--   * storage.searchIndividuals
--   * storage.getSuggestedIndividualsForTender
--   * storage.getIndividualsNearingInactivityCutoff   (0 callers)
--   * sendInactivityWarningEmail                      (0 callers, no cron)
--
-- NOT removed: POST /api/vendors-base. Its comment described it as the
-- one-click connect from the directory, but it is the general "add a vendor to
-- my base" endpoint and the Vendors Base tab still calls it. Only the stale
-- comment and its 'directory' joinMethod label were corrected.
--
-- users.last_login_at is KEPT. It existed to drive the Discovery "active in the
-- last 30 days" cutoff, but last-seen data is worth having on its own.
--
-- ORDERING: apply only AFTER the code above is deployed to the environment.
-- Drizzle selects columns explicitly, so a database missing `discoverable`
-- while the running build still declares it throws on every company_profiles
-- query. Deploy first, migrate second.
--
-- Idempotent: safe to re-run.

-- Individual's opt-in to the Discovery directory.
ALTER TABLE "company_profiles"
  DROP COLUMN IF EXISTS "discoverable";

-- Tracked whether the "your profile is about to disappear from Discovery"
-- warning had been sent. Never actually set by any code path — it was only ever
-- cleared — so no information is lost.
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "inactivity_warning_sent_at";
