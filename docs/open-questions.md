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



## Generated at commit `8d21da125a385ceb359e5f9b0d16c6a2090191cb`



# SWEEP 2 — joining, offer lifecycle, tender status (2026-08-04)

Same rules as above: read each row as **"Should** `<Who>` **be able to reach**
`<Can currently reach>`**?"** Answer `Y` / `N` / `?` in the Answer column.

Indexes: `docs/map/joining-a-workspace.md`, `offer-lifecycle.md`,
`tender-lifecycle-status.md`.

## F. Joining a workspace (8)


| ID    | Answer first? | Who            | Can currently reach                                       | Smells because                                                                     | Answer                                                                                                                                                                   |
| ----- | ------------- | -------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q-041 | yes           | company, team  | inviting a member with the **default** role               | server rejects it; UI says "sent" anyway. Nobody is invited                        | no, if it says sent then it should actually send the invite obviously.                                                                                                   |
| Q-042 | yes           | (all)          | the `invitation_links` table                              | zero code touches it; zero rows; its UI is unrouted                                | i dont understand this one. how are users supposed to reach the invitations links table anyways                                                                          |
| Q-043 | yes           | (all)          | the `membership_requests` flow                            | fully built, 4 routes, 2 emails — **never used once** in production                | well if you mean there is an email sequence that consists of 2 emails and never used in prod, then why? dev should match prod in terms of what emails should get sent yk |
| Q-044 |               | platform admin | `/api/admin/join-requests` endpoints                      | live and admin-guarded, but `AdminJoinRequests.tsx` is unrouted, so there is no UI | well that endpoint is useless because i dont want to add it via the UI, adding admins should be done via the admin itself not inviting someone to become so              |
| Q-045 |               | (all)          | `invitation-signup.tsx`                                   | complete page, not routed, no live backing flow                                    | sure delete it then                                                                                                                                                      |
| Q-046 |               | company, team  | `team_invitations.role` documented as admin/member/viewer | omits `business_developer`, which is now real and is the invite default            |                                                                                                                                                                          |
| Q-047 |               | (all)          | three vocabularies for one decision                       | reject / denied / rejected, `rejectionReason` vs `decisionReason`                  | use rejected                                                                                                                                                             |
| Q-048 |               | individual     | being invited to a company workspace                      | works today; confirm an individual keeps their own workspace and can switch        |                                                                                                                                                                          |




## G. Offer / proposal lifecycle (5)


| ID    | Answer first? | Who     | Can currently reach                                    | Smells because                                                 | Answer                                                                                                                                                                                                        |
| ----- | ------------- | ------- | ------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-049 | yes           | company | setting an offer to `shortlisted`                      | real and used, but undocumented in the schema                  | how could a company shortlist an offer? where is that in the UI?                                                                                                                                              |
| Q-050 | yes           | vendor  | **no notification when shortlisted**                   | the decision email only handles accepted/rejected              | how could a company shortlist an offer? where is that in the UI?                                                                                                                                              |
| Q-051 |               | (all)   | `superseded` documented but unreachable via the API    | server-set only, and it has no translation in either locale    | okay add a translation then buddy                                                                                                                                                                             |
| Q-052 |               | (all)   | `offers` in the DB vs "proposals" everywhere in the UI | three names for one row; `/proposals` route hits `/api/offers` | the api doesnt matter or the whole backend wouldnt change anything for the user bro. as long as its functioning then what its called wont matter                                                              |
| Q-053 |               | (all)   | offer status with no enum or CHECK constraint          | four sources disagree on the allowed set                       | add a CHECK constraint to both, listing the values that are actually in use. It's a small migration and it makes the database refuse anything the app doesn't recognise. Must be applied to dev **and** prod. |




## H. Tender lifecycle status (4)


| ID    | Answer first? | Who     | Can currently reach                                   | Smells because                                                                 | Answer                                                                                                                                                                                                        |
| ----- | ------------- | ------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-054 | yes           | company | cancelling an RFP they can then never filter for      | no `cancelled` tab; only `all` shows it                                        | okay small feature wouldnt matter much but there is no need to add a filter for cancelled since its "cancelled"                                                                                               |
| Q-055 |               | (all)   | `awarded` is not a tender status                      | awarding lives in the `awards` table; confirm tenders should not reflect it    |                                                                                                                                                                                                               |
| Q-056 |               | company | publishing straight from the wizard, skipping `draft` | `launch-tender.ts:99` sets `published` at creation; is `draft` ever reachable? |                                                                                                                                                                                                               |
| Q-057 |               | (all)   | tender status with no enum or CHECK constraint        | the state machine guards the API, nothing guards the column                    | add a CHECK constraint to both, listing the values that are actually in use. It's a small migration and it makes the database refuse anything the app doesn't recognise. Must be applied to dev **and** prod. |




## Replies to the questions you asked back (2026-08-06)



### Q-041 — decided and shipped

You said: *"if it says sent then it should actually send the invite obviously."*
Done. Two things were wrong, not one:

1. The server accepted only `admin`, `member`, `viewer`. It now accepts
  `business_developer` too — and it rejects `owner`, which is transferred, never
   handed out. Both places that check a role read the same list now
   (`ASSIGNABLE_ROLES` in `server/routes.ts`), so they cannot drift apart again.
   The role-change dropdown in Settings was broken by the same gap.
2. The onboarding invite page counted the rows *it* had sent and called them
  sent. It now reads what the server actually did with each address, and if any
   failed it says so, names them, and keeps you on the page so you can fix them.

Verified against the dev database: `admin`, `business_developer`, `member` and
`viewer` all pass; `owner` and nonsense are rejected. Checked on screen in both
English and Arabic.

### Q-042 — DECIDED: build it, don't delete it

You asked how users are supposed to reach it. They aren't and they can't. It is
not a page or a feature — it is a database table someone created for a "send an
invite link by email" idea that was never wired up. No route reads it, no route
writes it, nothing sends an email for it, and its three pages were never added to
the router. It holds zero rows and always has.

**I recommended deleting it. That was wrong, and Ahmed was right to push back.**
I said tender invitations by email "already work". They only work for people who
*already have a Bid account* — `POST /api/tenders/:id/invite-individual` takes an
`individualCompanyId`, and `InviteToTenderModal` is opened from an existing
vendor's profile. There is nowhere in the app to type an email address that isn't
already a user. That is exactly the hole `invitation_links` was dug for, and its
columns say so: `requester_company_id`, `tender_id`, `vendor_email`, `token`.

Most of the surrounding plumbing already exists:

- `/invite/:tenderId` is routed in **both** the logged-out and logged-in switches
(`App.tsx:104`, `:173`), so a stranger can already open an RFP and read it.
- That page already handles the anonymous case — it shows Log in / Sign up and
stores `postLoginRedirect` so they land back on the RFP after signing up.
- `sendTenderInvitationEmail` already exists and already sends the RFP link.

So the missing piece is genuinely small: a way to enter an email address, a row
in `invitation_links` to remember it, and a token so the invite can be tracked
and expired. See "Plan" below.

### Q-043 — CLOSED, no change

Ahmed: *"if nobody has never done it soo what?? we dont have much users anyway."*
Fair. Zero rows is a symptom of a small user base, not of a broken flow. Leaving
it alone. Explanation kept below for whoever reads this next.

I was unclear. `membership_requests` isn't two emails — it is the flow where **a
person asks to join a workspace** (the mirror of inviting them). It is fully
built and reachable:

1. You sign up with, say, `you@acme.com`.
2. Onboarding notices other people at `acme.com` already have a workspace and
  offers "Request to join".
3. You send the request; the workspace admins get an email.
4. They approve or deny it in Settings; you get an email back.

Zero rows in production means nobody has ever completed step 2 — not that it is
broken. Dev and prod run identical code here, so the emails behave the same in
both; there's nothing to bring in line.

But checking this did turn up a real gap — see Q-058.

### Q-049 / Q-050 — where shortlisting lives

Dashboard → **Proposals** → click a proposal to open it. At the bottom of that
panel, next to Accept and Ignore, there is a **Shortlist** button
(`Dashboard.tsx:3690`). It only appears while the proposal is still pending.
Clicking it marks the proposal shortlisted and shows a blue "Shortlisted" band.

So it is a real, shipped feature. Two things follow, and they are the actual
questions:

- **Q-049** — the schema comment lists `pending, accepted, rejected, superseded`
and never mentions `shortlisted`. Reading the schema, you'd conclude the
feature doesn't exist. Should the comment be corrected to match reality?
- **Q-050** — accepting or rejecting emails the vendor. Shortlisting emails
nobody. **Correction to what I said earlier:** shortlisting is *not* invisible
to the vendor — their own Proposals → Submitted list shows a "Shortlisted"
badge (`Dashboard.tsx:2539`). What's missing is only the push: they find out
only by logging in and looking. **Should being shortlisted email the
vendor?** **DECIDED 2026-08-11: no.** Ahmed: *"no its not worth an email."*
Consistent with what shortlisting actually is — see the table below. No change
made; the vendor still sees the badge if they look.

**What shortlisting actually does today**, end to end:


|                                                     |               |
| --------------------------------------------------- | ------------- |
| Sets `offers.status = 'shortlisted'`                | yes           |
| Badge on the buyer's Received list                  | yes (`:2685`) |
| Badge on the vendor's Submitted list                | yes (`:2539`) |
| Blue "Shortlisted" band in the proposal panel       | yes (`:3725`) |
| Hides the Shortlist button, keeps Accept and Ignore | yes (`:3689`) |
| Emails the vendor                                   | **no**        |
| Filter or sort by shortlisted anywhere              | **no**        |
| Any effect on awarding                              | **no**        |


In other words it is a bookmark — a private "come back to this one" marker that
happens to also be visible to the vendor. It doesn't shortcut anything later.
That is worth knowing before deciding whether it deserves an email.

### Q-054 — noted, no change

Agreed, leaving it. Cancelled RFPs stay visible under "All".

---



## Plan — invite a vendor by email address (Q-042, agreed 2026-08-08)

Goal, in Ahmed's words: *"the company could invite an email so they could submit
their RFP, the other person receives an email, and then opens it and sees the
RFP."*

What already exists, and must not be rebuilt:

- the public RFP page at `/invite/:tenderId`, working for logged-out visitors
- the sign-up-then-return handoff (`postLoginRedirect`)
- `sendTenderInvitationEmail`
- the `invitation_links` table, whose columns are already the right shape

What has to be built:

1. **A place to type an email.** An "Invite by email" field on the tender, next
  to the existing invite-an-existing-vendor path.
2. `POST /api/tenders/:id/invite-by-email`**.** Company accounts only, own
  published tender only — the same three gates `invite-individual` already
   applies, so the two cannot drift apart. Creates an `invitation_links` row with
   a fresh token and sends the email.
3. **Token handling.** `GET /invite/:token` resolves the link, marks it
  `accepted` the first time it's opened, and expires it after N days. Decide N.
4. **Don't invite the same address to the same tender twice** — mirror the
  `ALREADY_INVITED` check.
5. **If the address already belongs to a Bid user**, route it into the existing
  invitation flow instead of creating a parallel one, so the invite shows up in
   their "Invited to you" strip like any other.

Ahmed's answers, 2026-08-11, and what shipped in `73b8a2f`:

- **How long is a link valid?** *"as long as the RFP or tender is published and
open."* So there is no expiry column and nothing to tune — the tender's own
status is the expiry. A closed RFP closes its invitations for free.
- **May a stranger read it before signing up?** Yes. That is already how
`/invite/:tenderId` behaves, so nothing changed.
- **What if the address is already a Bid user?** *"they should just get the
invite and view the tender and be able to submit it."* Done — there is no
special case. The same email goes out and the same link works; being an
existing user only means they are already logged in when they arrive.

The two unrouted pages were left alone. Neither is needed: the invite reuses the
public RFP page, which already exists and already works.

**One thing the build exposed.** Submission enforces `targetAudienceTypes`, so
an invited stranger could read an RFP and then be refused when bidding, purely
because of the account type they happened to pick on the way in. A direct
invitation now overrides that one check — the audience decides who may *find* an
RFP, not who the requester may *name*. Deadline, published status and
verification all still apply.

## I. Follow-up found while answering (2026-08-06)


| ID    | Answer first? | Who   | Can currently reach                                     | Smells because                                                       | Answer |
| ----- | ------------- | ----- | ------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| Q-058 | yes           | (all) | asking to join an **individual** (freelancer) workspace | the same rule is enforced on two other doors and missing on this one |        |


**Q-058 in plain terms.** A freelancer's workspace is meant to be one person —
they *are* the vendor. Two ways in already respect that:

- the join-code page refuses individual workspaces (`routes.ts:2631`)
- searching for a workspace by name only returns `company` ones
(`storage.ts:1036`)

But the third way in — the "people at your email domain" suggestion during
onboarding — doesn't filter at all, and neither does the endpoint behind it. So a
new user at `mena.vt.edu` is offered the chance to join a freelancer's personal
workspace there, and that freelancer can approve it. It also suggests teams,
which the name search deliberately excludes, and it can suggest workspaces you
are already in.

**Should someone be able to request to join an individual workspace?** If no
(which I'd expect, given the other two doors), the fix is a filter in
`findCompaniesByMemberDomain` plus a guard on
`POST /api/companies/:id/membership-requests`. There is no bad data to clean up —
zero requests have ever been made.

---



## J. The ten still open (written up 2026-08-11)

Everything answerable from the code or the database has been answered below, so
what's left is only what needs your judgement. Each one says what I'd do.
Write your answer in the space after **Your call:**.

### Closed without needing you

- **Q-046 — DONE.** The schema comment for `team_invitations.role` still listed
the old three roles, which my own change made false. Fixed; it now points at
the one list both checks read.
- **Q-048 — no change needed.** Accepting a workspace invitation only *adds* a
membership; nothing removes the one you already have. An individual keeps
their own freelancer workspace and switches between the two. Confirmed in
`POST /api/team-invitations/:token/accept`, which only calls `addUserToCompany`.
- **Q-055 — no change needed.** `awarded` really isn't a tender status: nothing
in the codebase sets it and no tender in production has it. Awarding lives in
the `awards` table, and the schema comment is right to omit it.



### Still yours to decide

**Q-044 — an admin screen that exists but has no door.**
There are three working, admin-only endpoints for approving join requests, and a
finished page for them (`AdminJoinRequests.tsx`) that was never added to the
router. So the ability exists but nobody can reach it.
*What I'd do:* route the page — the endpoints are already written and guarded,
so this is one line to get a feature you've already paid for.
**Your call: DONE — routed.** (I had explained this badly the first time: these
endpoints are not about making someone an admin. They let a platform admin
approve a vendor company's request to join another company's Vendors Base.)

Routed at `/admin/join-requests` and added to the admin sidebar under
Operations, with a pending count that `getAdminMetrics` was **already
computing** for a page nobody could open.

**Routing it immediately exposed two bugs, neither visible from the code.** The
page rendered "Unknown Vendor", "Vendor Email: N/A" and a raw requester UUID:

1. It read `request.vendor`, but the endpoint returns `vendorCompany` /
   `requesterCompany`. It also printed `requesterId` rather than the requesting
   company's name, and asked for a vendor email — `companies` has no email
   column, so that line could never have shown anything.
2. `getAllJoinRequests` self-joined `companies` as
   `` sql<Company>`requester_companies` ``, which type-checks and returns
   nothing usable. Every row said "Requested by: N/A". Rewritten with drizzle's
   `alias()`.

Approve now works end to end: the vendor is added to the requester's base and
the badge clears.

**Q-045 — a signup page for a flow that now works differently.**
`invitation-signup.tsx` was built for the old invite idea. Invite-by-email now
uses the normal public RFP page and the normal signup, which is better — the
invitee reads the RFP first and signs up when they choose.
*What I'd do:* delete it. It can only rot and confuse the next person.
**Your call: DONE — deleted.** Ahmed: *"sure delete it then."*

**Q-047 — three words for one action.**
Turning down a join request is `rejected`, turning down a membership request is
`denied`, and the reason is stored as `rejectionReason` in one place and
`decisionReason` in the other. Nothing is broken; it just makes the code harder
to read and invites mistakes.
*What I'd do:* leave the database alone (renaming columns is real risk for zero
user benefit) and make the *user-facing* words consistent. Low priority.
**Your call: DONE — "rejected" everywhere.** Ahmed: *"use rejected."* Worth
noting the Arabic never had the drift: it already said رفض in every place. Only
the English said "Deny"/"Denied". The stored value moved from `denied` to
`rejected` too (both databases hold zero membership requests, so there was
nothing to migrate). The `decision_reason` column keeps its name — renaming a
column nobody sees, on an empty table, is risk without benefit.

**Q-051 — a status with no name.**
`superseded` is set when a vendor resubmits, replacing their old proposal. It
has no translation in either language and no badge, so if one were ever
displayed it would show blank. There are zero in production.
*What I'd do:* nothing now. Worth knowing, not worth touching.
**Your call: DONE — translated.** Ahmed: *"okay add a translation then buddy."*
"Replaced" / "مُستبدل", shown on both proposal lists. While adding it I found
the shared status map was also missing `shortlisted`, so that is fixed too — it
only escaped notice because the one caller passes it `accepted` and nothing
else.

**Q-052 — "offer" in the database, "proposal" everywhere you look.**
The table is `offers`, the API is `/api/offers`, and every screen says
"Proposal". Each layer is consistent with itself and none agree.
*What I'd do:* nothing. Renaming touches the database, the API and every screen,
and users only ever see "Proposal", which is the right word. Worth writing down
so nobody "fixes" half of it later.
**Your call: no change.** Ahmed: *"the api doesnt matter or the whole backend
wouldnt change anything for the user bro. as long as its functioning then what
its called wont matter."* Agreed and recorded, so nobody renames half of it
later.

**Q-053 / Q-057 — nothing stops a nonsense status.**
Neither `offers.status` nor `tenders.status` has a database constraint. The API
guards them, but any bug or manual query could write anything at all. That's how
`shortlisted` came to exist without anyone documenting it.
*What I'd do:* add a CHECK constraint to both, listing the values that are
actually in use. It's a small migration and it makes the database refuse
anything the app doesn't recognise. Must be applied to dev **and** prod.
**Your call: DONE — `migrations/0010_status_check_constraints.sql`**, applied to
dev and prod. `offers.status` is now limited to pending / shortlisted /
accepted / rejected / superseded, `tenders.status` to draft / published /
closed / cancelled. Verified beforehand that no row in either database would
violate them, and audited every write in the server: all inside the lists (the
two `'awarded'` writes are on the `awards` table, not tenders).

**It paid for itself immediately.** The dev database had one offer with status
`submitted` — a value no code path can produce. The constraint traced it to
`tests/helpers/fixtures.ts`, which had been inserting it since the fixture was
written. Fixed to `pending`. That is precisely the leak this was meant to
close.

**Q-056 — the draft state nobody uses.**
Creating an RFP publishes it straight away; the wizard never makes a draft. The
only way to get one is to unpublish a published RFP. Production has never had a
single draft.
*What I'd do:* keep it. It costs nothing and unpublishing is a reasonable thing
to want. Just don't build anything else on the assumption that drafts exist.
**Your call: kept** (no objection raised). `draft` is in the CHECK constraint,
so unpublishing still works.

**Q-058 — the third door into a freelancer's workspace.**
A freelancer's workspace is meant to be one person. Join-by-code refuses them
and workspace search excludes them, but the "people at your email domain"
suggestion during onboarding doesn't filter at all — so a stranger can ask to
join a freelancer's personal workspace, and the freelancer can accept.
*What I'd do:* close it, so all three doors agree. No data to clean up — nobody
has ever sent one of these requests.
**Your call: DONE — closed.** Two changes, because the suggestion list was never
the only way in: `findCompaniesByMemberDomain` no longer offers individual
workspaces, and `POST /api/companies/:id/membership-requests` refuses them with
`INDIVIDUAL_WORKSPACE`. Verified against a real freelancer workspace in dev: 403.
All three doors now agree.

## Progress — sweep 2

**Sweep 2 is complete — all 18 answered.**

Shipped: Q-041, Q-042, Q-044, Q-045, Q-046, Q-047, Q-051, Q-053, Q-057, Q-058.
Closed with no change: Q-043, Q-048, Q-049, Q-050, Q-052, Q-054, Q-055, Q-056.

Still owed from sweep 1: re-check the 329 unreferenced i18n keys. Three more
hardcoded-English spots turned up today by accident, so that bucket is still
paying out.