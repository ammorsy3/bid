# Index: Discovery / individual discoverability

Greppable index, not documentation. Line numbers are as of the SHA at the bottom.

## Aliases

| Layer | Name |
|---|---|
| DB column | `company_profiles.discoverable` |
| Drizzle/TS | `discoverable` |
| UI copy | "Discovery" (capital D, the product surface) |
| API paths | `/api/individuals/directory`, `/api/tenders/:id/suggested-individuals`, `/api/individuals/recommended-tenders` |
| Storage methods | `searchIndividuals`, `getSuggestedIndividualsForTender`, `getIndividualsNearingInactivityCutoff` |
| Adjacent, **different** concept | `company_profiles.is_public` — the traction/storefront page. Schema comment at `:198` explicitly says "unrelated to Discovery". Easy to confuse. |
| Adjacent, **different** concept | "domain-based workspace discovery" (`routes.ts:1605`, `publicEmailDomains.ts:2`) — email-domain workspace matching, nothing to do with this |

## DB schema

- `shared/schema.ts:198` — comment separating `isPublic` from Discovery
- `shared/schema.ts:200-203` — `discoverable: boolean("discoverable").default(true).notNull()`; comment: "Individual's opt-in for the Discovery tab. Actual visibility also requires the account to be verified and active within 30 days — see `storage.searchIndividuals` / `getSuggestedIndividualsForTender`."
- `shared/schema.ts:45-47` — `users.lastLoginAt`, comment: "drives the Discovery 'active in last 30 days' cutoff"
- `shared/schema.ts:48-50` — `users.inactivityWarningSentAt`

## Migrations

- `migrations/0004_direct_individual_team_access.sql:11-17` — "Discovery is paused product-wide." Sets `discoverable = false` for every `account_type='individual'` profile.
- No migration changes the column **default**, which remains `true`.
- No migration for `inactivity_warning_sent_at` exists in `migrations/` — the column is only in `shared/schema.ts`. Applied to prod out-of-band (per project notes), not tracked here.

## API handlers (`server/routes.ts`)

| Line | Route | State |
|---|---|---|
| 121-129 | activity tracking on authenticated requests; sets `lastLoginAt`, clears `inactivityWarningSentAt` | **live** |
| 2799 | `PUT /api/companies/:id/profile` destructures `discoverable` from body | live |
| 2894-2899 | validates `discoverable` is boolean, then **`profileUpdates.discoverable = company.accountType === 'individual' ? false : discoverable`** | live, force-false for individuals |
| 3361-3369 | `GET /api/tenders/:id/suggested-individuals` — body replaced with `404 "Individual suggestions are not available."` | **disabled** |
| 3373-3390 | `GET /api/individuals/recommended-tenders` — `requireAccountType('individual')`, real implementation | **live** (comment at 3361 does not apply to it) |
| 5223-5231 | `GET /api/individuals/directory` — `404 "Individual discovery is not available."` | **disabled** |
| 5234-5271 | `POST` connect-from-directory (`joinMethod: 'directory'`, `metadata.method: 'directory'`) | **live**, but its only entry point (the directory) is disabled |

No cron/scheduled route exists anywhere in `server/` or `api/`. `vercel.json` declares **no `crons` array**.

## Data access (`server/storage.ts`)

| Line | Method | Filter chain |
|---|---|---|
| 260, 1548-1603 | `searchIndividuals` | `accountType='individual'` (1557) + `verificationStatus='verified'` (1561) + `discoverable IS NULL OR = true` (1563) |
| 1639-1690 | `getSuggestedIndividualsForTender` | `accountType='individual'` (1648) + `onboardingState='completed'` + `verified` (1651) + `discoverable` (1652) + active within 30 days |
| 262, 1610-1634 | `getIndividualsNearingInactivityCutoff` | `individual` (1623) + `completed` + `verified` (1627) + `discoverable` (1628) + `inactivityWarningSentAt IS NULL` (1629) + last activity in the warn window |

`server/lib/individual-sourcing.ts` — `scoreSuggestion` (`:94-110`) ranks candidates; `+20` for `verificationStatus === "verified"`.

**Callers:** `searchIndividuals` and `getSuggestedIndividualsForTender` are reached only by the two disabled routes. `getIndividualsNearingInactivityCutoff` has **zero callers** anywhere in the repo.

## Email templates

- `server/email.ts:1447-1486` — `sendInactivityWarningEmail`
  - `:1463` subject EN — "Your profile is about to disappear from Discovery"
  - `:1472` body — "your profile will stop showing in Discovery in N days"
  - `:1476` — "To keep Discovery full of active individuals, we automatically hide profiles that haven't logged in for over 30 days."
  - `:1482` footer — "your individual profile on Bid is listed in Discovery"
  - Arabic variants inline via `isAr`
  - **Exported, never imported, never called.**

## Client

- `client/src/lib/auth.ts:34` — `discoverable: boolean` on the profile type
- `client/src/pages/IndividualProfileEditor.tsx:47` — `discoverable?: boolean` in the fetched shape
- `client/src/pages/IndividualProfileEditor.tsx:156` — save mutation hardcodes `discoverable: false`
- **No Discovery toggle UI remains** — the control added in `b9dbe42`/`7962f90` and surfaced on the dashboard is gone from `IndividualProfileEditor.tsx` and `Dashboard.tsx` as of this SHA.
- `client/src/pages/Marketplace.tsx:264-274, 435-462` — consumes `/api/individuals/recommended-tenders` (live route)
- Nothing in the client calls `/api/individuals/directory` or `/api/tenders/:id/suggested-individuals`.

## Adjacent live surface — individual sourcing without Discovery

- `client/src/pages/IndividualProfilePage.tsx:10, 365-370` — renders `InviteToTenderModal`, gated on `isCompanyViewer` (`:123`)
- `client/src/components/InviteToTenderModal.tsx` — posts `/api/tenders/:id/invite-individual`
- Reachable at `/people/:slug` via `CompanyProfilePage.tsx:209` → `IndividualProfilePage`
- So a company can still invite an individual **if it already has the profile URL** — there is no longer any in-app way to find one.

## i18n keys

EN/AR are at exact parity (3990 keys each, zero divergence).

Discovery-specific keys: none survive under a `discovery.*` namespace. The inactivity email builds its copy inline in `server/email.ts` (not via i18n).

## Tests

- `tests/individual-sourcing.test.ts:142-153` — `scoreSuggestion` unit tests; exercise the ranking function only, never the routes
- No test covers `discoverable`, the directory route, or the inactivity query

## Orphans / dead ends

| Thing | Status |
|---|---|
| `server/email.ts:1450 sendInactivityWarningEmail` | exported, zero callers |
| `server/storage.ts:1610 getIndividualsNearingInactivityCutoff` | zero callers |
| `server/storage.ts:1548 searchIndividuals` | only caller is a route that 404s |
| `server/storage.ts:1639 getSuggestedIndividualsForTender` | only caller is a route that 404s |
| `users.inactivityWarningSentAt` | only ever **cleared** (`routes.ts:127`) and read (`storage.ts:1629`) — never set to a timestamp |
| `POST` connect-from-directory (`routes.ts:5234`) | live, unreachable entry point |

---
Indexed at commit `8d21da125a385ceb359e5f9b0d16c6a2090191cb`
