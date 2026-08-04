# Spec sweep — how to run one

A **spec bug** is code that compiles, typechecks, and runs correctly, and is
still wrong: the repo disagrees with itself about what something is. No linter
finds these, because nothing is broken. The app simply tells two stories.

Two real ones from this codebase:

- An `individual` workspace — a freelancer, who *is* the vendor — had a
  "Vendors in Base" stat card on their dashboard. The card fetched correctly and
  displayed `0`. Perfect code; the surface should not have existed.
- National ID collection was removed from onboarding as unlawful. The column,
  its unique constraint, a 10-digit validator, an unused lookup and a
  permanently-null field on every auth response all survived, because whoever
  removed it removed what they were looking at.

**To run one: invoke the `spec-sweep` skill.** What follows is the method it
implements, and what this repo learned running it on 2026-08-02/03.

---

## The distinction that makes it work

**Contradictions** — the truth already exists somewhere in the repo, and
somewhere else disagrees. The enum is named `individual` and a team-shaped
surface is gated open to it. The schema dropped a column and a validator still
requires it. **These are findable mechanically, with no spec document.** They are
the target.

**Missing intent** — nothing is inconsistent, the human just wanted something
else. No tool finds these. Out of scope. Don't try.

## Why not write a spec first

The obvious approach — write down all the rules, then check code against them —
fails. The app is too large to enumerate from memory, and a hand-written spec is
incomplete on day one and stale by week two.

Invert it. Read the code, build the map, find where the map contradicts itself,
and generate specific yes/no questions for what can't be resolved alone.
Answering *"should an individual see a team invite page? Y/N"* takes four
seconds. *"Describe your permission model"* takes a week. **Rules get written
down afterwards, as a byproduct of triage — never in advance.**

## Phases

**0 — Orient.** Read `package.json`, the router, where schema/migrations/routes/
validation/i18n live, how auth and route protection work. Enumerate the domain
concepts. Score candidates and produce a ranked shortlist of ~10. **Stop and get
the four confirmed** — if the architecture has been misread, everything
downstream is wasted, and this checkpoint costs nothing.

Rank by, roughly in order of weight:

1. **Layer span** — how many distinct layers it touches. A concept living in one
   file cannot contradict itself. Eight layers, eight chances to drift. Strongest
   signal.
2. **Churn** — `git log` it. Recently added, renamed, partially removed or
   migrated. A dropped column is a loud signal: go find who still references it.
3. **Aliasing** — different names in different layers (`snake_case` in schema,
   `camelCase` in TS, dotted keys in i18n, a third name in the UI). Renames leak.
4. **Gating** — anything controlling who can see or do what. User-visible and
   embarrassing.
5. **Recency** — whatever shipped last has had least time to be noticed.

Deliberately include one concept you're *uncertain* about. Four safe picks make
the sweep worthless.

**1 — Index.** For each concept write `docs/map/<concept>.md`: every location it
appears, across schema, migrations, routes, components (note zero-import ones),
handlers, validation, **both locales**, email templates, seed data, guards, and
tests. Optimise for greppability, not prose — nobody reads these top to bottom.
Note aliasing explicitly; missed aliases are how this phase fails. Record the
commit SHA at the bottom.

**2 — Sweep.** For each concept, do all its appearances agree? At minimum:

- **A. Partial removal** — gone from some layers, present in others.
- **B. Semantic self-contradiction** — a name *means* something and a surface
  gated open to it contradicts that meaning. Read names literally and take them
  seriously: if a value is called `individual_*`, anything plural or team-shaped
  reachable by it is suspect. Highest-value pattern. Be aggressive.
- **C. Orphaned dependency** — gated on data that no longer exists, is never
  populated, or can never be true for that user.
- **D. Locale divergence** — keys in one locale and not the other; keys implying
  a feature that isn't there.
- **E. Orphans** — components with zero imports, routes with no inbound link,
  exported functions never called. Usually residue of a half-finished removal.

**3 — Questions.** Build the full matrix: every account type × every surface it
can reach. For each cell where access is *allowed*, ask whether it should be.
**Be exhaustive.** Sixty questions beat a filtered ten — filtering is where the
bugs escape, and the judgement doing the filtering is the one that produced them.

**4 — Report and stop.** Including your blind spots.

## Hard rules

- **Change no application code during the sweep.** Only `docs/map/*.md` and
  `docs/open-questions.md`.
- **Write no rules or invariants yet.** They come after answers, or you encode
  guesses as truth.
- **Don't guess intent.** "I can't tell" is worth more than a confident wrong
  answer.
- **Don't pad.** If a concept is clean, say so. Manufactured findings destroy the
  test.

---

## What the 2026-08 run actually found

Four concepts (account type, discovery, tender targeting, verification/national
ID) → **11 contradictions, 40 questions**. Both known bugs surfaced
independently.

The highest-value single finding was structural rather than any one bug:
`accountType`, `nationalIdNumber` and `targetAudienceTypes` were each **declared
twice** in `shared/schema.ts`, the later declaration silently winning. Two
migrations both numbered `0002` disagreed on whether a column was `jsonb` or
`text[]`. `tsc` had been reporting all of it as `TS1117` the whole time — nobody
saw it because `npm run check` was already failing for unrelated reasons.

**Lesson: check whether the build is already red before assuming type errors
would have been noticed.**

## What the method missed

Be honest about this when running the next one.

- **Unreferenced i18n keys.** The sweep counted 329 keys defined but never
  referenced and explicitly declined to chase them, calling it a blind spot.
  Ahmed then found four real Arabic bugs by opening one page. Every translation
  already existed and simply wasn't wired up. **Next time, treat unreferenced
  keys as a finding class, not a footnote.**
- **Anything visual.** Untranslated categories, a hardcoded copyright year, a
  card nested inside a card. Tests and typecheck cannot see these. **Open the app
  — in both languages — before declaring a sweep done.**
- **Free-text columns.** `category` and `city` are stored as English strings, so
  no key-parity check could catch them rendering untranslated.

The sweep is good at *structural* disagreement and blind to *presentational*
disagreement. Pair it with a browser pass.
