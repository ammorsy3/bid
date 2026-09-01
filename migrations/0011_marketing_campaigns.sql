-- 0011: influencer marketing campaigns, clicks, and signup attribution.
--
-- Backs the admin Growth → Campaigns page. Three tables:
--   marketing_campaigns    one row per influencer per push; owns the /r/<code>
--                          short link and the UTM values it redirects with.
--   campaign_visits        every click. campaign_id is nullable on purpose so
--                          unrecognised UTM traffic is still counted.
--   campaign_attributions  first touch frozen at signup, one row per user.
--
-- Activation milestones (company created / verified / first tender) are NOT
-- stored — they are derived at read time from user_companies, companies and
-- tenders, so they cannot drift.
--
-- Additive only: no existing table is touched. Safe to re-run.
-- Must be applied to BOTH databases (dev and prod).

BEGIN;

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id                varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  code              varchar(64) NOT NULL UNIQUE,
  name              text NOT NULL,
  influencer_name   text,
  influencer_handle text,
  platform          varchar(24) NOT NULL,
  utm_source        text NOT NULL,
  utm_medium        text NOT NULL DEFAULT 'influencer',
  utm_campaign      text NOT NULL,
  utm_content       text,
  utm_term          text,
  landing_path      text NOT NULL DEFAULT '/',
  fee_amount        integer,
  currency          varchar(8) DEFAULT 'SAR',
  notes             text,
  status            varchar(16) NOT NULL DEFAULT 'active',
  starts_at         timestamp,
  ends_at           timestamp,
  created_by        varchar REFERENCES users(id),
  created_at        timestamp NOT NULL DEFAULT now(),
  updated_at        timestamp NOT NULL DEFAULT now()
);

ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_status_check;
ALTER TABLE marketing_campaigns ADD CONSTRAINT marketing_campaigns_status_check
  CHECK (status IN ('active', 'paused', 'ended'));

ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_platform_check;
ALTER TABLE marketing_campaigns ADD CONSTRAINT marketing_campaigns_platform_check
  CHECK (platform IN ('instagram', 'tiktok', 'x', 'snapchat', 'youtube', 'linkedin',
                      'whatsapp', 'telegram', 'podcast', 'newsletter', 'other'));

CREATE INDEX IF NOT EXISTS marketing_campaigns_utm_idx
  ON marketing_campaigns (utm_campaign, utm_content);
CREATE INDEX IF NOT EXISTS marketing_campaigns_status_idx
  ON marketing_campaigns (status);

CREATE TABLE IF NOT EXISTS campaign_visits (
  id            varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   varchar REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  visitor_id    varchar(64) NOT NULL,
  source        varchar(16) NOT NULL,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  landing_path  text,
  referrer      text,
  user_agent    text,
  country       varchar(2),
  ip_hash       varchar(64),
  created_at    timestamp NOT NULL DEFAULT now()
);

ALTER TABLE campaign_visits DROP CONSTRAINT IF EXISTS campaign_visits_source_check;
ALTER TABLE campaign_visits ADD CONSTRAINT campaign_visits_source_check
  CHECK (source IN ('shortlink', 'landing'));

CREATE INDEX IF NOT EXISTS campaign_visits_campaign_idx
  ON campaign_visits (campaign_id, created_at);
CREATE INDEX IF NOT EXISTS campaign_visits_visitor_idx
  ON campaign_visits (visitor_id);

CREATE TABLE IF NOT EXISTS campaign_attributions (
  id             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    varchar NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  -- UNIQUE is the enforcement of first-touch: a second influencer cannot
  -- claim a signup that already belongs to one.
  user_id        varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  visitor_id     varchar(64),
  signup_method  varchar(16),
  utm_snapshot   jsonb,
  first_touch_at timestamp,
  created_at     timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_attributions_campaign_idx
  ON campaign_attributions (campaign_id);

COMMIT;
