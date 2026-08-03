-- NOTE (corrected): this file previously also added `companies.account_type`,
-- `companies.national_id_number` and `tenders.target_audience_types`. All three
-- are added by 0002_freelancer_accounts.sql, which landed from a parallel branch
-- and carries the same migration number.
--
-- The two files disagreed on the tenders column: this one declared it
--     target_audience_types jsonb DEFAULT '["company","individual"]'
-- while 0002_freelancer_accounts.sql declared it
--     target_audience_types text[] DEFAULT '{company}'
--
-- text[] is the one that actually shipped — verified directly against both
-- databases (dev and prod both report udt_name = _text). It is also the only
-- one that works: server/storage.ts filters the marketplace with
-- `<value> = ANY(target_audience_types)`, a Postgres array operator that errors
-- against jsonb. shared/schema.ts declared the column twice for the same reason;
-- the text[] declaration wins there too.
--
-- On a FRESH database the duplicate was fatal rather than merely redundant:
-- filename order applies this file first, creating the column as jsonb, after
-- which 0002_freelancer_accounts.sql's plain ADD COLUMN (no IF NOT EXISTS)
-- aborts. Removing the overlapping statements here leaves exactly one
-- definition of each column and makes a from-scratch apply work.
--
-- The unique index below is unique to this file and is retained.

CREATE UNIQUE INDEX IF NOT EXISTS offers_tender_user_uniq
  ON offers (tender_id, created_by)
  WHERE status != 'superseded';
