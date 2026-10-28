-- 0022: free trials run inside Bid, with no card and no StreamPay.
--
-- A promo code ("tested") used to start StreamPay's native trial: card saved at
-- checkout, charged when it ended. StreamPay's page then showed the full monthly
-- price, which read as a charge. Now the code starts a trial here instead: the
-- company gets the plan for 30 days, nothing is created at StreamPay, and near
-- the end Bid asks for payment (banner + email). Entitlements use the highest of
-- the live subscription, an admin grant and an active trial.
--
-- One trial per company, ever (the unique index), so the code can't be reused
-- by the same workspace. reminder_sent_at / ended_sent_at make the daily cron's
-- two emails at-most-once.
--
-- Additive only (the checkout status list gains 'trial'). Must be applied to BOTH databases — run scripts/which-db.sh first.

BEGIN;

CREATE TABLE IF NOT EXISTS company_trials (
  id               varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       varchar NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan             varchar(16) NOT NULL CHECK (plan IN ('pro', 'business')),
  promo_code       varchar(32) NOT NULL,
  started_by       varchar NOT NULL REFERENCES users(id),
  starts_at        timestamp NOT NULL DEFAULT now(),
  ends_at          timestamp NOT NULL,
  reminder_sent_at timestamp NULL,
  ended_sent_at    timestamp NULL,
  created_at       timestamp NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS company_trials_company_idx ON company_trials (company_id);

-- RLS on, no policies, as for every public table (0012, 0018, 0019).
ALTER TABLE company_trials ENABLE ROW LEVEL SECURITY;

-- The checkout that started a trial is closed as 'trial' (not 'paid': nothing
-- was paid), so the unfinished-checkout email leaves it alone.
ALTER TABLE billing_checkouts DROP CONSTRAINT IF EXISTS billing_checkouts_status_check;
ALTER TABLE billing_checkouts ADD CONSTRAINT billing_checkouts_status_check
  CHECK (status IN ('draft', 'redirected', 'paid', 'failed', 'abandoned', 'trial'));

COMMIT;

-- ── Runbook ──────────────────────────────────────────────────────────────────
-- 0. ./scripts/which-db.sh
-- 1. Dev:   psql "$DATABASE_URL"      -f migrations/0022_company_trials.sql
-- 2. Prod:  psql "$PROD_DATABASE_URL" -f migrations/0022_company_trials.sql
-- 3. Verify on each:  \d company_trials
-- Before it is applied, the app treats every company as having no trial
-- (lookups fail soft) and a "tested" code fails with a server error.
