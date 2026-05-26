ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS national_id_number text;

ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS target_audience_types jsonb DEFAULT '["company","individual"]';

CREATE UNIQUE INDEX IF NOT EXISTS offers_tender_user_uniq
  ON offers (tender_id, created_by)
  WHERE status != 'superseded';
