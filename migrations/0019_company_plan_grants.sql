-- 0019: administrative plan grants (BID-UX-BUGFIX item 7, package D-PLANS).
--
-- A platform admin can give a company workspace a paid plan (Pro or Business)
-- without a payment: a pilot, a partner, a support remedy. A grant is NOT a
-- subscription — no invoice, checkout or StreamPay record is created, and the
-- billing page keeps showing the real subscription. Entitlements use the
-- higher of the live subscription and the active grant (server/lib/entitlements.ts).
--
-- Plans belong to the company (company_subscriptions.company_id), so grants do
-- too. At most one grant is active per company (revoked_at IS NULL); changing
-- a plan revokes the previous grant and inserts a new one in one transaction,
-- so history is kept. Each change is also written to audit_log with the
-- previous and new values.
--
-- Additive only. Numbered after 0018 (structured pricing, RFQ-B1).
-- Must be applied to BOTH databases — run scripts/which-db.sh first. Not run by
-- the build: execution needs the user's approval per environment.

BEGIN;

CREATE TABLE IF NOT EXISTS company_plan_grants (
  id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   varchar NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan         varchar(16) NOT NULL CHECK (plan IN ('pro', 'business')),
  reason       text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 500),
  starts_at    timestamp NOT NULL DEFAULT now(),
  ends_at      timestamp NULL,
  granted_by   varchar NOT NULL REFERENCES users(id),
  created_at   timestamp NOT NULL DEFAULT now(),
  revoked_at   timestamp NULL,
  revoked_by   varchar NULL REFERENCES users(id),
  revoke_reason text NULL,
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS company_plan_grants_one_active_idx
  ON company_plan_grants (company_id) WHERE revoked_at IS NULL;

-- RLS on, no policies, as for every public table (0012, 0018).
ALTER TABLE company_plan_grants ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ── Runbook ──────────────────────────────────────────────────────────────────
-- 0. ./scripts/which-db.sh
-- 1. Dev:   psql "$DATABASE_URL"      -f migrations/0019_company_plan_grants.sql
-- 2. Prod:  psql "$PROD_DATABASE_URL" -f migrations/0019_company_plan_grants.sql
-- 3. Verify on each:  \d company_plan_grants
-- Rollback before any grant exists: DROP TABLE company_plan_grants; (separately approved).
-- After grants exist, the previous app simply ignores the table (companies fall
-- back to their subscription); keep the table.
