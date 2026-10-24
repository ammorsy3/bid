# Dependency security repair — 2026-10-24

Baseline: main `9103adb91402b0e37dde6556099c2a1fdf4f6bc0`. CI run 40102387540 passed typecheck and unit tests but failed the shipped-dependency advisory gate.

## Scope

- body-parser 1.20.8 → 1.20.9 (within Express 4's existing range): GHSA-27r3-jxmh-p828.
- multer 2.4.0 → 2.5.0: GHSA-q7qp-rjg7-q26m.
- Zod 3.25.76 → 4.6.7: GHSA-mrhx-c7xc-m3w5. Drizzle-Zod, React Hook Form's resolver and zod-validation-error updated to compatible versions. No advisory exception added.
- Zod errors now use `issues` internally; existing API response keys `errors` and `validationErrors` remain unchanged. Custom category/decision messages are preserved.
- Offer form schemas moved unchanged into a pure module with an explicit common input/output type, so incomplete form inputs reach runtime validation and all required fields remain enforced. This is not a change to offer submission policy.
- No SQL, schema migration, auth policy, data or environment credential changes. Existing shared-workspace CI edits excluded.

## Verification

- Typecheck: PASS with the fresh locked dependencies (no baseline-error waiver).
- Unit suite: 525 passing, including all existing security/authorization regressions and new resolver/middleware checks. Inert credentials, database/storage URLs pointing at loopback port 1, dotenv disabled; only local test listeners.
- New coverage: offer methods/upload modes/required video, missing fields, custom EN/AR errors, enum errors/defaults, stripping server-owned fields, compressed JSON, malformed JSON and multipart upload size limits. Verification route checks the API error payload and no saved invalid CR number.
- Build: PASS; existing large-chunk warnings remain.
- Shipped-dependency advisory gate: PASS. Three moderate reports remain in the Tailwind/build dependency chain; this change does not waive or expand the existing gate.
- Diff check: PASS. Review performed by the implementing Codex session, not an independent human/agent review. GitHub CI is a separate environment check, not an independent code review.

## Limits and suspended work

No live DB/storage, email, AI provider or authenticated production workflow was exercised. Supabase backup/restore, migration 0017, historical-provenance audit/quarantine and real-storage acceptance remain separate, open release gates. Public page availability alone does not close them. Browser work requiring the user's unlocked Mac is suspended at their request.
