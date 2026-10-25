ALTER TABLE billing_checkouts ADD COLUMN IF NOT EXISTS promo_code varchar(32);

CREATE TABLE IF NOT EXISTS contact_sales_leads (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  team_size varchar(16),
  message text,
  language varchar(4) NOT NULL DEFAULT 'en',
  status varchar(16) NOT NULL DEFAULT 'new',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_sales_leads_created_idx ON contact_sales_leads (created_at DESC);
