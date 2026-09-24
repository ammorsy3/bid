---
name: mobile-polish
description: Run the mobile + Arabic look→fix→check loop over one batch of Bid pages (e.g. "/mobile-polish batch-1"). Photographs every screen state on phones in Arabic and English, sends each page to the mobile-fixer agent and then the mobile-reviewer agent, commits one page at a time, and ends with a single before/after report. Use when the user wants the mobile or Arabic version of Bid audited, fixed, or re-checked.
---

# /mobile-polish <batch>

You are the loop. You don't fix pages yourself: the `mobile-fixer` agent does
that, and the `mobile-reviewer` agent checks the result. You keep the queue
moving, protect the user's data, and finish with one report.

Read first: `docs/mobile-audit/README.md` (how the pieces fit), `queue.md`, `decisions.md`.

## Safety (stop the run if any of these fails)
- **Fixture batches (batch-1):**
  - The client-only server must answer on http://localhost:5138. Start it with the
    `bid-client-audit` launch config (preview_start), or
    `npx vite --port 5138 --strictPort` in the background.
  - Never `npm run dev` for a fixture batch.
- **Session batches (2+):**
  - The user signs in themselves with `npm run e2e:login`. Never type passwords or
    codes for them.
  - Then start `tests/mobile/serve.sh`, which runs the real server with email off.
- **Guard check:** `node tests/mobile/run.mjs --phase after --states not-found --projects iphone-chrome`
  must pass, and `.mobile-audit/guard-log.jsonl` must show the guard answering.
  If a write ever reaches a real server, stop and tell the user.
- **Git:**
  - Stay on the current branch. Don't create branches, push, or open PRs without
    asking the user.
  - Before committing a page, check the branch hasn't changed and has no commits you
    didn't make. If it does, say so in the report.

## Loop
1. **Baseline:** if `.mobile-audit/<batch>/before/` is missing, run
   `node tests/mobile/run.mjs --phase before --batch <batch>`, then write the current
   commit to `.mobile-audit/<batch>/baseline-commit.txt`. Never re-run the baseline
   after fixes have started.
2. **Shared fixes first:** do any section-1a items in `queue.md` still marked todo,
   one commit each. Re-photograph what they touch.
3. **Pages:** for each page in `queue.md` marked `todo` (or `in progress` from an
   interrupted run):
   1. Mark it `in progress` in `queue.md`.
   2. Run the **mobile-fixer** agent (foreground) with: batch, page, state ids and round 1.
   3. Run the **mobile-reviewer** agent with: batch, page, state ids and the result file path.
   4. On `FIX:`, send the list back to mobile-fixer (round 2, then 3). After 3
      fixer rounds, mark the page `needs you`, copy the open items into
      `decisions.md`, and move on.
   5. Run `npm run check`; it must pass. Then commit only the files the fixer
      changed, with a message that names the page and says what was fixed in plain
      words. End the message with the Co-Authored-By line from the session's
      attribution instructions.
   6. Mark the page `fixed` (or `needs you`) in `queue.md`, adding a short note.
   7. If the fixer changed a shared component, re-run the pages already marked
      `fixed` with `node tests/mobile/run.mjs --phase assert --states <page>`, and
      reopen any that now fail.
4. **Batch end:**
   - `node tests/mobile/run.mjs --phase assert --batch <batch>` covers every state on
     every phone. Fix leftovers with mobile-fixer, or record them.
   - `npm run test:unit`, `npm run build`, `node scripts/check-i18n-parity.mjs`.
   - `node tests/mobile/report.mjs --batch <batch>` writes `.mobile-audit/<batch>/report.html`.
5. **Tell the user**, in plain words and short:
   - what was broken, and on which phones
   - what's fixed
   - what's left in "needs you"
   - the report link
   - the 5-minute real-iPhone check: open `http://<Mac Wi-Fi IP>:5000/login` in
     Safari on the same Wi-Fi, and open it again from a WhatsApp message.

   Session-mode reports contain real people's data, so they stay local. A
   fixture-mode report may be published as a private artifact.

## Keep your own context small
Fixer and reviewer replies are 12 and 25 lines. Don't read photos yourself unless
something is disputed; the report shows them all.
