# Database merge plan — `eczogii` → `qjwulf`

**Goal:** make `qjwulfdbuekvnqhqqbxk` the single production database, carrying all
data currently in `eczogiidmkcicseowmve`.

**Status:** analysis complete, nothing written. Production is currently served by
`eczogii` and is healthy.

Snapshots taken 2026-08-02T13:49Z: `~/bid-db-snapshots/20260802T134917Z/{eczogii,qjwulf}.dump`
(custom format, `--no-owner --no-acl`). These contain production PII — do not commit.

---

> Email addresses in this document are masked. The full values are in the
> database; they are not committed to the repo.

## 1. What we're merging

Two databases forked from a common ancestor around **2026-03-12** and both kept
receiving writes. Neither is a subset of the other.

- `eczogii` — served bidapp.sa for at least the last 19 days, and holds all recent
  activity. 80 users, 77 tenders, 22 offers.
- `qjwulf` — intended as production, never served traffic until a ~10-minute
  window on 2026-08-02. 42 users, 43 tenders, 14 offers. Has **9 users, 6
  companies, 4 tenders and 1 offer that `eczogii` does not have**, dating back to
  March.

**Schemas are identical** — every column, type and nullability matches. No DDL
needed as part of the merge.

## 2. Scope

18 tables have rows in `eczogii` that must be inserted into `qjwulf`:

| Table | to insert | shared ids | qjwulf-only (leave alone) |
|---|---|---|---|
| users | 47 | 33 | 9 |
| companies | 30 | 28 | 6 |
| company_profiles | 28 | 28 | 6 |
| user_companies | 38 | 28 | 7 |
| tenders | 38 | 39 | 4 |
| offers | 9 | 13 | 1 |
| vendors_base | 9 | 6 | 3 |
| proposal_analyses | 5 | 5 | 3 |
| company_documents | 7 | 0 | 5 |
| purchase_orders | 13 | 0 | 2 |
| join_requests | 7 | 0 | 1 |
| team_invitations | 5 | 0 | 1 |
| trusted_browsers | 26 | 0 | 2 |
| tour_progress | 36 | 0 | 21 |
| audit_log | 17 | 0 | 5 |
| member_activity_log | 307 | 0 | 18 |
| ai_chat_sessions / messages | 54 / 213 | 0 | 3 / 20 |
| product_events | 1982 | 934 | 191 |
| error_logs | 477 | 21 | 84 |

Tables with no `eczogii`-only rows need no work: `offer_views`, `tender_questions`,
`tender_savings`, `tender_templates`, `admin_notifications`, `api_keys`, `awards`,
`integrations`, `invitations`, `negotiation_actions`, `notification_preferences`.

`object_acl` has no `id` column and needs a separate key strategy.

---

## 3. Decisions — ANSWERED 2026-08-03

| # | Decision | Answer |
|---|---|---|
| D-1 | Who wins on shared rows | **eczogii** |
| D-2 | The 4 duplicate humans | **Option B** — keep both accounts, rename the *qjwulf* email to `…+legacy@…` (never logged into, so nobody is locked out) |
| D-3 | `companies.slug` clash | **Keep eczogii's, rename qjwulf's** — qjwulf URLs were never public, so no shared link breaks |
| D-4 | `traction_slug` clashes | Same as D-3 |
| D-5 | `is_admin` disagreement | **Admin on both** |
| D-6 | Email disagreement | **Keep `a**********@seet-marketing.com`** |
| D-7 | `owner_user_id` on 28 companies | **Resolved, safe.** qjwulf has `owner_user_id` NULL on all 28; eczogii has a value on all 28. Taking eczogii fills empties — nothing is overwritten. Verified 2026-08-03 |
| D-8 | 6 tenders with different status | **No decision needed** — all 6 are `closed` in eczogii vs `published` in qjwulf, all with March deadlines long past. eczogii is correct; folded into D-1 |
| D-9 | History tables | **Skip `error_logs` and `product_events`.** Keep `audit_log` and `member_activity_log` |

**Dormant-account data — decided 2026-08-03: move it to the live account.** So
both logins are kept (D-2 Option B), but the content attached to the dormant
qjwulf accounts is repointed to the matching eczogii user. Affects 3 companies,
2 tenders and 1 offer:

| dormant qjwulf account | repoint to | records |
|---|---|---|
| `i***@bidapp.sa` (`de5225cf…`) | eczogii `7b11ec17…` | 1 company |
| `a**********@bookedbycold.com` (`6b31aa36…`) | eczogii `ce3393ab…` | 1 company |
| `a*******@gmail.com` (`c78e13d1…`) | eczogii `1188e640…` | 1 company, 2 tenders, 1 offer |
| `a******@builtcorrectly.org` (`43c0166d…`) | eczogii `0b4edcfa…` | nothing attached |

FKs to repoint: `user_companies.user_id`, `companies.owner_user_id`,
`tenders.created_by`, `offers.created_by`, plus any `audit_log` /
`member_activity_log` actor references.

**Observation, not acted on:** a large share of the merged rows are obviously test
data (`Test Company A7ur`, `Vendor 2 Corp`, `test_ai_…@example.com`). Pruning
those before the merge would be far easier than after, but classifying rows as
junk is a judgement call for Ahmed, not something to infer.

### Original detail

Recommendations given, but they're judgement calls about your business, not about
the code.

### D-1 — Precedence for shared rows *(gates everything else)*

33 users, 28 companies and 39 tenders exist in both with **different content**.
One version has to win.

**Recommendation: `eczogii` wins.** It has served live traffic for at least 19
days; its rows reflect what users have actually been doing. `qjwulf`'s versions
are effectively frozen at their fork point.

Exceptions worth carving out are listed below as D-5…D-8.

### D-2 — 4 users exist under two different IDs

Same email, different primary key. Inserting them violates `users_email_unique`.

| email | eczogii id | qjwulf id |
|---|---|---|
| `i***@bidapp.sa` | `7b11ec17…` | `de5225cf…` |
| `a******@builtcorrectly.org` | `0b4edcfa…` | `43c0166d…` |
| `a**********@bookedbycold.com` | `ce3393ab…` | `6b31aa36…` |
| `a*******@gmail.com` | `1188e640…` | `c78e13d1…` |

Each ID may have its own companies, tenders and offers hanging off it.

Options: **(a)** keep the `qjwulf` ID and repoint every `eczogii` FK to it — one
account per human, but rewrites references; **(b)** keep both as separate accounts
and change one email — no rewriting, but the person ends up with two logins;
**(c)** decide per person.

**Recommendation: (a)**, but I need to know these are genuinely the same human in
each case. Three of the four look like your own addresses.

### D-3 — `companies.slug` collision

`ahmed-farag` — `eczogii` `356206cb…` vs `qjwulf` `99172bc9…`. One must be
renamed; the slug is a public profile URL, so renaming breaks any shared link.

### D-4 — `company_profiles.traction_slug` collisions

`ahmed-farag` and `seet`, same situation. These are public storefront URLs.

### D-5 — One user's `is_admin` disagrees

`e832e59f…` (`X******@gmail.com`, "ahmed") is **admin in `eczogii`, not admin in
`qjwulf`**. Which is correct? Defaulting to `eczogii` grants platform admin.

### D-6 — One user's email disagrees

`1373de7a…` — `a**********@seet-marketing.com` (eczogii) vs `r***@req.com`
(qjwulf). The second looks like test data; the first looks real.

### D-7 — `companies.owner_user_id` differs on **all 28** shared companies

This is the exact field your earlier note flagged: a backfill written against one
database dropped every verification document when pointed at the other. Needs
inspection before overwriting — I'd rather diff these individually than bulk-apply.

`companies.join_code` also differs on all 28. Low stakes (regenerable), but it
means join codes currently circulating will change for whichever side loses.

### D-8 — 6 tenders have a different `status`

A tender that is `published` in one and `closed`/`cancelled` in the other. Taking
`eczogii` reopens or closes RFPs. Needs a per-tender look; I'll produce the list.

### D-9 — Do the history tables need to come across at all?

`product_events` (1982), `error_logs` (477), `member_activity_log` (307),
`ai_chat_messages` (213), `audit_log` (17) are append-only history. Migrating them
is ~3,000 of the ~3,600 rows in this job and carries most of the FK risk, for data
nobody reads day to day.

**Recommendation: skip `error_logs` and `product_events`.** Keep `audit_log` and
`member_activity_log` (compliance/traceability). This roughly halves the merge.

---

## 3b. Rehearsal result — PASSED 2026-08-03

Both snapshots restored into local scratch databases (Postgres 18.4 on port
5433, `rehearse_eczogii` / `rehearse_qjwulf`), with all 78 foreign keys and 13
unique constraints intact. `scripts/merge-databases.mjs` was run against them.

Final counts in the merged target, all exactly as predicted:

| table | before | after | = |
|---|---|---|---|
| users | 42 | 89 | 80 + 9 qjwulf-only |
| companies | 34 | 64 | 58 + 6 |
| company_profiles | 34 | 62 | 56 + 6 |
| user_companies | 35 | 73 | 66 + 7 |
| tenders | 43 | 81 | 77 + 4 |
| offers | 14 | 23 | 22 + 1 |

Verified after commit: zero orphaned references; zero duplicates on any unique
constraint; the four `+legacy` renames present; the three `-legacy` slug renames
present; D-5 admin correct; D-6 email correct; D-8 tenders closed; eight real
users trace end-to-end to their companies, tenders and offers.

**Three defects the rehearsal caught** (all would have failed against live data):

1. *Preflight false positive.* Column **order** differs on `companies` because
   `national_id_number` was dropped and re-added on 2026-08-02, which moves a
   column to the end. Fixed by comparing column **sets**, since every statement
   names its columns explicitly.
2. *jsonb corruption.* `node-postgres` infers wire format from the JS value, so a
   JS array bound to a `jsonb` column serialises as a Postgres array literal
   (`{a,b}`) instead of JSON (`["a","b"]`) — `invalid input syntax for type json`
   on all 28 `company_profiles` inserts. Fixed by stringifying json/jsonb values
   explicitly. Genuine `text[]` columns are deliberately left alone.
3. *Unique collision on account merge.* `tour_progress` is
   `UNIQUE(user_id, tour_id)`; both the dormant and the real account had
   dismissed the same tour, so repointing collided. Redundant dormant rows are
   now dropped rather than aborting — the real account already records the fact.

Also fixed: a single failure used to poison the transaction, so every later
statement failed with "current transaction is aborted" and hid the real errors.
Each row now runs inside a savepoint, so one run surfaces every genuine problem.

## 4. Execution plan (once D-1…D-9 are settled)

1. **Restore both dumps into scratch databases locally.** All rehearsal happens
   there. Neither live database is touched until the rehearsal passes clean.
2. **Build the insert set** in FK order:
   `users → companies → company_profiles → user_companies → tenders → offers →
   proposal_analyses → offer_views → vendors_base → company_documents →
   purchase_orders → join_requests → team_invitations → awards →
   negotiation_actions → tour_progress → trusted_browsers → audit_log →
   member_activity_log → ai_chat_sessions → ai_chat_messages`
3. **Apply the D-2 ID remapping** to every FK referencing a remapped user.
4. **Apply D-1 precedence** as `UPDATE`s on shared rows, minus the D-5…D-8 carve-outs.
5. **Run against scratch `qjwulf`.** Verify: row counts per table, zero orphaned
   FKs, all unique constraints intact, spot-check 10 known users end to end
   (login row → company → tender → offer).
6. **Deploy the spec-sweep code** (it must be live before `0006`/`0007` run).
7. **Maintenance window.** Re-dump both live databases, re-run the merge against
   live `qjwulf`, verify again.
8. **Repoint Vercel `DATABASE_URL` → `qjwulf`, redeploy, verify** via
   `/api/marketplace/stats` (`totalOffers` should be 3: 2 from eczogii + 1
   qjwulf-only) and a real login.
9. **Keep `eczogii` untouched and read-only** for at least a week as a fallback.

## 5. Verification checklist

- [ ] `users` count in qjwulf == 42 + 47 (minus D-2 merges)
- [ ] no orphaned FKs: every `user_companies.user_id`, `tenders.company_id`,
      `offers.tender_id` etc. resolves
- [ ] all 13 unique constraints hold
- [ ] the 4 D-2 humans have exactly one account each
- [ ] 10 spot-checked users can log in and see their own tenders/offers
- [ ] `/api/marketplace/stats` matches a direct SQL count against qjwulf
- [ ] no `42703` or FK errors in Vercel logs for 30 minutes after cutover

---

## 6. Risk notes

- This is a **merge of two production datasets**, not a copy. Every decision above
  changes real user-visible state.
- The 6 `companies.national_id_number` values in `eczogii` were destroyed earlier
  on 2026-08-02 by `0006_drop_national_id.sql`. `qjwulf` may still hold its own
  copies — check before overwriting, since the whole point of that migration was
  to stop holding them.
- Rotate the `qjwulf` database password (it was pasted in plaintext) **before**
  cutover, not after.

---
Prepared 2026-08-02 against snapshot `20260802T134917Z`.
