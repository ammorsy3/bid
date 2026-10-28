-- 0020: vendor-offering classification (BID-OFFERING-CLASSIFICATION).
--
-- Adds the classification catalogue (main sector → specialized sector →
-- offering group, plus listed items inside groups), each organization's
-- PRIVATE vendor-registration state, and its explicit offerings:
--   • company_offering_items   — positive item selections (source of truth)
--   • company_offering_groups  — group-level declarations, kept distinguishable;
--                                a declaration never stands for the listed items
-- Sector/specialization roll-ups are derived, never stored. No wildcard
-- "all future children" flag exists, so catalogue additions are never
-- selected for anybody automatically.
--
-- Legacy policy: every company that exists when this runs gets an explicit
-- 'legacy_unclassified' row. Its old `companies.category` is NOT used to infer
-- any offering; its records, verification and access are untouched.
--
-- Additive only (new tables, no change to existing columns or rows). Then run
-- the generated 0021_offering_catalogue_seed.sql. Both must be applied BEFORE
-- the application code that reads them is deployed. Not run by the build:
-- execution needs the user's approval per environment.

BEGIN;

CREATE TABLE IF NOT EXISTS offering_catalogue_versions (
  version            varchar(64) PRIMARY KEY,
  source_url         text NOT NULL,
  source_revision_id text NOT NULL,
  source_modified_at timestamp NULL,
  retrieved_at       timestamp NOT NULL,
  checksum           text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  imported_at        timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offering_sectors (
  id            varchar(16) PRIMARY KEY CHECK (id ~ '^BID-D[0-9]{2}$'),
  label_source  text NOT NULL CHECK (btrim(label_source) <> ''),
  label_en      text NOT NULL CHECK (btrim(label_en) <> ''),
  label_ar      text NOT NULL CHECK (btrim(label_ar) <> ''),
  status        varchar(16) NOT NULL CHECK (status IN ('active', 'deprecated')),
  introduced_in varchar(64) NOT NULL REFERENCES offering_catalogue_versions(version),
  updated_at    timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offering_specializations (
  id            varchar(24) PRIMARY KEY CHECK (id ~ '^BID-D[0-9]{2}-F[0-9]{2}$'),
  sector_id     varchar(16) NOT NULL REFERENCES offering_sectors(id),
  label_source  text NOT NULL CHECK (btrim(label_source) <> ''),
  label_en      text NOT NULL CHECK (btrim(label_en) <> ''),
  label_ar      text NOT NULL CHECK (btrim(label_ar) <> ''),
  status        varchar(16) NOT NULL CHECK (status IN ('active', 'deprecated')),
  introduced_in varchar(64) NOT NULL REFERENCES offering_catalogue_versions(version),
  updated_at    timestamp NOT NULL DEFAULT now(),
  CHECK (left(id, 7) = sector_id)
);
CREATE INDEX IF NOT EXISTS offering_specializations_sector_idx ON offering_specializations (sector_id);

CREATE TABLE IF NOT EXISTS offering_groups (
  id                varchar(32) PRIMARY KEY CHECK (id ~ '^BID-D[0-9]{2}-F[0-9]{2}-G[0-9]{2}$'),
  specialization_id varchar(24) NOT NULL REFERENCES offering_specializations(id),
  offering_type     varchar(24) NOT NULL CHECK (offering_type IN ('Service', 'Physical Product', 'Digital Product', 'Works', 'Rental')),
  examples_source   text NOT NULL,
  label_source      text NOT NULL CHECK (btrim(label_source) <> ''),
  label_en          text NOT NULL CHECK (btrim(label_en) <> ''),
  label_ar          text NOT NULL CHECK (btrim(label_ar) <> ''),
  status            varchar(16) NOT NULL CHECK (status IN ('active', 'deprecated')),
  introduced_in     varchar(64) NOT NULL REFERENCES offering_catalogue_versions(version),
  updated_at        timestamp NOT NULL DEFAULT now(),
  CHECK (left(id, 11) = specialization_id)
);
CREATE INDEX IF NOT EXISTS offering_groups_specialization_idx ON offering_groups (specialization_id);

CREATE TABLE IF NOT EXISTS offering_items (
  id            varchar(48) PRIMARY KEY CHECK (id ~ '^BID-D[0-9]{2}-F[0-9]{2}-G[0-9]{2}-I[0-9]{2,3}$'),
  group_id      varchar(32) NOT NULL REFERENCES offering_groups(id),
  provenance    varchar(24) NOT NULL CHECK (provenance IN ('source_example')),
  label_source  text NOT NULL CHECK (btrim(label_source) <> ''),
  label_en      text NOT NULL CHECK (btrim(label_en) <> ''),
  label_ar      text NOT NULL CHECK (btrim(label_ar) <> ''),
  status        varchar(16) NOT NULL CHECK (status IN ('active', 'deprecated')),
  introduced_in varchar(64) NOT NULL REFERENCES offering_catalogue_versions(version),
  updated_at    timestamp NOT NULL DEFAULT now(),
  CHECK (left(id, 15) = group_id)
);
CREATE INDEX IF NOT EXISTS offering_items_group_idx ON offering_items (group_id);
CREATE UNIQUE INDEX IF NOT EXISTS offering_items_id_group_key ON offering_items (id, group_id);

CREATE TABLE IF NOT EXISTS company_vendor_registrations (
  company_id        varchar PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  status            varchar(24) NOT NULL CHECK (status IN ('legacy_unclassified', 'requester_only', 'pending', 'registered')),
  revision          integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  catalogue_version varchar(64) NULL REFERENCES offering_catalogue_versions(version),
  registered_at     timestamp NULL,
  updated_at        timestamp NOT NULL DEFAULT now(),
  updated_by        varchar NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamp NOT NULL DEFAULT now(),
  CHECK (status <> 'registered' OR registered_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS company_vendor_registrations_status_idx ON company_vendor_registrations (status);

CREATE TABLE IF NOT EXISTS company_offering_items (
  company_id        varchar NOT NULL REFERENCES company_vendor_registrations(company_id) ON DELETE CASCADE,
  item_id           varchar(48) NOT NULL,
  group_id          varchar(32) NOT NULL,
  catalogue_version varchar(64) NOT NULL REFERENCES offering_catalogue_versions(version),
  selected_at       timestamp NOT NULL DEFAULT now(),
  selected_by       varchar NULL REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (company_id, item_id),
  -- An item can only be stored inside the group it belongs to.
  FOREIGN KEY (item_id, group_id) REFERENCES offering_items (id, group_id)
);
CREATE INDEX IF NOT EXISTS company_offering_items_item_idx ON company_offering_items (item_id, company_id);
CREATE INDEX IF NOT EXISTS company_offering_items_group_idx ON company_offering_items (group_id, company_id);

CREATE TABLE IF NOT EXISTS company_offering_groups (
  company_id        varchar NOT NULL REFERENCES company_vendor_registrations(company_id) ON DELETE CASCADE,
  group_id          varchar(32) NOT NULL REFERENCES offering_groups(id),
  catalogue_version varchar(64) NOT NULL REFERENCES offering_catalogue_versions(version),
  declared_at       timestamp NOT NULL DEFAULT now(),
  declared_by       varchar NULL REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (company_id, group_id)
);
CREATE INDEX IF NOT EXISTS company_offering_groups_group_idx ON company_offering_groups (group_id, company_id);

-- Same rule as 0012/0014: RLS on, no policies. The app connects as the table
-- owner (unaffected); Supabase's anon/authenticated REST roles get nothing.
ALTER TABLE offering_catalogue_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering_sectors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering_specializations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering_groups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_vendor_registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_offering_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_offering_groups       ENABLE ROW LEVEL SECURITY;

-- Legacy: every existing organization is explicitly unclassified (unknown).
INSERT INTO company_vendor_registrations (company_id, status)
SELECT id, 'legacy_unclassified' FROM companies
ON CONFLICT (company_id) DO NOTHING;

COMMIT;

-- ── Runbook (each step needs the user's approval per environment) ────────────
-- 0. ./scripts/which-db.sh
-- 1. Dev:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0020_vendor_offerings.sql
--          psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0021_offering_catalogue_seed.sql
-- 2. Verify: SELECT status, count(*) FROM company_vendor_registrations GROUP BY 1;
--            (all rows legacy_unclassified; count = SELECT count(*) FROM companies)
--            SELECT count(*) FROM offering_groups WHERE status = 'active';   -- 695
--            SELECT count(*) FROM offering_items  WHERE status = 'active';   -- 629
-- 3. Prod: same two files with "$PROD_DATABASE_URL", then deploy the app.
-- Order matters: companies created by the OLD app between step 3 and the
-- deploy get no row; the new app treats a missing row as legacy_unclassified
-- (never as registered). Re-running 0020 after the deploy backfills such rows.
--
-- Rollback: before any organization has saved offerings, the previous app
-- ignores these tables; dropping them is optional and separately approved:
--   DROP TABLE company_offering_groups, company_offering_items,
--     company_vendor_registrations, offering_items, offering_groups,
--     offering_specializations, offering_sectors, offering_catalogue_versions;
-- After offerings exist, do NOT drop: keep the tables (the previous app simply
-- does not read them) so classification is not lost.
