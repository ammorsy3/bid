-- Teams become a first-class tender audience.
--
-- Until now server/routes.ts folded 'team' into 'company' when checking whether
-- a workspace could submit an offer. Two consequences:
--
--   1. A tender targeted at ['team'] alone was submittable by NOBODY. Teams
--      tested 'company' (absent from the list), companies tested 'company'
--      (absent), individuals tested 'individual' (absent).
--   2. Conversely, that mapping was the only reason a team could submit to an
--      ordinary ['company'] tender.
--
-- Removing the mapping fixes (1) but would silently trigger (2) in reverse:
-- every live company RFP would stop accepting team proposals. So this backfill
-- must be applied together with that code change, not before or after it.
--
-- Scope: only tenders that can still receive offers. Closed, cancelled and
-- awarded tenders are historical records — rewriting their audience would
-- change what the record says happened, so they are left alone.
--
-- Idempotent: the NOT (...) guard means re-running adds nothing.

UPDATE "tenders"
SET "target_audience_types" = array_append("target_audience_types", 'team')
WHERE 'company' = ANY("target_audience_types")
  AND NOT ('team' = ANY("target_audience_types"))
  AND "status" IN ('draft', 'published');
