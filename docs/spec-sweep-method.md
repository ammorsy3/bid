# Spec bug sweeps — method and progress

A **spec bug** is code that compiles, typechecks and runs, yet contradicts what
the app is supposed to be. The build is green and the app is still wrong.

Two examples from this repo, both real:

- An `individual` account — a freelancer, who **is** the vendor — had a "Vendors
  in Base" card on their dashboard. The card fetched correctly and displayed 0.
  Perfect code; an individual can never manage vendors.
- National ID was removed from onboarding because collecting it was unlawful.
  The column, a unique constraint, a validator, an unused lookup and an orphaned
  document type all survived, because whoever removed it removed what they were
  looking at.

Neither is a crash. Both are the repo telling two different stories about the
same concept.

## Running one

Type **`/spec-sweep`**. The skill carries the method; this file carries what is
specific to this repo.

The shape of it, if you want to drive manually:

1. **Orient** — find the schema, migrations, routes, validation, i18n, guards.
   Do not write a spec first: this app is too large to enumerate from memory and
   a hand-written spec is stale within a fortnight.
2. **Pick concepts by contradiction risk**, not importance. The strongest signal
   is how many layers a concept touches — something living in one file cannot
   contradict itself. Then churn (`git log`), aliasing (`snake_case` vs
   `camelCase` vs a third name in the UI), and whether it gates access.
   Deliberately include one you are unsure about.
3. **Index each concept** into `docs/map/<concept>.md` — every location it
   appears, across schema, migrations, routes, components, validation, both
   locales, email, guards, tests. Optimise for greppability, not prose.
4. **Sweep for contradictions.** Partial removal · semantic self-contradiction
   (a value called `individual_*` reaching something team-shaped) · orphaned
   dependency · locale divergence · orphans and dead ends.
5. **Ask, do not guess.** Build the full account-type × surface matrix and turn
   every currently-allowed cell into a yes/no question in
   `docs/open-questions.md`. Be exhaustive — filtering to "the ones that are
   probably real" is exactly the judgement that produced the bugs.
6. **Write the rules down afterwards**, as a by-product of the answers. Never in
   advance, or you encode guesses as truth.

## Swept so far

**2026-08-02/03** — four concepts, indexed in `docs/map/`:

| Concept | Outcome |
|---|---|
| Account type (`company` / `team` / `individual`) | 11 contradictions; buyer surfaces reachable by non-buyers |
| Discovery | Removed entirely — routes, storage, an email with no caller, two columns |
| Tender targeting (`targetAudienceTypes`) | Declared twice with different Postgres types; `['team']` was submittable by nobody |
| Verification + National ID | Removal had been scoped to the UI only; the storage side was intact |

40 questions answered in `docs/open-questions.md` — that file is the record of
what was decided and why. All fixed and shipped.

## Not swept yet

From the original shortlist, ranked by contradiction risk:

- **Joining a workspace** — five tables for what looks like two ideas
  (`invitations`, `join_requests`, `membership_requests`, `team_invitations`,
  `invitation_links`), several consumers unrouted.
- **Offer / proposal lifecycle** — three names for one row (offers, proposals,
  bids); status is free text with no enum anywhere.
- **Tender lifecycle status** — same free-text problem. `schema.ts` documents
  four values in a comment and omits `awarded`, which the code uses.
- **Vendors Base** — buyer-only surface; who can reach it.
- **Integrations & API keys** — now company-only, worth confirming nothing else
  assumes teams still have access.

## What this run taught

- **The compiler was already shouting.** Seven `TS1117` duplicate-key errors sat
  in `npm run check`, unnoticed because the check was red for unrelated reasons.
  A red build hides real findings. Keep it green or keep a baseline count.
- **Translations existed and were never wired up.** Four separate Arabic bugs
  were keys already present in both locales, rendered as hardcoded English. The
  sweep counted 329 unreferenced i18n keys and skipped them as a known blind
  spot; Ahmed then found four by opening one page. Do not skip that bucket
  twice.
- **Nothing replaces opening the app — this is a rule, not advice.** Every visual
  bug in this round came from looking, none from tests. Proven twice: the brief
  step was rebuilt with a green typecheck and 124 passing tests, and shipped with
  its first visible section numbered "6" (numbers were static while sections are
  conditional) and an At a Glance card rendering as a bare header on an empty
  draft. Both were obvious on sight and invisible to every check. Tests confirm
  structure, not that a page reads correctly — especially in Arabic and RTL.
- **Answer questions with data where you can.** Two of the 40 questions
  dissolved once checked against the database: `accountType` could never be null
  (`NOT NULL DEFAULT`), and every disputed tender status was an expired March
  test record. Check before asking someone to decide.
