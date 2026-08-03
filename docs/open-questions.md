# Open questions — account type × surface

Generated from the code at commit `8d21da1`.

## How to answer

Every row is a fragment of one sentence. Read it as:

> **Should** `<Who>` **be able to reach** `<Can currently reach>`**?**

So Q-001 reads: *"Should an **individual** be able to reach the **"Vendors in Base"
stat card on the dashboard**?"* — and the code's current answer is yes, because a
freelancer opening their dashboard sees that card today. You're telling me whether
that's what you meant.

**Fill in the** `Answer` **column in PART 1 and stop.** That's the whole job.
PART 2 is reference — only scroll to it when a one-liner isn't enough to decide.

- `Y` = yes, it **should** be able to reach this. Correct as built, I leave it alone.
- `N` = no, it **shouldn't**. It's a bug, I'll fix it.
- `?` = you're not sure / it needs a real decision. I'll leave it open, not guess.

Worked example — **Q-001**:

- `N` ⇒ a freelancer should never see a vendor-count card. I add `isBuyerAccount`
to the gate at `Dashboard.tsx:1742`; the card disappears for individuals and
teams, companies unaffected. One line.
- `Y` ⇒ it belongs there and stays. (I'd push back once — the card always reads 0
because the API rejects the request — but it's your call.)

Two rows don't fit the "who reaches what" shape, and are marked `(all)` under Who:

- **Q-012** = *Is "Teams" a real tender audience?* `Y` ⇒ the server's `team → company`
mapping is the bug. `N` ⇒ the wizard checkbox is the bug.
- **Q-028** = *Should the* `national_id_number` *column be dropped from the database?*

You can also write a few words instead of a letter (`N — kill it entirely`).
Anything that isn't `Y` gets treated as "don't ship as-is".

**If you only have ten minutes**, answer the 12 rows marked `yes` in the
"Answer first?" column. A row is marked `yes` for one of two reasons: either your
answer changes what other questions mean (Q-012 decides whether `team` is a real
audience at all; Q-022 decides whether Discovery stays), or it's something a user
runs into during normal use. The unmarked 28 are real but quieter — dead code,
orphaned endpoints, residue nobody is currently tripping over. They can wait.

---



# PART 1 — Answer here

> **Should** `<Who>` **be able to reach** `<Can currently reach>`**?**



## A. Individual on buyer-shaped surfaces (11)


| ID    | Answer first? | Who              | Can currently reach                          | Smells because                                                 | Answer |
| ----- | ------------- | ---------------- | -------------------------------------------- | -------------------------------------------------------------- | ------ |
| Q-001 | yes           | individual       | "Vendors in Base" stat card on the dashboard | an individual **is** the vendor                                | no     |
| Q-002 | yes           | individual       | "Active RFPs" stat card                      | individuals can't create RFPs, so it's always 0                | no     |
| Q-003 | yes           | individual       | "Pending Proposals" stat card                | counts proposals *received*; individuals only send             | no     |
| Q-004 |               | team             | all three stat cards above                   | teams aren't buyers either (`isBuyerAccount` = company only)   | no     |
| Q-005 |               | individual       | the Vendors Base tab **body**                | tab button is hidden, panel isn't                              | no     |
| Q-006 |               | individual       | the Tenders tab **body**                     | same                                                           | no     |
| Q-007 | yes           | individual, team | `/tenders/new`                               | auto-verified, so it redirects them **into** the wizard        | no     |
| Q-008 | yes           | individual, team | all 12 `/tenders/new/*` wizard steps         | they fill in a whole RFP, then get 403 at submit               | no     |
| Q-009 |               | individual, team | "AI Chat History" sidebar + its `+` button   | it's a tender-creation entry point                             | no     |
| Q-010 |               | individual, team | `/tenders/:id/edit`                          | no ownership or account-type check on the client               | no     |
| Q-011 |               | individual       | `/proposals` + Proposals tab                 | probably right — confirming the "received" split is deliberate | yes    |




## B. Team — the least-defined account type (8)


| ID    | Answer first? | Who   | Can currently reach                       | Smells because                                           | Answer                                                              |
| ----- | ------------- | ----- | ----------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| Q-012 | yes           | (all) | "Teams" as its own tender audience        | a `['team']` RFP is submittable by **nobody**            | yes                                                                 |
| Q-013 | yes           | team  | every marketplace tender, unfiltered      | individuals get filtered, teams don't                    | no, it should get filtered                                          |
| Q-014 |               | team  | verify-info GET/PATCH endpoints           | migration 0004 says teams are exempt from verification   | yes                                                                 |
| Q-015 |               | team  | being demoted `verified` → `under_review` | no UI for a team to resubmit                             | no                                                                  |
| Q-016 |               | team  | `/settings/integrations` + API keys       | commit said "block individuals" — teams maybe incidental | no                                                                  |
| Q-017 |               | team  | join code + member invitations            | teams and companies share one membership model           | yes                                                                 |
| Q-018 | yes           | team  | the `business_developer` role             | that role fails **every** server-side permission check   | yes there should be a biz dev role                                  |
| Q-019 |               | team  | the "verified companies" admin count      | teams are auto-verified, inflating the number            | oh yes, even if teams are auto verified now, that wont last forever |




## C. Discovery residue (5)

> **Should** `<Who>` **be able to reach** `<Can currently reach>`**?**


| ID    | Answer first? | Who        | Can currently reach                             | Smells because                                                 | Answer                                                                                                                  |
| ----- | ------------- | ---------- | ----------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Q-020 |               | company    | "Invite to Tender" on an individual's profile   | no in-app way to *find* an individual anymore                  | yes, they should be able to invite them to a tender and they should be able to select from their published tenders/RFPs |
| Q-021 |               | company    | connect-from-directory endpoint                 | its only entry point returns 404                               | no they shouldnt                                                                                                        |
| Q-022 | yes           | individual | `discoverable`, always force-written to `false` | is Discovery coming back or not? gates ~200 lines              | discovery isnt coming back                                                                                              |
| Q-023 |               | individual | the inactivity-warning email (in principle)     | promises a Discovery feature that's switched off               | no remove the inactivity email                                                                                          |
| Q-024 | yes           | individual | `/api/individuals/recommended-tenders`          | comment above it says suggestions are disabled; this one isn't | disable suggestions, and the discovery forever                                                                          |




## D. National ID + verification residue (6)

> **Should** `<Who>` **be able to reach** `<Can currently reach>`**?**


| ID    | Answer first? | Who                       | Can currently reach                            | Smells because                                                | Answer                                                                                                                        |
| ----- | ------------- | ------------------------- | ---------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Q-025 |               | company, team, individual | `nationalIdNumber` in every auth response      | always `null`, still shipped to every client                  | no, because we removed the national id number                                                                                 |
| Q-026 |               | company                   | the 10-digit National-ID validator at signup   | last surviving enforcement of a removed requirement           | no, remove it. we dont have a direct way to verify individuals currently, but for companies they have CR number and docs etc. |
| Q-027 |               | platform admin            | `national_id_card` document counts             | no upload slot, no label, still counted                       | no remove it                                                                                                                  |
| Q-028 | yes           | (all)                     | the `national_id_number` column + unique index | still live in the DB for a field you can't legally collect    | remove the national ID field in the DB. in both prod and dev                                                                  |
| Q-029 |               | individual, team          | a "Verified" badge                             | means "legally reviewed" for a company, "signed up" for these | yes, there should be a verified badge, we just dont have a way to allow users to actually verify currently                    |
| Q-030 |               | individual, team          | verification exemption via **two** mechanisms  | change one and they disagree                                  | ?                                                                                                                             |




## E. Cross-cutting / I genuinely can't tell (10)

> **Should** `<Who>` **be able to reach** `<Can currently reach>`**?**


| ID    | Answer first? | Who                       | Can currently reach                                   | Smells because                                                  | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | ------------- | ------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-031 |               | company, team, individual | Settings workspace tab, relabelled per kind           | the 3 labels are hardcoded English                              | yes they should reach the settings workspace tab ofcourse                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Q-032 |               | company, team, individual | Settings account + notifications tabs                 | an unrouted `SettingsNotifications.tsx` also exists             | yes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Q-033 |               | company, team, individual | `/marketplace`                                        | branches on individual, has no team branch at all               | make a branch for teams                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Q-034 |               | company, team, individual | `/traction/:slug/edit`                                | no ownership or account-type check                              | no, only companies should have access to traction pages. if someone visits an individual traction page or team they should get redirected to that individual's profile /people/=slug, or that team's profile /company/=slug in that case. also remove traction page section from the individuals and team's settings                                                                                                                                                                                      |
| Q-035 |               | company, team, individual | `/join/:code`, `/team-invite/:token`                  | what happens to an individual's own workspace?                  | individuals shouldnt have a join code, if an individual gets invited by a company then that company's workspace just gets added and thats it, the individual can always switch between their originial individual account or that invited company account                                                                                                                                                                                                                                                 |
| Q-036 | yes           | legacy workspaces         | those with `accountType = null`                       | read as company by 2 files, not-company by 4, company on server | ?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Q-037 | yes           | company                   | creating a company-only RFP by accident               | review page silently discards the audience you picked           | no, the company must choose the audience/ fix that                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Q-038 |               | company                   | widening a live RFP's audience by inviting one person | changes who may bid, for everyone                               | no, lets say a company selected only other companies as the audience for their tender, and they saw an individual and they wanna invite them to one of their published RFPs, then once he selects the RFP he wants, and if that RFP audience is only company, then the requester should get a note declaring that this RFP is only allowed to be submitted by companies, want to add individuals as an audience in that tender so u can invite this individual? or something along those lines and simply |
| Q-039 |               | company, team, individual | English-only audience chips on tender details         | translations exist and are used elsewhere                       | translate on the tender details of course                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Q-040 |               | company                   | cancelled tenders in the invite picker                | client and server keep two different status lists               | ?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |




## Progress

Answered: **13 / 40** · of the "answer first" rows: **13 / 13** (all of them)

Answered so far — Q-001 N · Q-002 N · Q-003 N · Q-007 N · Q-008 N · Q-012 **Y** ·
Q-013 N · Q-018 **Y** · Q-022 N (gone for good) · Q-024 N · Q-028 N (drop the
column) · Q-036 ? (left open) · Q-037 N

Still open: Q-004, Q-005, Q-006, Q-009, Q-010, Q-011, Q-014–Q-017, Q-019, Q-020,
Q-021, Q-023, Q-025–Q-027, Q-029–Q-035, Q-038–Q-040. None of these block the work
the answered rows imply.

---



# PART 2 — Detail

Only read the entry you're stuck on. Format: what the code does, where, and what
changes if you answer N.

---



### Q-001 · `individual` → "Vendors in Base" stat card

- **Where:** `client/src/pages/Dashboard.tsx:1790-1811`
- **Why it's reachable:** gated on `canManage` (`:617`), which is true for any owner/admin. An individual owns their own workspace, so it's true for them.
- **What happens:** the query hits `/api/vendors-base`, which rejects them via `requireAccountType('company')` (`server/routes.ts:5165`), so the card renders **0**. Clicking it → `setActiveTab('vendors')` → `/vendors` → `DashboardGuard.tsx:26` bounces back with a "restricted" toast.
- **Contradicts:** `:976`, where the matching tab button uses `canManage && isBuyerAccount`.
- **If N:** add `isBuyerAccount` to the gate at `:1742`.



### Q-002 · `individual` → "Active RFPs" stat card

- **Where:** `Dashboard.tsx:1744-1765`
- **Why:** same `canManage`-only gate.
- **What happens:** `canCreateTenders = isBuyerAccount` (`:628`), so the count is structurally always 0. Clicking → `/rfps` → bounced with a toast.
- **If N:** same one-line fix as Q-001.



### Q-003 · `individual` → "Pending Proposals" stat card

- **Where:** `Dashboard.tsx:1767-1788`
- **Why:** same gate. Counts `incomingOffers` from `/api/my-tenders/offers`.
- **Note:** this one is *arguably* different from Q-001/002 — if you think individuals should see a count of proposals they've **sent**, the answer is "keep the card, change what it counts". Say so and I'll treat it as a rewrite, not a removal.



### Q-004 · `team` → all three stat cards

- Same three lines. `isBuyerAccount` is `workspaceKind === 'company'`, so teams are explicitly excluded from buyer surfaces everywhere *except* here.
- **If N:** the fix for Q-001 covers this automatically.



### Q-005 · `individual` → Vendors Base tab body

- **Where:** `Dashboard.tsx:2797` — `{canManage && (<TabsContent value="vendors">`
- The tab *trigger* (`:976`) is correctly hidden; the tab *content* is not. So the panel is one `setActiveTab('vendors')` away, with no tab bar entry to navigate back from.
- **If N:** add `isBuyerAccount` at `:2797`.



### Q-006 · `individual` → Tenders tab body

- **Where:** `Dashboard.tsx:2206`. Identical pattern to Q-005.



### Q-007 · `individual`, `team` → `/tenders/new`

- **Where:** `App.tsx:158` — the route has **no guard at all**.
- `TenderCreateChoice.tsx:39-44`: if `verificationStatus === 'verified'`, it immediately `setLocation('/tenders/new/manual', { replace: true })`.
- Individuals and teams are auto-verified at creation (`server/routes.ts:1963-1965`), so they pass that check and get pushed straight into the wizard.
- **If N:** account-type gate on the route, bouncing non-companies to `/dashboard`.



### Q-008 · `individual`, `team` → the 12 wizard steps

- **Where:** `App.tsx:159-170`, each wrapped in `RequireVerified`.
- `RequireVerified.tsx` checks **only** `verificationStatus === 'verified'` — it is account-type blind. Auto-verified individuals/teams pass every step.
- They're stopped only at the final `POST /api/tenders` (403 via `requireAccountType('company')`, `routes.ts:3155`) — after filling in title, scope, budget, submission process, evaluation criteria, vendor requirements and brief.
- **If N:** either add an account-type check to `RequireVerified`, or a second wrapper. This is the worst wasted-effort path in the app right now.



### Q-009 · `individual`, `team` → AI Chat History sidebar

- **Where:** component at `Dashboard.tsx:317-396`, rendered **ungated** at `:1220`. Its `+` button (`:357`) navigates to `/tenders/new/ai`.
- Sits directly below a create-tender button that **is** correctly hidden for these types (`:1075`, `canManage && canCreateTenders`).
- **If N:** wrap `<ChatHistorySidebar />` in the same condition.



### Q-010 · `individual`, `team` → `/tenders/:id/edit`

- **Where:** `App.tsx:173`. `TenderEditPage.tsx` has no `isAdmin`, no `canManage`, no `accountType`, no ownership check on the client.
- I did **not** verify what the server does on the underlying PATCH. If you answer N I'll check that first rather than only patching the client.



### Q-011 · `individual` → `/proposals`

- **Where:** `DashboardGuard.tsx:11` lists only `/rfps` and `/vendors` as buyer-only, so `/proposals` is open.
- Probably correct — individuals do submit proposals. But the "received" sub-tab is separately hidden at `:2453`, so the tab is half buyer-shaped. Answering Y just confirms the split is deliberate.

---



### Q-012 · Is `team` a real tender audience?

- **Offered:** `TenderSubmissionProcessStep.tsx:359` and `TenderReview.tsx:908` both show a "Teams" checkbox. `routes.ts:3195` accepts it.
- **Enforced:** `routes.ts:4809` — `audienceType = companyType === 'team' ? 'company' : companyType`.
- **Result:** a tender targeted at `['team']` alone is submittable by nobody. Teams test `'company'` → not in list → 403. Companies test `'company'` → not in list → 403. Individuals test `'individual'` → 403.
- **Y** ⇒ the `team → company` mapping at `:4809` is the bug.
- **N** ⇒ the "Teams" checkbox in both wizard steps is the bug.
- Note `tests/bid-190-targeting-migration.test.ts:45-60` asserts **Y** behaviour, against a local re-implementation the server never calls.



### Q-013 · `team` → unfiltered marketplace

- **Where:** `server/lib/individual-sourcing.ts:40` — `return callerAccountType === "individual" ? "individual" : undefined`.
- `undefined` means "no audience filter", so teams see every tender including company-only ones.
- Depends on Q-012.



### Q-014 · `team` → verify-info endpoints

- **Where:** `routes.ts:2100` (GET) and `:2130` (PATCH) — neither has `requireAccountType`.
- Contradicts `migrations/0004:1-2` ("Individuals and teams do not require legal or National-ID verification") and `Settings.tsx:1788`, which hides the legal-info card for non-companies.
- A team admin can still PATCH a CR number onto a team workspace via the API.



### Q-015 · `team` → demotion to `under_review`

- **Where:** `routes.ts:2856-2857` (editing legal fields demotes a verified workspace) and `:3097-3100` (uploading a document promotes `not_verified`/`rejected` → `under_review`). Neither checks account type.
- A team auto-verified by migration 0004 can be knocked back into the review queue, and the UI that would let them resubmit is hidden for teams.
- **Confidence note:** I could reach this via the API but could not construct it from the UI. Marked MEDIUM in the sweep.



### Q-016 · `team` → integrations / API keys

- **Where:** `server/routes/settings/integrations.ts:27` — `requireAccountType("company", "team")`.
- Commit `1688ae3` is titled "Block API access for individual accounts". Teams were left in — deliberate, or just "not individual"?



### Q-017 · `team` → join code + invitations

- **Where:** `Settings.tsx:1547`, gated `canManageCompany && !isIndividual`.
- Likely correct. Queued because it means teams and companies share one membership model while `roles.ts:5-20` renames the same DB roles differently per kind — `member` displays as "Business Dev" for teams.



### Q-018 · `team` → the `business_developer` role

- **Offered:** `Settings.tsx:291` and `:1593` (role dropdown), `onboarding/team-invite.tsx:27` (the **default** for new team invites).
- **Missing from:** `roleHierarchy` in `requireCompanyRole` (`routes.ts:210-215`) — an unknown role scores `0`, so it fails every server-side role check. Also missing from `ROLE_LABELS` (`roles.ts:5-20`), which maps `member → "Business Dev"` instead.
- So the default role for an invited team member may be one the backend doesn't recognise. **I have not verified end-to-end what an invited business_developer can actually do** — if you answer anything other than Y, I'll test that first.



### Q-019 · `team` in the admin verified-company count

- **Where:** `storage.ts:2312` — buckets are `individual` vs everything-else, so teams land in the company bucket. `:2249` counts all `verified` workspaces.
- Teams are auto-verified, so they inflate a number that otherwise means "passed legal review".

---



### Q-020 · `company` → "Invite to Tender" on an individual profile

- **Where:** `IndividualProfilePage.tsx:258, 365`, gated on `isCompanyViewer` (`:123`). Reachable at `/people/:slug`.
- The button works. But with Discovery off there's no in-app way to *find* an individual — only someone who already has the URL gets here.
- Not broken; possibly stranded. Depends on Q-022.



### Q-021 · `company` → connect-from-directory

- **Where:** `routes.ts:5234-5271`, live, records `joinMethod: 'directory'`.
- Its only entry point, `GET /api/individuals/directory`, returns 404 at `:5229`.



### Q-022 · Is Discovery coming back?

- **Off:** `migrations/0004:11-17` sets `discoverable=false` for every individual; `routes.ts:2898` force-writes `false` on every individual profile save; `routes.ts:3367` and `:5229` return 404; the UI toggle has been removed from `IndividualProfileEditor.tsx`.
- **Still there:** the column, default `true` (`schema.ts:203`), with a comment describing it as the individual's Discovery opt-in; three storage queries that filter on it; the inactivity email; `discoverable` on the client auth type.
- **Y (coming back)** ⇒ leave the residue, reconnect it, fix the never-set `inactivityWarningSentAt`.
- **N (gone for good)** ⇒ roughly 200 lines across schema, storage, email and two routes come out.



### Q-023 · `individual` → inactivity-warning email

- **Where:** `server/email.ts:1450-1486`. Copy at `:1463` — "Your profile is about to disappear from Discovery"; `:1476` — "we automatically hide profiles that haven't logged in for over 30 days".
- **Currently harmless:** `sendInactivityWarningEmail` and `storage.getIndividualsNearingInactivityCutoff` (`:1610`) have **zero callers**; there's no cron route in `server/` or `api/`; `vercel.json` declares no `crons`.
- **Latent bug if reconnected:** `users.inactivityWarningSentAt` is only ever *cleared* (`routes.ts:127`), never set — so it would re-warn the same user every run.
- Depends on Q-022.



### Q-024 · `individual` → recommended-tenders

- **Where:** `routes.ts:3373-3390`, fully implemented and live. `Marketplace.tsx:264-274, 435-462` consumes it.
- The comment at `routes.ts:3361` — "Discovery and automatic individual suggestions are temporarily disabled" — sits directly above it but applies only to the route at `:3362`.
- Was this meant to be disabled with the rest, or deliberately kept?

---



### Q-025 · `nationalIdNumber` in auth responses

- **Where:** `routes.ts:944, 962, 1090` (all three are duplicate-key `TS1117` sites), typed at `client/src/lib/auth.ts:56`.
- Always `null`. Still serialised to every client on every auth call.



### Q-026 · National-ID validator at signup

- **Where:** `shared/schema.ts:1210` — `z.string().regex(/^\d{10}$/, "National ID must be exactly 10 digits").optional()`.
- No form submits the field. This is the last enforcement of a removed requirement.



### Q-027 · `national_id_card` document counts

- **Where:** counted in `storage.ts:2334`, typed at `AdminUsers.tsx:46`, documented as a valid `document_type` at `schema.ts:225`.
- No upload slot offers it. Neither admin label map (`AdminVendors.tsx:59`, `AdminAwards.tsx:22`) has an entry, so a surviving row renders unlabelled.
- **Separate question if you answer N:** should existing `national_id_card` rows be *deleted*, not just hidden? That's a data decision, not a code one.



### Q-028 · the `national_id_number` column

- **Where:** added by `0002_account_type.sql:3` and `0002_freelancer_accounts.sql:7`; unique index added at `0002_freelancer_accounts.sql:13`. **Never dropped by any migration.**
- Commit `c6c5f61` deliberately scoped the removal to the UI layer.
- The column exists in a live database for a field you concluded was illegal to collect. Whether it holds data is a DB question I can't answer from the repo.
- **If N:** needs a migration applied to **both** dev and prod, plus a check of what's currently stored in the column before dropping it.



### Q-029 · "Verified" badge on individuals and teams

- **Where:** `IndividualProfilePage.tsx:124`, driven by `verificationStatus === 'verified'`, which `routes.ts:1965` sets automatically at creation for non-companies.
- Same badge, two meanings: "passed legal review" for companies, "completed signup" for individuals — shown on the profiles companies use to decide who to hire.



### Q-030 · double verification exemption

- **Where:** `routes.ts:165-167` (bypass by account type) **and** `routes.ts:1965` + `migrations/0004` (status set to `verified`).
- Two independent mechanisms producing the same exemption. If either is changed alone they disagree.

---



### Q-031 · Settings workspace tab label

- **Where:** `Settings.tsx:1002-1004` — `'Team Settings'` / `'Profile Settings'` / `'Company Settings'`, hardcoded English in a file that otherwise uses `t()`.
- Arabic users see English tab names.



### Q-032 · Settings account + notifications tabs

- **Where:** `Settings.tsx:1007-1011`.
- Queued only because `client/src/pages/SettingsNotifications.tsx` exists and is **not routed** in `App.tsx` — so there may be two notification surfaces, one dead.



### Q-033 · `/marketplace` for all types

- **Where:** `App.tsx:180`, no guard. `Marketplace.tsx` branches on `isIndividual` at `:201, 325, 413, 427, 981` and has **no** `team` **branch at all**.
- Teams get the company view of a surface they aren't audience-filtered on. Depends on Q-013.



### Q-034 · `/traction/:slug/edit`

- **Where:** `App.tsx:178`. `TractionLinkEditor.tsx` has no account-type or ownership check on the client.
- The traction page is a buyer-side storefront. As with Q-010, I have not verified the server side — if you answer N I'll check that first.



### Q-035 · `/join/:code` and `/team-invite/:token`

- **Where:** `App.tsx:135, 172`.
- Open question: can an individual workspace owner join a company via join code, and what happens to their individual workspace? `Dashboard.tsx:629-630` assumes at most one individual workspace per user (`hasIndividualWorkspace`) but nothing enforces it.
- I could not determine the intended behaviour from the code. This one is genuinely a product decision.



### Q-036 · `accountType = null` legacy workspaces

- **Read as** `company`**:** `Dashboard.tsx:621`, `Settings.tsx:649` (both use `?? 'company'`).
- **Read as not-company:** `DashboardGuard.tsx:24`, `Marketplace.tsx:201`, `SettingsIntegrations.tsx:63`, `IndividualProfilePage.tsx:123` (all use `(activeCompany as any)?.accountType === "..."`, no fallback).
- **Read as** `company` **again:** `routes.ts:165` treats `undefined` as company.
- Three readings of the same null. The DB column is `NOT NULL DEFAULT 'company'`, so this may be unreachable in practice — but `client/src/lib/useWorkspaceKind.ts` exists precisely to centralise this and is **called by nothing**.



### Q-037 · silently company-only RFPs

- **Where:** `TenderReview.tsx:50` — `useState(['company'])`, and no `useEffect` hydrates it from the wizard draft. The only `setTargetAudienceTypes` call is at `:53`, inside the user's toggle handler. `:280` POSTs whatever local state holds.
- Every other field on the review page hydrates from the draft; this one doesn't.
- A requester ticks "Individuals" at `/tenders/new/submission-process`, and the tender is created company-only.
- This is phrased as a question rather than a straight bug because there are two defensible fixes: hydrate from the draft, or make the review page the single source of truth for audience. Which do you want?



### Q-038 · widening a live RFP's audience

- **Where:** `routes.ts:3306-3313` — inviting an individual to a tender whose audience excludes them returns `AUDIENCE_MISMATCH`; confirming with `addAudience=true` appends `'individual'` to `targetAudienceTypes`.
- That changes who may bid on an already-published tender for **everyone**, not just the invitee.



### Q-039 · English-only audience chips

- **Where:** `tender-details.tsx:960` — `type === 'company' ? 'Companies' : type === 'team' ? 'Teams' : 'Individuals'`, hardcoded.
- `tenderFlow.audienceCompanies` / `audienceTeams` / `audienceIndividuals` exist in **both** locales (`i18n.tsx:2107-2108`) and are used correctly by both wizard steps.
- Same concept translated while creating, untranslated while reading.



### Q-040 · cancelled tenders in the invite picker

- **Client:** `InviteToTenderModal.tsx:76` — `status !== "closed" && status !== "awarded"`.
- **Server:** `routes.ts:3295` — rejects `'closed'` and `'cancelled'`.
- So a **cancelled** tender is offered and fails with a generic error toast; an **awarded** one is hidden but would be accepted.
- Underlying cause: `tenders.status` has no enum anywhere — `schema.ts:292` documents four values in a comment and doesn't include `'awarded'` at all.

---



## Not asked — access is currently **denied**

Listed so you can catch a *wrong* denial. If any of these should be allowed, tell me.

- `individual` **is blocked from:** `/rfps`, `/vendors` (route guard), the tenders and vendors tab buttons, the create-tender button, `/api/vendors-base`, `POST /api/tenders`, `/settings/integrations`, the proposals "received" sub-tab, the team members section, the join code card, both verification cards in Settings.
- `team` **is blocked from:** the create-tender button, the tenders and vendors tab buttons, `POST /api/tenders`, all `/api/individuals/`* routes, the verification cards in Settings.
- `company` **is blocked from:** `/api/individuals/recommended-tenders`, the individual profile editor.

---



## One thing I can't answer from the repo

There are two migrations both numbered `0002` that add `tenders.target_audience_types`
with **different types** — `jsonb` in one, `text[]` in the other. The marketplace
query uses `= ANY()`, which only works on `text[]`. Nothing records which migration
ran where, and dev and prod are separate databases.

```
! psql "$DATABASE_URL" -c "\d tenders" | grep target_audience_types
```

on both. If either says `jsonb`, individuals are getting a Postgres error on every
marketplace request in that environment right now.

---

Generated at commit `8d21da125a385ceb359e5f9b0d16c6a2090191cb`