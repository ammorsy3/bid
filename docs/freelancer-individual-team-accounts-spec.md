# Freelancer / Individual / Team Account Types + RFP Audience Targeting

## Context

Today the platform is company-only: every user must belong to a company workspace, verified by Commercial Registration (CR). We want to support **individual freelancers** and **teams of freelancers** as first-class account types, so that:

- Freelancers can sign up, verify with their National ID, and respond to RFPs as vendors — no company required.
- Freelancers can collaboratively form **Teams** that share a profile, invite teammates, and respond to RFPs collectively with a role hierarchy (Admin / BD / Member).
- Companies launching RFPs can intentionally target Companies / Teams / Individuals (multi-select).

Outcome: open the marketplace beyond companies, advertise "freelancers and teams welcome" on the landing page, and capture work in the long tail of small projects that don't justify a full corporate vendor.

## Architectural foundation

`Company`, `Team`, and `Individual` are the **same primitive** — a multi-user workspace with roles. We add a `kind` discriminator on the existing `companies` table instead of building parallel tables.

This reuses, with zero rewrites:

- `userCompanies` (many-to-many users↔workspaces with roles `owner/admin/member/viewer`) — `shared/schema.ts:202-217`
- Team invitation flow (Postmark + token + 7-day expiry, EN/AR templates) — `server/routes.ts:1957-2151`, `server/email.ts:1221-1273`
- Member management UI — `client/src/pages/Settings.tsx`
- Public profile link (`companyProfiles.tractionSlug`) — already powers the "Profile Link" concept
- Profile editor / portfolio / certifications / `companyProfiles` JSON — `client/src/pages/CompanyProfileEditor.tsx`

### Role mapping (no schema change to roles)

User-facing role names depend on workspace `accountType`. The underlying `roleInCompany` enum stays exactly as-is.

| Workspace kind | Owner       | Admin   | Member                          | Viewer                       |
|----------------|-------------|---------|---------------------------------|------------------------------|
| `company`      | Owner       | Admin   | Member                          | Viewer                       |
| `team`         | Admin       | Admin   | **BD** (Business Developer)     | **Member** (credit-only)     |
| `individual`   | (sole user) | —       | —                               | —                            |

Permission semantics on the team mapping:

- **Admin** (DB: `owner`/`admin`): full permissions — invite/remove teammates, edit team profile, apply to RFPs, send inquiries.
- **BD** (DB: `member`): can apply to RFPs and send inquiries on the team's behalf.
- **Member** (DB: `viewer`): credit-only — they exist in the team so their work is added to the team's portfolio/profile, but no action permissions.

---

## Schema changes (`shared/schema.ts`)

### `companies` table — add discriminator + identity fields

```ts
accountType: text('account_type').notNull().default('company'),
  // 'company' | 'team' | 'individual'
nationalIdNumber: text('national_id_number').unique(),
  // 10-digit, for individual / team admin
ownerUserId: uuid('owner_user_id').references(() => users.id),
  // For individual: == sole user. For team: == creator admin.
```

Migration: existing rows default to `accountType='company'` — every workspace today is a company, so this is safe and non-breaking.

### `tenders` table — add audience targeting

```ts
targetAudienceTypes: text('target_audience_types').array().notNull().default(['company']),
  // Subset of: ['company', 'team', 'individual']. Non-empty.
```

Migration: existing tenders default to `['company']` (matches current implicit behavior).

### `companyDocuments.documentType` enum

Add `'national_id_card'` so individuals/team admins can upload their ID under the existing document infrastructure.

### Verification status

Reuse existing `companies.verificationStatus` enum (`not_verified | under_review | verified | rejected`). For individuals and teams, "verified" means National ID accepted. Same admin review path, just different document.

---

## Backend changes (`server/routes.ts`, `server/storage.ts`)

### New middleware

```ts
requireAccountType(...types): only listed account types may proceed
```

Apply `requireAccountType('company')` to **buyer-side** routes:

- `POST /api/tenders` (`server/routes.ts:2753-2809`)
- `GET/POST/DELETE /api/vendors-base/*` (`server/routes.ts:4552+`)
- Audit pass: any other endpoint that assumes the active workspace is a buyer.

Individuals and teams retain full access to:

- `POST /api/tenders/:id/offers` (responding to RFPs)
- `POST /api/join-requests` (asking to join a buyer's vendor base)
- Profile editing, settings, integrations
- Team admins: invitation, role changes, member removal (already works via `userCompanies` flow)

### Onboarding endpoints

- `POST /api/onboarding/account-type` — record the user's fork choice and route to the next step
- `POST /api/companies` — extend to accept `accountType`, `nationalIdNumber`, `ownerUserId`
- `PATCH /api/companies/:id/verify-national-id` — new, mirror of existing `verify-info` (CR path). Captures National ID number + document upload.

### Tender filtering

- `GET /api/marketplace` — filter to tenders where the active workspace's `accountType` ∈ `tender.targetAudienceTypes`.
- `GET /api/tenders/discoverable` (if separate) — same filter.

### Tender creation

`POST /api/tenders` — accept `targetAudienceTypes` in request body; validate it's a non-empty subset of `['company','team','individual']`.

---

## Frontend changes

### New pages

- `client/src/pages/onboarding/account-type.tsx` — 3-way fork: Company / Team / Individual. First step after email verification.
- `client/src/pages/onboarding/individual-basics.tsx` — lightweight version of `company-basics.tsx` (name only).
- `client/src/pages/onboarding/individual-verify.tsx` — National ID number + ID card upload.
- `client/src/pages/onboarding/team-basics.tsx` — team name + (optional) category. Creator becomes admin.
- `client/src/pages/onboarding/team-invite.tsx` — wraps existing `invite-team.tsx` logic with team-flavored copy and the BD/Member labels.

### Conditional UI based on `activeWorkspace.accountType`

Drive a single helper `useWorkspaceKind()` that returns `'company' | 'team' | 'individual'`, used everywhere a label or section needs to flex.

- **Sidebar / nav** (`client/src/components/AdminLayout.tsx`, `client/src/components/navbar.tsx`):
  - Hide "Create Tender", "Vendor Base", "Awards" for `individual` and `team`.
  - Show "Profile Link" entry for `individual` and `team` (deep link to the `tractionSlug` public page).
- **`CompanyProfilePage.tsx`** + **`CompanyProfileEditor.tsx`**:
  - For `individual`: page title "My Profile"; portfolio section titled "Previous Works".
  - For `team`: title "Team Profile"; portfolio "Team Previous Works".
  - Replace "Company Profile" wording everywhere with conditional labels.
- **`Settings.tsx`**:
  - Hide buyer-side tabs (Vendor Base settings, anything tender-launch related) for non-company workspaces.
  - Keep Members tab for `company` and `team`; hide for `individual`.
  - On the Members tab for `team`, surface roles using the BD/Member labels.

### Tender wizard — audience targeting

Add a multi-select audience control in **`TenderReview.tsx`** (just above the marketplace publish option — same "publishing scope" mental model). Defaults to `['company']` to preserve current behavior on edit.

Files involved:

- `client/src/pages/TenderReview.tsx` — the new control + submission
- `client/src/pages/CreateTender.tsx` — pass `targetAudienceTypes` through the wizard state
- `client/src/pages/TenderStartMethodStep.tsx:426-461` — no step reordering needed

### i18n (`client/src/lib/i18n.tsx`)

Add string keys (EN + AR) for:

- Account-type choice copy ("I'm a Company" / "I'm a Team" / "I'm an Individual")
- "Previous Works" / "Team Profile" / "Profile Link"
- BD / Member role labels for team members
- Target audience multi-select labels
- National ID verification copy

---

## Critical files to modify

| Concern | File |
|---|---|
| Schema + migration | `shared/schema.ts` |
| Auth/middleware | `server/routes.ts` (new `requireAccountType`, applied to buyer routes) |
| Tender create | `server/routes.ts:2753-2809` |
| Marketplace filter | `server/routes.ts` (marketplace + discoverable queries) |
| Storage queries | `server/storage.ts` (filter by `accountType`) |
| Onboarding pages | `client/src/pages/onboarding/` (5 new pages) |
| Sidebar/nav | `client/src/components/AdminLayout.tsx`, `client/src/components/navbar.tsx` |
| Profile UI | `client/src/pages/CompanyProfilePage.tsx`, `CompanyProfileEditor.tsx` |
| Tender wizard | `client/src/pages/TenderReview.tsx`, `CreateTender.tsx` |
| Settings | `client/src/pages/Settings.tsx` |
| Role label helper | new `client/src/lib/roles.ts` |
| Workspace kind helper | new `client/src/lib/useWorkspaceKind.ts` |
| i18n | `client/src/lib/i18n.tsx` |
| Auth store | `client/src/lib/auth.ts` — surface `activeWorkspace.accountType` |

---

## Verification plan

1. **Onboarding (all three forks)**:
   - New account → choose "Company" → existing CR flow works unchanged
   - New account → choose "Individual" → upload National ID → land on individual dashboard with renamed nav
   - New account → choose "Team" → set team name → invite teammates → teammates accept via existing email flow → roles render as BD/Member
   - Existing accounts open without prompts (migration default = 'company')

2. **Permissions**:
   - As individual or team BD: `POST /api/tenders` returns 403
   - As individual or team: sidebar has no "Create Tender" / "Vendor Base" / "Awards"
   - As team Member (DB: viewer): can view team profile but cannot apply or send inquiries
   - As team BD (DB: member): can apply to RFPs and send inquiries
   - As team Admin: can invite/remove teammates and change roles
   - As company: full existing flow works unchanged

3. **Tender targeting**:
   - As company, create a tender targeting `['individual']` only → individuals see it in marketplace, other companies do not
   - As company, create a tender targeting `['company','team','individual']` → all three account types see it
   - As company, create a tender targeting `['team']` only → only teams see it
   - Default remains `['company']`

4. **Profile**:
   - Individual profile page reads "My Profile" / "Previous Works"
   - Team profile page reads "Team Profile" / "Team Previous Works"
   - Public `tractionSlug` page works for individuals and teams; surfaces a "Profile Link" copy CTA in the owner's dashboard

5. **Member management**:
   - Team admin invites teammate via existing flow → email arrives → teammate signs up + joins with assigned role
   - Team admin changes a teammate from BD to Member → permissions update on next request
   - Team admin removes a teammate → that user loses access to the team workspace

6. **Regression**:
   - Run the project's test suite
   - End-to-end smoke: existing company onboarding and tender creation as a verified company must work identically to today
   - Verify migration applied correctly on a copy of production data (every existing workspace = `accountType='company'`, every existing tender = `targetAudienceTypes=['company']`)

---

## Estimated effort

~7–10 working days for one engineer:

- 1–2d — Schema + migration + storage layer
- 1d — `requireAccountType` middleware + applying to buyer-side routes
- 1d — Onboarding 3-way fork + National ID verification endpoint
- 2d — Individual/Team onboarding pages + conditional UI + role label helper
- 1d — Tender wizard target-audience step + marketplace/discoverable filtering
- 1d — Settings/profile relabeling + i18n
- 1–2d — Cross-account testing + edge cases (mixed memberships, role downgrades, etc.)

---

## Out of scope (post-MVP follow-ups)

- Plan/billing differences between account types
- Individual-to-Team upgrade (converting an individual workspace into a team)
- Team-to-Company upgrade (a team that incorporates and gains a CR)
- Automated National ID verification via a government API (this plan uses the existing manual admin review path)
- Filtering vendor-base join requests by account type
