# Index: account type (`company` | `team` | `individual`)

Greppable index, not documentation. Line numbers are as of the SHA at the bottom.

## Aliases

| Layer | Name |
|---|---|
| DB column | `companies.account_type` |
| Drizzle/TS | `accountType` |
| Client hook/type | `WorkspaceKind`, `workspaceKind` |
| Local booleans | `isBuyerAccount`, `isIndividual`, `isTeam`, `isCompanyWorkspace`, `isIndividualWorkspace`, `isTeamWorkspace`, `isCompanyViewer` |
| UI copy (EN) | "Company" / "Team" / "Individual" |
| UI copy (legacy, still in i18n keys) | **"Freelancer"** — key names only, English strings were changed in `464fe39` |
| Server local var | `isFreelancer` (`server/routes.ts:3102`) |
| Migration comment | "workspace kind" |

## DB schema

- `shared/schema.ts:77` — `accountType: text("account_type").notNull().default("company")` **(dead — overridden)**
- `shared/schema.ts:90` — `accountType: text("account_type").notNull().default("company")` **(effective; duplicate key, `TS1117`)**
- `shared/schema.ts:108` — `ownerUserId` — "sole user for individual accounts, creator admin for teams"
- `shared/schema.ts:1148` — `export const ACCOUNT_TYPES = ["company", "team", "individual"] as const`
- `shared/schema.ts:1149` — `export type AccountType`
- `shared/schema.ts:1206` — `createCompanySchema.accountType: z.enum(ACCOUNT_TYPES)` **(dead — overridden)**
- `shared/schema.ts:1215` — `accountType: z.enum(['company','individual','team'])` **(effective; duplicate key, `TS1117`)**

## Migrations

- `migrations/0002_account_type.sql:2` — `ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'company'`
- `migrations/0002_freelancer_accounts.sql:5` — same column, same default (**two migrations numbered 0002**)
- `migrations/0002_freelancer_accounts.sql:9,13` — `owner_user_id`, `companies_owner_user_id_users_id_fk`
- `migrations/0004_direct_individual_team_access.sql:8` — force-verifies `account_type IN ('individual','team')`
- `migrations/0004_direct_individual_team_access.sql:16` — sets `discoverable=false` for `account_type='individual'`
- No migration ever backfills or constrains the allowed values — **no CHECK constraint, no enum type**. Any string is storable.

## Auth guards / middleware

- `server/routes.ts:153-176` — `requireVerifiedCompany`; **bypasses** verification when `accountType !== 'company' && !== undefined`
- `server/routes.ts:209-247` — `requireCompanyRole(minRole)`; hierarchy `owner>admin>member>viewer` — **no account-type awareness**
- `server/routes.ts:251-268` — `requireAccountType(...types)`
- Applied at: `routes.ts:3155` (`company`), `3365` (`company`), `3376` (`individual`), `5165` (`company`), `5211` (`company`), `5227` (`company`), `5238` (`company`)
- `server/routes/settings/integrations.ts:27` — `requireAccountType("company","team")` for the integrations admin gate
- `client/src/pages/DashboardGuard.tsx:11,24-32` — `BUYER_ONLY_ROUTES = ["/rfps","/vendors"]`, blocked for individuals; individuals with `onboardingState !== 'completed'` bounced to `/onboarding/individual-profile`
- `client/src/components/RequireVerified.tsx` — verification gate, **account-type blind**

## API handlers (`server/routes.ts`)

| Line | What |
|---|---|
| 165 | verification bypass for non-company |
| 260 | `requireAccountType` check |
| 523, 939, 943, 957, 961, 1085, 1089 | `accountType` echoed in `/api/auth/*` workspace payloads (943/961/1089 are **duplicate keys, `TS1117`**) |
| 1963-1965 | `initialVerificationStatus` — `company` → `not_verified`/`under_review`; everything else → `verified` |
| 1974 | `ownerUserId` set only when `accountType !== 'company'` |
| 1984-1996 | auto traction slug for `individual` only |
| 2574, 2635, 2720, 2769 | `accountType` in company/profile responses |
| 2594, 2902 | individual-specific profile branches |
| 2898 | `discoverable` forced `false` for `individual` |
| 3102 | `const isFreelancer = company.accountType === 'individual'` |
| 3165 | tender creation: `accountType !== 'company'` → reject |
| 3276 | invite-individual: caller must be `company` |
| 3287 | invite target must be `individual` |
| 4807-4812 | offer audience gate; **maps `team` → `company`** |
| 4842 | pre-offer verification check, `company` only |
| 6960-6976 | marketplace: `callerAccountType` → `marketplaceAudienceFor()` |

## Data access (`server/storage.ts`)

- `576`, `1050`, `2209` — `eq(companies.accountType, 'company')`
- `618`, `1557`, `1623`, `1648`, `2219` — `eq(companies.accountType, 'individual')`
- `2286`, `2312` — admin funnel analytics; buckets only `individual` vs everything-else (**`team` falls into the company bucket**)
- `server/lib/individual-sourcing.ts:39-41` — `marketplaceAudienceFor()`: only `individual` gets a filter; `company` and `team` get `undefined` (= no filter)

## Client — derivation

- `client/src/lib/useWorkspaceKind.ts:3-8` — `WorkspaceKind`, `useWorkspaceKind()` (**imported by nothing except the type import in `roles.ts` and a test**)
- `client/src/lib/auth.ts:51` — `accountType: 'company' | 'team' | 'individual'` on the active workspace
- `client/src/lib/roles.ts:5-25` — `ROLE_LABELS` per kind; `individual` maps **only** `owner`
- `client/src/lib/profile-url.ts:4-5` — `profilePath()`: `individual` → `/people/:slug`, else `/company/:slug`

## Client — gating sites

| File:line | Gate |
|---|---|
| `Dashboard.tsx:621-630` | `workspaceKind`, `isBuyerAccount = kind==='company'`, `requiresLegalVerification`, `isIndividual`, `isTeam`, `hasIndividualWorkspace` |
| `Dashboard.tsx:974-977` | tab list: `tenders`/`vendors` = `canManage && isBuyerAccount`; `profile-link` = `isIndividual \|\| isTeam` |
| `Dashboard.tsx:1742-1813` | **3 overview stat cards gated on `canManage` only — no account-type gate** |
| `Dashboard.tsx:1924-1927, 1995, 2031, 2067, 2101` | onboarding checklist tasks |
| `Dashboard.tsx:2452-2453, 2617` | proposals sub-tabs hidden for individual/team |
| `Dashboard.tsx:3300-3360` | profile-link panel |
| `Settings.tsx:649-653` | `workspaceKind` + three booleans |
| `Settings.tsx:1053, 1097, 1516, 1535, 1542, 1547, 1550, 1677, 1716` | `!isIndividual` gates |
| `Settings.tsx:1788, 1878` | verification blocks — `isCompanyWorkspace` only |
| `Settings.tsx:178, 272, 291` | `TeamMembersSection`; role dropdown differs by kind |
| `SettingsIntegrations.tsx:63, 81` | individuals blocked |
| `Marketplace.tsx:201, 260, 274, 325, 413, 427, 435, 463, 746, 981` | individual-specific marketplace |
| `CompanyProfilePage.tsx:94, 201-209, 277-279, 687` | routes individuals to `IndividualProfilePage` |
| `IndividualProfilePage.tsx:26, 123-124, 258, 365` | `isCompanyViewer` gates the Invite-to-Tender button |
| `ProfileEditorRouter.tsx:8-9` | `/company/edit` → `IndividualProfileEditor` for individuals |
| `CompanyProfileEditor.tsx:236-237, 895-897` | |
| `submit-offer-modal.tsx:340` | `isCompanyWorkspace` |
| `CreateTender.tsx:192-194`, `create-tender-modal.tsx:146-148` | copy varies by kind (**both files unrouted, see orphans**) |
| `DashboardGuard.tsx:24` | |

## Creation paths

- `client/src/pages/onboarding/account-type.tsx` — the chooser
- `client/src/pages/onboarding/individual-basics.tsx:72` — `accountType: 'individual'`
- `client/src/pages/onboarding/team-basics.tsx:53` — `accountType: 'team'`
- `client/src/pages/onboarding/company-basics.tsx` — company (default)
- `client/src/components/CreateTeamDialog.tsx:51, 74` — in-dashboard team creation, `accountType: "team"`

## i18n keys (`client/src/lib/i18n.tsx`; `en:` @8, `ar:` @4189)

EN and AR are at **exact parity: 3990 keys each, zero divergence either direction** (verified by path-diffing both halves).

Account-type keys (EN line / AR line):
`dashboard.individualRestrictedTitle` 249/4430 · `dashboard.individualRestrictedDesc` 250/4431 · `dashboard.roleIndividual` 251/4432 · `dashboard.createTeam` 257/4438 · `dashboard.profileLinkFreelancer` 261/4442 · `profileLinkTeam` 262 · `profileLinkTitleFreelancer` 263 · `profileLinkTitleTeam` 264 · `profileLinkDescFreelancer` 265 · `profileLinkDescTeam` 266 · `completionBasicsFreelancer`…`completionLinksTeam` 275-296 · `task2TitleTeam` 447 · `task2DescTeam` 449 · `task5TitleIndividual` 467 · `task5DescIndividual` 468 · `onboardingPanel.stepTeam` 809 · `stepTeamHeadline` 855 · `roleAdminTeamDesc` 891 · `roleMemberTeamDesc` 893 · `tenderFlow.audienceTeams` 2107 · `audienceIndividuals` 2108 · `onboardingTeamBasics.*` 2548-2562 · `teamInvite.*` 3020 · `profileRequiredTeamDesc` 3119 · `profileRequiredIndividualDesc` 3120 · `landing.freelancers` 3181 · `profEditor.profileEditTeam` 3396 · `profileEditIndividual` 3397 · `navTitleTeam` 3788 · `navTitleIndividual` 3789 · `accountTypeChoice.individual` 4082 · `individualDesc` 4083 · `openToIndividuals` 4124 · `createTeamDialog.*` 4140-4146 · `activateIndividual` 4157 · `marketplaceInd.forIndividuals` 4162 · `forIndividualsSub` 4163

Note the `Freelancer` key suffix persists although `464fe39` removed the word from English copy.

## Email templates (`server/email.ts`)

- No template branches on account type. `sendTeamInviteEmail` (`:1278`) is used for both `company` and `team` workspaces.
- `sendInactivityWarningEmail` (`:1450`) is individual-only in *intent* (Discovery) but takes no account-type parameter.

## Tests

- `tests/bid-188-company-regression.test.ts:30-49` — default `company`, rejects `"enterprise"`
- `tests/bid-189-individual-team-flows.test.ts:16-229` — imports `WorkspaceKind`; **re-implements** `deriveWorkspaceKind` (`:207-208`) rather than importing `useWorkspaceKind`
- `tests/bid-190-targeting-migration.test.ts:135-199` — defaults + `shouldSetOwnerUserId` (also a re-implementation)
- No test exercises a real route guard.

## Orphans (zero inbound imports / no route)

- `client/src/pages/CreateTender.tsx` — not in `App.tsx`; `TenderCreateChoice` is the live route
- `client/src/components/create-tender-modal.tsx` — not imported anywhere
- `client/src/pages/requester-dashboard.tsx`, `vendor-dashboard.tsx`, `VendorsBase.tsx`, `VendorOnboarding.tsx`, `VendorStatus.tsx`, `VendorPreQualification.tsx`, `VendorInvitation.tsx`, `RequesterProfile.tsx`, `invitation-links.tsx`, `invitation-signup.tsx`, `AdminJoinRequests.tsx`, `SettingsNotifications.tsx`, `JoinByCode`-adjacent legacy pages — none routed in `App.tsx`
- `client/src/lib/useWorkspaceKind.ts` — the hook itself is never called; every consumer re-derives `activeCompany.accountType` inline

---
Indexed at commit `8d21da125a385ceb359e5f9b0d16c6a2090191cb`
