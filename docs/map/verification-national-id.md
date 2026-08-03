# Index: verification status + National ID

Greppable index, not documentation. Line numbers are as of the SHA at the bottom.

Two intertwined concepts kept in one file because the National-ID removal (`f3548c3`, then `c6c5f61` "Scope individual National-ID removal to the **UI layer only**") cut across the verification lifecycle.

## Aliases

| Layer | Name |
|---|---|
| DB column | `companies.verification_status`, `companies.verified_at`, `companies.rejection_reason` |
| DB column | `companies.national_id_number` |
| Legacy DB column | `users.verification_status` (`schema.ts:57`, "Legacy columns (preserved from old role-based schema)") |
| Drizzle/TS | `verificationStatus`, `nationalIdNumber` |
| Document type | `national_id_card` (a `company_documents.document_type` value) |
| **Confusable, unrelated** | `national_address_certificate` / `nationalAddressCertificateUrl` / `docNationalAddressLabel` — Saudi Post address certificate, **not** the national ID |
| **Confusable, unrelated** | Clerk email `verification.status` (`routes.ts:423-424`) |
| Response flags | `requiresVerification`, `verificationStatus`, `blockReason: 'company_not_verified'` |

## Lifecycle values

`'not_verified' \| 'under_review' \| 'verified' \| 'rejected'` — declared **only as a comment** at `shared/schema.ts:102`. No enum, no CHECK constraint, no zod enum anywhere.

## DB schema

- `shared/schema.ts:57` — `users.verificationStatus` (legacy, nullable, unused by app logic)
- `shared/schema.ts:85-86` — `// National ID — required for individual accounts and team admins (10-digit)` + `nationalIdNumber: text("national_id_number").unique()` **(dead — overridden)**
- `shared/schema.ts:91-92` — `// National ID for individual (freelancer) workspaces — required before offer submission` + `nationalIdNumber: text("national_id_number")` **(effective, no `.unique()`; `TS1117`)**
- `shared/schema.ts:102-105` — `verificationStatus` (default `'not_verified'`), `verifiedAt`, `rejectionReason`
- `shared/schema.ts:222-231` — `companyDocuments`; `:225` documentType comment lists `'national_id_card'`
- `shared/schema.ts:477` — `invitations.status` — `'pending' \| 'verified' \| 'rejected'` (a *different* `verified`)
- `shared/schema.ts:595` — `awards.blockReason` e.g. `'company_not_verified'`
- `shared/schema.ts:1199-1202, 1304` — verification fields omitted from insert schemas
- `shared/schema.ts:1210` — `createCompanySchema.nationalIdNumber: z.string().regex(/^\d{10}$/, "National ID must be exactly 10 digits").optional()` — **still validated at signup**
- `shared/schema.ts:1264-1270` — `verifyCompanySchema`: `legalName`, `crNumber`, `vatNumber?`, `city`. **No `nationalIdNumber`.**

## Migrations

- `migrations/0000_outstanding_shen.sql:72` — `verification_status text DEFAULT 'not_verified' NOT NULL`
- `migrations/0000_outstanding_shen.sql:358` — `users.verification_status text` (legacy)
- `migrations/0002_account_type.sql:3` — `ADD COLUMN IF NOT EXISTS national_id_number text` (no unique constraint)
- `migrations/0002_freelancer_accounts.sql:7` — `ADD COLUMN "national_id_number" text`
- `migrations/0002_freelancer_accounts.sql:13` — `ADD CONSTRAINT "companies_national_id_number_unique" UNIQUE("national_id_number")`
- **No migration ever drops `national_id_number`.** The removal was explicitly scoped to the UI (`c6c5f61`).
- `migrations/0004_direct_individual_team_access.sql:1-10` — "Individuals and teams do not require legal or National-ID verification." Force-sets `verification_status='verified'`, `verified_at=COALESCE(verified_at, NOW())`, `rejection_reason=NULL` for `individual`/`team`.
- `migrations/meta/0000_snapshot.json:539-544, 2770+` — snapshot entries

## Auth guards

- `server/routes.ts:153-176` — `requireVerifiedCompany`; non-company bypasses at `:165-167`; `403 requiresVerification` at `:169-173`
- `server/routes.ts:3157`, `:4791` — the two mount points
- `client/src/components/RequireVerified.tsx` — client mirror; wraps 12 `/tenders/new/*` routes in `App.tsx:159-170`

## API handlers (`server/routes.ts`)

| Line | What |
|---|---|
| 423-424 | Clerk **email** verification (different concept) |
| 508-510, 524-526, 940-942, 958, 1086 | `verificationStatus` + `rejectionReason` in auth payloads |
| 1963-1965 | initial status: `company` → `under_review` if docs uploaded else `not_verified`; `team`/`individual` → `verified` |
| 2100-2124 | `GET /api/companies/:id/verify-info` → `legalName, crNumber, vatNumber, city, verificationStatus`. **No account-type gate.** |
| 2130-2190 | `PATCH /api/companies/:id/verify-info` — `verifyCompanySchema.parse`, `requireCompanyRole('admin')`. **No account-type gate.** |
| 2118, 2166, 2392, 2571, 2632, 2721, 2770 | status echoed in responses |
| 2575, 2636 | `nationalIdNumber: company.nationalIdNumber \|\| null` returned to the client |
| 2697, 2750 | `verifiedDocuments` computed only when `verified` |
| 2856-2857 | editing legal fields on a `verified` company demotes it to `under_review` — **no account-type guard** |
| 3097-3100 | uploading docs moves `not_verified`/`rejected` → `under_review` — **no account-type guard** |
| 4842-4848 | pre-offer check, `company` only |
| 944, 962, 1090 | `nationalIdNumber` in auth payloads (`TS1117` duplicate-key sites) |

## Data access (`server/storage.ts`)

- `169`, `549-553` — `getCompanyByNationalId()` — **zero callers**
- `575`, `617`, `2208`, `2218` — `under_review` queries (admin queue)
- `670` — status filter for the admin list
- `704-730` — `verifyCompany()` → `verified`, `verifiedAt`, clears `rejectionReason`, audit log
- `744-750` — `rejectCompany()` → `rejected` + `rejectionReason`, audit log
- `1561`, `1627`, `1651` — Discovery filters requiring `verified`
- `2011` — `isVerified` for profile display
- `2249` — verified-company count
- `2316-2320` — admin funnel `switch (verificationStatus)`; `default:` swallows `not_verified`
- `2334` — `nationalIdCard: docTypeCompanies['national_id_card']?.size || 0`
- `118` — `nationalIdCard: number` in the analytics return type

## Document slots

- `client/src/lib/company-documents.ts:1-22` — `COMPANY_DOCUMENT_SLOTS`, 4 slots (`cr_certificate` required, `vat_certificate`, `gosi_certificate`, `national_address_certificate`). File header claims it is used by `/onboarding/company-documents`, `/tenders/new`, "any future surface".
- Its **only importer** is `client/src/components/CompanyDocumentsForm.tsx:9,111` — which is itself **imported by nothing**.
- Three live surfaces each hand-roll their own copy instead:
  - `client/src/pages/onboarding/company-documents.tsx:55-69` — uses i18n keys `docNatLabel` / `docNatDesc`
  - `client/src/pages/TenderCreateChoice.tsx:20-25` — uses `docNationalAddressLabel` / `docNationalAddressDesc`
  - `client/src/pages/Settings.tsx:52-57` — uses `docNationalAddressLabel` / `docNationalAddressDesc`
- Admin label maps (no `national_id_card` entry in either):
  - `client/src/pages/AdminVendors.tsx:56-62`
  - `client/src/pages/AdminAwards.tsx:19-25`

## Client surfaces

- `client/src/pages/Settings.tsx:846-900` — verify-info query + mutation
- `client/src/pages/Settings.tsx:1788` — legal-info card, gated `isCompanyWorkspace`
- `client/src/pages/Settings.tsx:1878` — documents card, gated `isCompanyWorkspace`
- `client/src/pages/TenderCreateChoice.tsx:30` — `verificationStatus` gate before the wizard
- `client/src/pages/Dashboard.tsx:623` — `requiresLegalVerification = workspaceKind === 'company'`
- `client/src/pages/IndividualProfilePage.tsx:124` — `isVerified` badge
- `client/src/lib/auth.ts:56` — `nationalIdNumber: string \| null` on the workspace object
- `client/src/pages/AdminUsers.tsx:45-46` — `nationalAddressCertificate` and `nationalIdCard` counts in the analytics type
- `client/src/pages/AdminUsers.tsx:272` — renders `nationalAddress` only; **`nationalIdCard` is typed and fetched but never rendered**
- `client/src/pages/VendorOnboarding.tsx:36, 473-496` and `VendorPreQualification.tsx:34, 323-346` — require `nationalAddressCertificateUrl`; **both pages are unrouted**

## i18n keys

EN/AR at exact parity (3990 each, zero divergence).

- `onboarding.nationalAddressCertificate` @731 / `uploadNationalAddress` @732
- `onboardingPanel.docNationalAddressLabel` @937 / `docNationalAddressDesc` @938
- `onboardingPanel.docNatLabel` @950 / `docNatDesc` @951 — **duplicate of the above with identical English strings**
- `adminAnalytics.nationalAddress` @3193
- `vendorPreQual.fieldNatAddressCert` @3932 / `uploadNatAddressCert` @3935
- `validation.nationalAddressRequired` @3981, `crNumberFormat` @3977
- `dashboard.verifStatusVerified/UnderReview/NotVerified/Rejected` @301-304, `verificationInProgressTitle` @306, `verificationRejectedTitle` @307, `verificationPendingDesc` @324 — flagged by the unreferenced-key scan; likely built dynamically, unconfirmed
- **No key anywhere contains "national ID" / "رقم الهوية".** The UI removal was complete at the copy level.

## Email templates

- `server/email.ts:930-1000` — `sendCompanyVerificationNotification({ outcome: 'verified' | 'rejected', rejectionReason })`
- `server/email.ts:1140` — `decision: 'approved' | 'rejected'` (join requests — different flow, third vocabulary for the same idea)
- No email references National ID.

## Integrations

- `server/routes/integrations/webhook.ts:244, 257, 371` — `validationErrors = ["company_not_verified"]`
- `server/routes/integrations/mcp.ts:210`, `server/routes/v1/copilot.ts:257` — pass `verificationStatus` through

## Tests

- `tests/individual-sourcing.test.ts:142, 153` — `verificationStatus: "verified"` as scoring input only
- **No test covers the verification lifecycle, `requireVerifiedCompany`, or National ID.**

## Orphans / dead ends

| Thing | Status |
|---|---|
| `companies.national_id_number` column | still in schema + both `0002` migrations; nothing writes it, nothing reads it |
| `storage.getCompanyByNationalId` | zero callers |
| `createCompanySchema.nationalIdNumber` regex | validated, never supplied |
| `nationalIdNumber` in `/api/auth/*` + company responses | always `null`, still serialised to every client |
| `'national_id_card'` document type | no upload slot, no admin label, but counted in `getAdminAnalytics` and typed in `AdminUsers.tsx` |
| `client/src/components/CompanyDocumentsForm.tsx` | zero imports |
| `client/src/lib/company-documents.ts` | reachable only via the orphan above |
| `users.verificationStatus` | legacy column, no reader |
| `VendorOnboarding.tsx`, `VendorPreQualification.tsx` | unrouted |

---
Indexed at commit `8d21da125a385ceb359e5f9b0d16c6a2090191cb`
