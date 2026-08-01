-- Individuals and teams do not require legal or National-ID verification.
-- Company workspaces keep their independent verification status and documents.
UPDATE "companies"
SET
  "verification_status" = 'verified',
  "verified_at" = COALESCE("verified_at", NOW()),
  "rejection_reason" = NULL
WHERE "account_type" IN ('individual', 'team')
  AND "verification_status" <> 'verified';

-- Discovery is paused product-wide. Keep existing profile links usable while
-- removing individual profiles from any directory/search implementation.
UPDATE "company_profiles"
SET "discoverable" = false
WHERE "company_id" IN (
  SELECT "id" FROM "companies" WHERE "account_type" = 'individual'
);
