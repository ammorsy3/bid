-- 0016: one StreamPay customer may serve several workspaces of the same payer.
--
-- StreamPay refuses a second customer with the same email/phone, so a person
-- running two workspaces could never pay from the second one: saving the
-- shared customer id hit companies_streampay_consumer_id_unique and checkout
-- failed with a 500. The id is now an ordinary indexed column; each workspace's
-- plan and invoices are told apart in code (server/lib/billing.ts).
--
-- Safe to re-run. Must be applied to BOTH databases (dev and prod) — run
-- scripts/which-db.sh first.

BEGIN;

DROP INDEX IF EXISTS companies_streampay_consumer_id_unique;
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_streampay_consumer_id_unique;
CREATE INDEX IF NOT EXISTS companies_streampay_consumer_id_idx ON companies (streampay_consumer_id);

COMMIT;
