-- Individual workspaces do not have a join code. (Q-035)
--
-- A join code exists so other people can join a workspace. An individual
-- workspace is one person by definition — there is nobody to invite into it.
-- When an individual is invited by a company, they gain that company's
-- workspace and switch between it and their own; nobody ever joins theirs.
--
-- The UI already hid the join-code card from individuals, but the code was
-- still minted at signup and `GET /api/company/join-code` would mint one lazily
-- on demand. Both are fixed in code; this clears the ones already issued.
--
-- 11 individual workspaces held a join code when this was written.
--
-- SAFE TO RUN ANY TIME — including before the new code is deployed. `join_code`
-- is nullable, nothing reads it for individuals, and the currently-deployed UI
-- already hides that card from them. Unlike 0006/0007 this drops no column, so
-- it cannot break a running build.
--
-- Idempotent.

UPDATE "companies"
SET "join_code" = NULL
WHERE "account_type" = 'individual'
  AND "join_code" IS NOT NULL;
