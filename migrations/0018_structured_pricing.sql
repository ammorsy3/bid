-- 0018: structured RFQ pricing (RFQ-B1; proposal RFQ-STRUCTURED-PRICING-PROPOSAL.md
-- §2–§6 with Amendments A1–A3, A6). Additive only: every existing request,
-- template and offer keeps its meaning (all new columns default to the legacy
-- behaviour; quote_price is untouched).
--
--   tenders               request_type (rfp|rfq), itemized_pricing, reference-price
--                         visibility, custom item columns, items_revision
--   tender_templates      request_type, itemized_pricing (saved RFQ templates)
--   tender_items          the bill of quantities (authoritative; deliverables is a
--                         derived mirror for itemized requests)
--   offer_pricing_drafts  one shared draft per (tender, vendor company), optimistic version
--   offer_item_responses  per-item response of a submitted offer
--   offer_item_alternatives  optional alternative or (Policy A) replacement, with reason
--   offers                stored totals, VAT declaration, snapshot + SHA-256, idempotency key
--
-- Numbers (proposal §3): quantity numeric(14,4) > 0 and ≤ 1e9; prices numeric(12,2);
-- lines / subtotals / VAT / totals numeric(15,2). Never rounded on input.
--
-- Not run by the build. Execution needs the user's approval per environment,
-- and the flag STRUCTURED_PRICING_ENABLED stays off until the R0 release is
-- verified (proposal §10). Must be applied to BOTH databases — run
-- scripts/which-db.sh first.

BEGIN;

-- ── requests ────────────────────────────────────────────────────────────────
ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS request_type          varchar(8) NOT NULL DEFAULT 'rfp',
  ADD COLUMN IF NOT EXISTS itemized_pricing      boolean    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_reference_prices boolean    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS item_columns          jsonb      NULL,
  ADD COLUMN IF NOT EXISTS items_revision        integer    NOT NULL DEFAULT 1;

ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_request_type_check;
ALTER TABLE tenders ADD CONSTRAINT tenders_request_type_check
  CHECK (request_type IN ('rfp', 'rfq') AND (request_type <> 'rfq' OR itemized_pricing));

-- Amendment A1: itemized_only only with itemized pricing; quote_only never with it.
ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_itemized_submission_check;
ALTER TABLE tenders ADD CONSTRAINT tenders_itemized_submission_check
  CHECK (
    (itemized_pricing AND submission_type IN ('itemized_only', 'tech_fin_proposal', 'video_only', 'tech_fin_with_video'))
    OR (NOT itemized_pricing AND submission_type IS DISTINCT FROM 'itemized_only')
  );

ALTER TABLE tender_templates
  ADD COLUMN IF NOT EXISTS request_type     varchar(8) NOT NULL DEFAULT 'rfp',
  ADD COLUMN IF NOT EXISTS itemized_pricing boolean    NOT NULL DEFAULT false;
ALTER TABLE tender_templates DROP CONSTRAINT IF EXISTS tender_templates_request_type_check;
ALTER TABLE tender_templates ADD CONSTRAINT tender_templates_request_type_check
  CHECK (request_type IN ('rfp', 'rfq') AND (request_type <> 'rfq' OR itemized_pricing));

-- ── bill of quantities ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tender_items (
  id                   varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id            varchar NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  revision             integer NOT NULL DEFAULT 1,
  position             integer NOT NULL CHECK (position >= 0 AND position < 2000),
  name                 varchar(300)  NOT NULL CHECK (length(btrim(name)) > 0),
  description          varchar(2000) NULL,
  unit                 varchar(40)   NOT NULL CHECK (length(btrim(unit)) > 0),
  quantity             numeric(14,4) NOT NULL CHECK (quantity > 0 AND quantity <= 1000000000),
  reference_unit_price numeric(12,2) NULL CHECK (reference_unit_price IS NULL OR (reference_unit_price >= 0 AND reference_unit_price <= 1000000000)),
  image_url            text NULL,
  custom_values        jsonb NULL,
  created_at           timestamp NOT NULL DEFAULT now(),
  UNIQUE (tender_id, revision, position)
);
CREATE INDEX IF NOT EXISTS tender_items_tender_idx ON tender_items (tender_id, revision);

-- ── vendor pricing ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_pricing_drafts (
  id             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id      varchar NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  company_id     varchar NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  items_revision integer NOT NULL,
  payload        jsonb   NOT NULL,
  version        integer NOT NULL DEFAULT 1,
  updated_by     varchar NOT NULL REFERENCES users(id),
  updated_at     timestamp NOT NULL DEFAULT now(),
  UNIQUE (tender_id, company_id)
);

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS items_revision            integer       NULL,
  ADD COLUMN IF NOT EXISTS vat_applied               boolean       NULL,
  ADD COLUMN IF NOT EXISTS vat_rate_bp               integer       NULL,
  ADD COLUMN IF NOT EXISTS tax_policy                varchar(32)   NULL,
  ADD COLUMN IF NOT EXISTS pricing_subtotal          numeric(15,2) NULL,
  ADD COLUMN IF NOT EXISTS pricing_vat               numeric(15,2) NULL,
  ADD COLUMN IF NOT EXISTS pricing_total             numeric(15,2) NULL,
  ADD COLUMN IF NOT EXISTS pricing_snapshot          jsonb         NULL,
  ADD COLUMN IF NOT EXISTS pricing_snapshot_sha256   varchar(64)   NULL,
  ADD COLUMN IF NOT EXISTS submission_key            varchar(64)   NULL,
  ADD COLUMN IF NOT EXISTS submission_request_sha256 varchar(64)   NULL;

-- Amendment A2: the idempotency key is scoped to (company, tender).
CREATE UNIQUE INDEX IF NOT EXISTS offers_submission_key_idx
  ON offers (company_id, tender_id, submission_key) WHERE submission_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS offer_item_responses (
  id             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id       varchar NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  tender_item_id varchar NOT NULL REFERENCES tender_items(id),
  state          varchar(16) NOT NULL CHECK (state IN ('priced', 'unavailable')),
  unit_price     numeric(12,2) NULL CHECK (unit_price IS NULL OR (unit_price >= 0 AND unit_price <= 1000000000)),
  line_total     numeric(15,2) NULL,
  CHECK ((state = 'priced') = (unit_price IS NOT NULL)),
  UNIQUE (offer_id, tender_item_id)
);

CREATE TABLE IF NOT EXISTS offer_item_alternatives (
  id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id varchar NOT NULL UNIQUE REFERENCES offer_item_responses(id) ON DELETE CASCADE,
  role        varchar(16)   NOT NULL CHECK (role IN ('optional', 'replacement')),
  name        varchar(300)  NOT NULL CHECK (length(btrim(name)) > 0),
  description varchar(2000) NULL,
  unit        varchar(40)   NOT NULL CHECK (length(btrim(unit)) > 0),
  quantity    numeric(14,4) NOT NULL CHECK (quantity > 0 AND quantity <= 1000000000),
  unit_price  numeric(12,2) NOT NULL CHECK (unit_price >= 0 AND unit_price <= 1000000000),
  line_total  numeric(15,2) NOT NULL,
  image_url   text NULL,
  reason      varchar(2000) NOT NULL CHECK (length(btrim(reason)) > 0)
);

-- Like every public table (0012): RLS on, no policies. Supabase's default
-- privileges grant anon/authenticated full access to new public tables, so
-- without this they would be readable and writable through the PostgREST API.
-- The server connects as the owner and is unaffected.
ALTER TABLE tender_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_pricing_drafts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_item_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_item_alternatives ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ── Runbook ──────────────────────────────────────────────────────────────────
-- 0. ./scripts/which-db.sh
-- 1. Dev:   psql "$DATABASE_URL"      -f migrations/0018_structured_pricing.sql
-- 2. Prod:  psql "$PROD_DATABASE_URL" -f migrations/0018_structured_pricing.sql
-- 3. Verify: \d tender_items  \d offer_item_responses  \d offer_pricing_drafts
-- Rollback (proposal §10): before any itemized data exists, the previous app
-- ignores these columns and tables. After itemized data exists, redeploying an
-- app older than R0 is NOT a rollback — turn STRUCTURED_PRICING_ENABLED off.
-- No destructive down-migration once data exists.
