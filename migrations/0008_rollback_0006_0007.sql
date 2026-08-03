-- ROLLBACK of 0006_drop_national_id.sql and 0007_remove_discovery.sql.
--
-- Both were applied to the database behind $DATABASE_URL on the assumption that
-- it was a dev-only database and that $PROD_DATABASE_URL was production. That
-- was wrong: the Vercel production deployment reads DATABASE_URL and points at
-- this same database. Dropping the columns took www.bidapp.sa's login down with
-- `42703 column "inactivity_warning_sent_at" does not exist`, because the
-- deployed build still selects them.
--
-- This restores the schema so the currently-deployed code works again. Re-apply
-- 0006 and 0007 ONLY after the new code is live.

-- users.inactivity_warning_sent_at — no data loss. No code path ever set this
-- column; it was only ever cleared to NULL and read. Every row was NULL.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "inactivity_warning_sent_at" timestamp;

-- company_profiles.discoverable — reconstructed, not recovered. The original
-- column was `boolean NOT NULL DEFAULT true`, and migration 0004 set it false
-- for every individual workspace. Recreating with that default and re-applying
-- 0004's UPDATE reproduces the same state, since nothing else ever wrote it
-- (routes.ts force-wrote false for individuals, true was the default elsewhere).
ALTER TABLE "company_profiles"
  ADD COLUMN IF NOT EXISTS "discoverable" boolean NOT NULL DEFAULT true;

UPDATE "company_profiles"
SET "discoverable" = false
WHERE "company_id" IN (
  SELECT "id" FROM "companies" WHERE "account_type" = 'individual'
);

-- companies.national_id_number — column restored, VALUES ARE NOT RECOVERABLE.
-- 6 rows held a national ID before 0006 ran. DROP COLUMN destroyed them; there
-- is no undo without a point-in-time restore. The column comes back as all-NULL.
-- The deployed code only ever reads it and returns it in auth payloads, so NULL
-- is serviceable — but the 6 values are gone.
--
-- The unique constraint is deliberately NOT recreated: it did not exist on this
-- database before 0006 ran (that migration reported
-- `constraint "companies_national_id_number_unique" does not exist, skipping`).
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "national_id_number" text;

-- NOT rolled back: 0005_team_audience_backfill.sql. It only appended 'team' to
-- target_audience_types on open tenders. The deployed code maps team -> company
-- when checking audience and never reads 'team', so the extra value is inert
-- until the new code ships. Leaving it avoids a second write to live data.
