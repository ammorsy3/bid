-- Membership lookup index.
--
-- requireCompanyContext (server/routes.ts) now re-reads user_companies on every
-- company-scoped request, so that removing a team member takes effect
-- immediately instead of whenever their 7-day token expires. That lookup is
--
--   select role_in_company from user_companies
--    where user_id = $1 and company_id = $2 and deleted_at is null
--
-- and before this index it was a sequential scan of the whole table — fine at a
-- few dozen rows, a per-request tax once there are thousands.
--
-- Plain CREATE INDEX, not CONCURRENTLY: the table is small, so the brief lock is
-- imperceptible, and CONCURRENTLY cannot run inside a transaction (which is how
-- these files get applied). Switch to CONCURRENTLY if this table ever gets large.

CREATE INDEX IF NOT EXISTS user_companies_user_company_idx
  ON public.user_companies (user_id, company_id);
