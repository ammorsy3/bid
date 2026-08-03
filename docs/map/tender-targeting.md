# Index: tender targeting (`targetAudienceTypes`)

Greppable index, not documentation. Line numbers are as of the SHA at the bottom.

## Aliases

| Layer | Name |
|---|---|
| DB column | `tenders.target_audience_types` |
| Drizzle/TS | `targetAudienceTypes` |
| Server params | `audienceType` (singular — the *filter* value), `callerAccountType` |
| Error codes | `AUDIENCE_RESTRICTED`, `AUDIENCE_MISMATCH` |
| UI copy | "Audience" / "Companies" / "Teams" / "Individuals" |
| i18n | `tenderFlow.audienceHeading`, `audienceDesc`, `audienceCompanies`, `audienceTeams`, `audienceIndividuals`, `audienceRequired` |

## DB schema — declared twice, conflicting

- `shared/schema.ts:294-295` — `jsonb("target_audience_types").$type<('company' \| 'individual')[]>().default(['company','individual'])`
  Comment: "Who can apply: 'company' | 'individual'. Default both." **Dead — overridden.**
- `shared/schema.ts:354-355` — `text("target_audience_types").array().default(sql`'{company}'::text[]`)`
  Comment: "Values: 'company' | 'team' | 'individual' (multi-select)". **Effective.** `TS1117` at :355.

So: effective storage type is `text[]`, effective default is `{company}`, effective TS type is `string[]`.

## Migrations — declared twice, conflicting

- `migrations/0002_account_type.sql:5-6` — `ADD COLUMN IF NOT EXISTS target_audience_types jsonb DEFAULT '["company","individual"]'`
- `migrations/0002_freelancer_accounts.sql:11` — `ADD COLUMN "target_audience_types" text[] DEFAULT '{company}'`

**Both are numbered `0002`.** They disagree on type *and* default. Nothing in the repo records which one was applied to dev or to prod. `drizzle.config.ts` uses `drizzle-kit push`, and `migrations/meta/0000_snapshot.json` predates both.

- `docs/freelancer-individual-team-accounts-spec.md:61` — spec says `text('target_audience_types').array().notNull().default(['company'])` (`notNull`, which neither migration nor schema applies)

## Validation

- `server/routes.ts:3191-3200` — `POST /api/tenders`: `req.body.targetAudienceTypes ?? ['company']`; requires non-empty array, every element in `ACCOUNT_TYPES` (`company`|`team`|`individual`). Error message names all three.
- `shared/schema.ts:1249-1261` — `insertTenderSchema` / `createTenderSchema` are `createInsertSchema(tenders)`-derived, so the field is inherited from the **`text[]`** declaration and is **not** in the `.omit()` list → it flows through.
- No zod validation of element values in the schema itself; only the hand-rolled check at `routes.ts:3195`.

## Write path

1. `client/src/pages/TenderSubmissionProcessStep.tsx:39` — state initialised to `['company','individual','team']`
2. `:74-75` — hydrates from draft
3. `:104, :170` — writes into the wizard draft
4. `:245` — blocks Next when empty
5. `:357-380` — three checkboxes (`company`, `team`, `individual`)
6. `client/src/pages/TenderReview.tsx:50` — state initialised to `['company']`; **no `useEffect` hydrates it from the draft** (`setTargetAudienceTypes` appears only at `:53`, inside `toggleAudienceType`)
7. `:280` — `data.targetAudienceTypes = targetAudienceTypes`
8. `:391` — `POST /api/tenders`
9. `:906-928` — three toggle buttons on the review page
10. `server/lib/launch-tender.ts:88-100` — `createTenderSchema.parse(payload)` → spread into `storage.createTender`
11. `server/storage.ts:1082-1083` — `db.insert(tenders).values(...)`

Also written by: `server/routes.ts:3313` — `updateTender(tenderId, { targetAudienceTypes: [...audience, 'individual'] })` when a requester confirms widening the audience to invite an individual.

## Read path / enforcement

| Line | Where | Rule |
|---|---|---|
| `server/storage.ts:2830-2831` | marketplace listing | `sql\`${audienceType} = ANY(${tenders.targetAudienceTypes})\`` — **Postgres array operator; requires `text[]`, fails on `jsonb`** |
| `server/routes.ts:6957-6976` | `GET /api/marketplace` | `callerAccountType` → `marketplaceAudienceFor()` |
| `server/lib/individual-sourcing.ts:39-41` | `marketplaceAudienceFor` | returns `"individual"` for individuals, **`undefined` for `company` and `team`** (= no filter at all) |
| `server/routes.ts:3382` | recommended-tenders | hardcodes `audienceType: 'individual'` |
| `server/routes.ts:4806-4818` | offer submission | `companyType === 'team' ? 'company' : companyType`, then `targetAudienceTypes.includes(...)` → `403 AUDIENCE_RESTRICTED` |
| `server/routes.ts:3302-3314` | invite-individual | `409 AUDIENCE_MISMATCH` unless `addAudience` |

## Display

- `client/src/pages/tender-details.tsx:953-963` — renders audience chips. Labels are **hardcoded English** (`'Companies' : 'Teams' : 'Individuals'`) despite `tenderFlow.audienceCompanies/audienceTeams/audienceIndividuals` existing in both locales.
- `client/src/components/InviteToTenderModal.tsx:16-21, 78-80` — `audienceIncludesIndividual()`; `:76` `invitable` filters `status !== "closed" && status !== "awarded"`

## i18n keys

EN/AR at exact parity. Relevant keys: `tenderFlow.audienceHeading`, `audienceDesc`, `audienceCompanies`, `audienceTeams` (@2107), `audienceIndividuals` (@2108), `audienceRequired`. All present in both locales; **`audienceTeams` and `audienceIndividuals` are referenced only by the two wizard steps, not by the tender-details chips.**

## Email templates

No email template references audience or targeting.

## Seed data / fixtures

None. No seed script exists in the repo.

## Tests

- `tests/bid-190-targeting-migration.test.ts` — the whole file
  - `:8-13` header comment declares the intended matrix
  - `:20-26` `canCallerSeeTender()` — a **local re-implementation**, `tenderAudienceTypes.includes(caller)`. Does not import or exercise `marketplaceAudienceFor`, the SQL, or the offer gate.
  - `:45-60` asserts a `['team']` tender **is** visible to a team and **not** to a company
  - `:127` "sees nothing when targetAudienceTypes excludes undefined"
  - `:135-155` schema-default assertions
- `tests/bid-189-individual-team-flows.test.ts` — account-type flows, touches targeting indirectly

## Orphans

- `shared/schema.ts:294-295` — the entire `jsonb` declaration and its `('company'|'individual')[]` type are unreachable
- `migrations/0002_account_type.sql` — one of the two `0002` files is dead, but which one is not recorded anywhere

---
Indexed at commit `8d21da125a385ceb359e5f9b0d16c6a2090191cb`
