-- 0014: paid plans through StreamPay.
--
-- One new column and four tables:
--   companies.streampay_consumer_id  the company's customer record in StreamPay.
--                                    Billing is per company, not per user.
--   billing_profiles       what the payer typed in the checkout step, saved as
--                          they type. Kept apart from companies.cr_number /
--                          vat_number on purpose: those are unique and owned by
--                          CR verification, and billing typing must never
--                          overwrite or un-verify them.
--   billing_checkouts      one row per checkout attempt, from the details step
--                          ('draft') to StreamPay ('redirected') to the outcome.
--                          Also the lead list the follow-up email works from.
--   company_subscriptions  the company's current plan, as last read from
--                          StreamPay. A cache of StreamPay's truth, rebuilt by
--                          syncCompanySubscription — never edited by hand.
--   billing_events         every verified StreamPay webhook, for audit and to
--                          drop duplicate deliveries.
--
-- Additive only: no existing column or row is changed. Safe to re-run.
-- Must be applied to BOTH databases (dev and prod) — run scripts/which-db.sh first.

BEGIN;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS streampay_consumer_id text;
CREATE UNIQUE INDEX IF NOT EXISTS companies_streampay_consumer_id_unique
  ON companies (streampay_consumer_id);

CREATE TABLE IF NOT EXISTS billing_profiles (
  id                 varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         varchar NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  billing_name       text,
  billing_email      text,
  billing_phone      text,
  vat_number         text,
  cr_number          text,
  address            text,
  city               text,
  updated_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamp NOT NULL DEFAULT now(),
  updated_at         timestamp NOT NULL DEFAULT now()
);

-- Added after the first run of this file; keeps a re-run complete.
ALTER TABLE billing_profiles ADD COLUMN IF NOT EXISTS address text;

CREATE TABLE IF NOT EXISTS billing_checkouts (
  id               varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       varchar NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id          varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan             varchar(16) NOT NULL,
  term             varchar(16) NOT NULL,
  status           varchar(16) NOT NULL DEFAULT 'draft',
  payment_link_id  text UNIQUE,
  failure_reason   text,
  last_activity_at timestamp NOT NULL DEFAULT now(),
  followup_sent_at timestamp,
  completed_at     timestamp,
  created_at       timestamp NOT NULL DEFAULT now()
);

ALTER TABLE billing_checkouts DROP CONSTRAINT IF EXISTS billing_checkouts_plan_check;
ALTER TABLE billing_checkouts ADD CONSTRAINT billing_checkouts_plan_check
  CHECK (plan IN ('pro', 'business'));
ALTER TABLE billing_checkouts DROP CONSTRAINT IF EXISTS billing_checkouts_term_check;
ALTER TABLE billing_checkouts ADD CONSTRAINT billing_checkouts_term_check
  CHECK (term IN ('monthly', 'yearly'));
ALTER TABLE billing_checkouts DROP CONSTRAINT IF EXISTS billing_checkouts_status_check;
ALTER TABLE billing_checkouts ADD CONSTRAINT billing_checkouts_status_check
  CHECK (status IN ('draft', 'redirected', 'paid', 'failed', 'abandoned'));

CREATE INDEX IF NOT EXISTS billing_checkouts_company_idx
  ON billing_checkouts (company_id, created_at);
CREATE INDEX IF NOT EXISTS billing_checkouts_followup_idx
  ON billing_checkouts (status, last_activity_at) WHERE followup_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS company_subscriptions (
  id                        varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                varchar NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  plan                      varchar(16) NOT NULL,
  term                      varchar(16) NOT NULL,
  status                    varchar(24) NOT NULL,
  streampay_subscription_id text NOT NULL,
  current_period_end        timestamp,
  cancel_at_period_end      boolean NOT NULL DEFAULT false,
  updated_at                timestamp NOT NULL DEFAULT now(),
  created_at                timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_events (
  id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   varchar(64) NOT NULL,
  entity_type  varchar(32),
  entity_id    text NOT NULL,
  signature_ts varchar(32) NOT NULL,
  company_id   varchar REFERENCES companies(id) ON DELETE SET NULL,
  payload      jsonb NOT NULL,
  received_at  timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_events_dedupe_idx
  ON billing_events (event_type, entity_id, signature_ts);

-- Same rule as 0012: RLS on, no policies. The server connects as the table
-- owner and is unaffected; Supabase's public REST API sees nothing.
ALTER TABLE billing_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_checkouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events        ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ── Runbook ──────────────────────────────────────────────────────────────────
-- 0. ./scripts/which-db.sh            (know which database prod really uses)
-- 1. Dev:   psql "$DATABASE_URL"      -f migrations/0014_billing.sql
-- 2. Prod:  psql "$PROD_DATABASE_URL" -f migrations/0014_billing.sql
-- 3. Verify on each: \d billing_checkouts  and
--    SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'billing_%'
--      OR tablename = 'company_subscriptions';
