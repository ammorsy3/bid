-- Remove National ID collection at the database level.
--
-- Collecting the Saudi national ID was found to be unlawful for us, and commit
-- f3548c3 removed it from the product. Commit c6c5f61 then deliberately scoped
-- that removal to the UI layer only, so the storage side survived intact:
--
--   * companies.national_id_number                     (the column itself)
--   * companies_national_id_number_unique              (a unique index over it)
--   * a 10-digit zod validator on createCompanySchema  (removed in code)
--   * storage.getCompanyByNationalId()                 (removed in code, 0 callers)
--   * nationalIdNumber on every /api/auth/* response   (removed in code, always null)
--   * 'national_id_card' as a company_documents type   (removed in code)
--
-- Row counts checked directly before writing this, on 2026-08-02:
--   prod: 0 rows with a non-null national_id_number
--   dev:  6 rows
--
-- THIS IS IRREVERSIBLE. Dropping the column destroys those 6 dev values. That
-- is the intent — it is precisely the data we should not be holding — but there
-- is no undo, so take a dump first if you want one.
--
-- ORDERING: apply this only AFTER the code that stops selecting the column is
-- deployed to the environment in question. Drizzle selects columns explicitly
-- from the schema, so a database that has lost the column while the running
-- build still declares it will throw on every companies query — including
-- login. Deploy first, migrate second.
--
-- Idempotent: safe to re-run.

-- The unique index goes first; dropping the column would take it anyway, but
-- naming it here keeps the intent legible.
ALTER TABLE "companies"
  DROP CONSTRAINT IF EXISTS "companies_national_id_number_unique";

ALTER TABLE "companies"
  DROP COLUMN IF EXISTS "national_id_number";

-- Uploaded national-ID cards. No surface has offered this document type since
-- the removal and neither admin label map can render it, so any rows are
-- pre-removal residue of the same unlawful collection.
DELETE FROM "company_documents"
 WHERE "document_type" = 'national_id_card';
