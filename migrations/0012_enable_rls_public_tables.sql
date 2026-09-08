-- 0012_enable_rls_public_tables.sql
--
-- Supabase's Security Advisor flags every table in the `public` schema that does
-- not have Row-Level Security enabled (rls_disabled_in_public). Those tables are
-- reachable through Supabase's auto-generated PostgREST API
-- (https://<ref>.supabase.co/rest/v1/...) using the *public* anon key, so with
-- RLS off anyone who learns the project URL + anon key can read/write them.
--
-- This app never touches that REST API. It reaches Postgres two ways, both of
-- which are unaffected by RLS:
--   1. The Express server connects directly with `pg` + Drizzle as the `postgres`
--      role (DATABASE_URL, the transaction pooler). `postgres` owns these tables,
--      and a table owner is exempt from RLS unless FORCE ROW LEVEL SECURITY is
--      set (we do NOT set it here).
--   2. server/objectStorage.ts uses the Supabase JS client only for Storage, with
--      the service-role key, which also bypasses RLS.
--
-- So: enable RLS on every current and future `public` table and add no policies.
-- Result — anon/authenticated PostgREST access gets zero rows; the app keeps
-- working exactly as before.
--
-- Run this against BOTH databases (dev eczogii + prod qjwulf). See the runbook
-- at the bottom of this file.

BEGIN;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'          -- ordinary tables only
      AND c.relrowsecurity = false -- skip ones already enabled
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.relname);
    RAISE NOTICE 'RLS enabled on public.%', r.relname;
  END LOOP;
END $$;

COMMIT;

-- Verify (should return no rows):
--   SELECT tablename FROM pg_tables
--   WHERE schemaname = 'public' AND rowsecurity = false;
--
-- ── Runbook ──────────────────────────────────────────────────────────────────
-- 1. Dev:   psql "$DATABASE_URL"      -f migrations/0012_enable_rls_public_tables.sql
-- 2. Prod:  psql "$PROD_DATABASE_URL" -f migrations/0012_enable_rls_public_tables.sql
-- 3. In the Supabase dashboard for each project open Advisors → Security and
--    confirm "rls_disabled_in_public" is gone (or hit "Rerun linter").
-- 4. Smoke-test the app: sign in, open the marketplace, open a tender. All data
--    still loads because the server connects as the table owner.
