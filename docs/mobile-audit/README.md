# Mobile + Arabic audit loop

An automation that makes every Bid screen look and work right on phones, in
Arabic first and English second. It photographs each screen, fixes the code,
checks again, and hands you one before/after report per batch.

## How it works (plain version)
1. **A safety net** (`tests/mobile/guard.cjs`) sits in every audit browser.
   Anything that would save or send (sign up, invite, publish…) gets a fake
   "ok" and never reaches a server. Nothing changes in the database and
   nobody is emailed. Batch 1 doesn't even use the real server: it runs the
   screens on made-up sample accounts (`tests/mobile/fixtures/`).
2. **"Before" photos**: every screen state (`tests/mobile/states.json`) is
   photographed once, in Arabic and English, on 7 setups: small Android 360,
   iPhone 393, big iPhone 430, Safari engine, dark mode, Samsung/Chrome
   force-dark, and desktop 1280.
3. **An automatic checklist** (`tests/mobile/checker.js`) runs on each photo.
   It checks: page wider than the screen, text cut off, icons covering text,
   form text that makes iPhones zoom, tiny buttons, English left on Arabic
   pages, Arabic in the wrong direction or font, and more (full list at the
   top of the file).
4. **The fixer agent** (`.claude/agents/mobile-fixer.md`) takes one page,
   watches it in a visible Chrome window, fixes the code, and re-checks until
   the phones are clean (up to 3 rounds).
5. **The reviewer agent** (`.claude/agents/mobile-reviewer.md`) looks at the
   new photos with fresh eyes against the quality bar
   (`docs/mobile-audit/quality-bar.md`) and sends back anything still wrong.
6. **One commit per page**, then the next page. At the end: all phones
   re-checked, tests, build, and the report.

## Run it
In Claude Code, from this repo:

```
/mobile-polish batch-1
```

Progress is kept in `docs/mobile-audit/queue.md`, so an interrupted run picks
up where it stopped. Questions for you pile up in
`docs/mobile-audit/decisions.md`. Photos, checklist results and the report are
in `.mobile-audit/` (not committed).

## The visible Chrome window
Add this server to your `.mcp.json` (the file is private to your machine), then
restart Claude Code:

```json
"phone": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@playwright/mcp@0.0.82", "--config", "tests/mobile/mcp-phone.json"]
}
```

It opens real Google Chrome at iPhone size in Arabic locale, with the safety
net and the checklist already loaded (`window.__mobileAudit`).

## Run the pieces by hand
```bash
node tests/mobile/run.mjs --phase after --states login --projects iphone-chrome --summary
node tests/mobile/summary.mjs --page signup --details
node tests/mobile/report.mjs --batch batch-1
```

`--phase before` takes the baseline, `after` re-photographs, and `assert`
re-photographs and fails on any problem. The same spec
(`tests/mobile/capture.spec.ts` + `playwright.mobile.config.ts`) stays in the
repo as the regression test for everything fixed so far.

## Batch 2 onward (your real account)
Later batches need real data, so they run against the real dev server:
1. Start a normal server on 5137 (`PORT=5137 npm run dev`) and sign in yourself with
   `npm run e2e:login` (email, password, emailed code). Claude never types these.
2. Stop that server and start `tests/mobile/serve.sh`. It is the same server with
   email switched off and auto-restart.
3. `/mobile-polish batch-2`. Every save is still blocked by the safety net, and
   your saved language is pinned inside the browser only.
Reports from these batches show real people's data, so they stay on your Mac.
