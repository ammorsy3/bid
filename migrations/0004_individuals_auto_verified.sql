-- Individuals no longer go through National-ID review — they're verified
-- automatically at signup (see server/routes.ts, POST /api/companies).
--
-- This backfill only fixes the STATUS of existing individual workspaces that
-- are stuck in 'not_verified' or 'under_review' from the old flow, so they
-- stop seeing "verify your account" banners and dead links to a review step
-- that no longer exists. It does NOT touch national_id_number (left as-is,
-- nothing is deleted) and does NOT touch company/team accounts, whose
-- verification flow is unchanged.
--
-- Data-only change, no schema/column changes. Safe to re-run (idempotent).

update companies
   set verification_status = 'verified',
       verified_at = coalesce(verified_at, now()),
       updated_at = now()
 where account_type = 'individual'
   and verification_status != 'verified';
