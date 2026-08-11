-- 0010: constrain offers.status and tenders.status at the database level.
--
-- Q-053 / Q-057. Both columns are plain text with no enum and no constraint.
-- The API guards them, but nothing else does — which is how `shortlisted`
-- came to exist as a real, shipped offer status that the schema comment had
-- never heard of, and how a dev database ended up with one offer marked
-- `submitted`, a value no code path can produce.
--
-- The lists below are the values actually in use, plus `superseded` (set by
-- the server when a vendor resubmits) and `draft`/`cancelled` for tenders
-- (reachable by unpublishing and by cancelling).
--
-- Safe to re-run: each constraint is dropped first.
-- Must be applied to BOTH databases. Verified beforehand that no existing row
-- in either violates these lists.

BEGIN;

-- Stale fixture in dev only; prod has never had this value. Normalising it
-- rather than widening the constraint to admit a value nothing can write.
UPDATE offers SET status = 'pending' WHERE status = 'submitted';

ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_status_check
  CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected', 'superseded'));

ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_status_check;
ALTER TABLE tenders ADD CONSTRAINT tenders_status_check
  CHECK (status IN ('draft', 'published', 'closed', 'cancelled'));

COMMIT;

-- To undo:
--   ALTER TABLE offers  DROP CONSTRAINT IF EXISTS offers_status_check;
--   ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_status_check;
