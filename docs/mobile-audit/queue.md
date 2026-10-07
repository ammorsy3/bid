# Mobile + Arabic audit — work queue

The `/mobile-polish` skill works through this file top to bottom and keeps the
status column up to date.

- Status is one of: `todo` · `in progress` · `fixed` · `needs you` (see
  decisions.md) · `blocked`.
- A row's screen states are the entries in `tests/mobile/states.json` whose
  `page` is listed in that row.

## Batch 1 — login and signup (fixture mode: sample accounts, no server)

### 1a. Shared fixes (done before the page loop, one commit each)
| Fix | Status |
|---|---|
| Arabic font: IBM Plex Sans Arabic after the Latin fonts; Tailwind `tracking-*` neutralised on Arabic pages; Arabic placeholders stay right in LTR fields | fixed |
| index.html: drop the Replit script; `color-scheme` so phones don't force-darken; set `dir`/`lang` and keep auth pages light before first paint | fixed |
| Dialog / sheet close button and toast corner follow the language direction | fixed |
| Direction icons flip with `rtl:-scale-x-100` (convention in quality-bar.md; applied page by page) | fixed |

### 1b. Pages (one fixer run per row)
| Pages | Status | What to fix (known before the loop) |
|---|---|---|
| login, signup | fixed (292 → 0 phone fails; 2 questions in decisions.md) | Expired saved session shows an endless "Preparing your workspace" loader (login.tsx:71-116): mark "just signed in" only after a real sign-in and clear the loader when the user turns out to be signed out. Check register.tsx for the same pattern. Signup eye icon: `right-2` → `end-2` (register.tsx:245/314). Password fields `dir="ltr"`. Page scrolls instead of the `h-screen overflow-hidden` shell (keep it for `lg:`). Add an AR/EN switch to both pages (English stays the default). Inside Instagram/Snapchat/X/Facebook/LinkedIn/TikTok in-app browsers, show a short note above the social buttons that Google sign-in needs Safari/Chrome. |
| verify-email, reset-password | fixed (90 → 0 phone fails) | Code boxes: `autocomplete="one-time-code"` and the row fits 320–360px. Server error toasts are raw English. Password fields `dir="ltr"`. |
| sso-callback, desktop-suggestion, not-found | fixed (28 → 0 phone fails) | Google sign-in return is translated + stays light; failure stays on-screen instead of an English toast; popup close button now 44px everywhere in the app | ClerkCallback texts are hard-coded English and it isn't forced light. |
| onboarding | fixed (0 phone fails; shared onboarding-layout.tsx also touched) | Choice screen, join-with-code, colleagues found, waiting invitation, add-account. |
| onboarding-company, onboarding-individual, onboarding-team | fixed (email/ltr/small-text fails → 0; category names + validation messages translated) | |
| team-invite, join | fixed (dark-mode warning box, RTL name truncation, min-h-dvh) | |

## Batch 2a — static public pages (fixture mode: no server, no login)
Baseline (before fixes, 112 captures): 338 fails, all Arabic letter-spacing on landing + pricing; many warnings on docs.
| Pages | Status | What to fix (known before the loop) |
|---|---|---|
| landing | fixed (32 → 0 phone fails; desktop Arabic 31 → 0; desktop English pixel-identical; reviewer PASS round 2) | Phone menu drops down over a dimmed page instead of pushing it off-screen; sticky top bar; sign-up popup is a bottom sheet; 44px taps; touch press states; Arabic letter-spacing removed at every width. Menu and popup are real dialogs now. 2 questions added (decisions.md #10, #11). |
| pricing | fixed (16 → 0 phone fails; desktop Arabic 16 → 0; desktop English pixel-identical; reviewer: 1 must-fix, done) | Phone menu was opening off-screen (now drops down like landing's). Monthly/yearly is a big segmented switch; plan buttons 48px; whole FAQ rows tappable; Arabic digits made Western like the prices; footer grey darkened on phones on both footers (3.3 → 5.1:1). Arabic menu wording still differs from landing's (سوق Bid / دخول vs السوق / تسجيل الدخول) — copy choice, left alone. |
| docs | paused (Ahmed stopped this run; English-only developer reference, see decisions #13) | 53-63 warnings in Arabic (tap sizes / English words). Code blocks and tables must scroll inside themselves, not the page. |
| faq, getting-started, terms, privacy | fixed (0 fails on all 70 captures incl. cookies; desktop pixel-identical; I looked at the Arabic iPhone photos myself instead of using the reviewer agent, since the changes were light) | Header links and footer links are 44px on phones; the back arrow flips the app's usual way; reading text is 15px on phones (unchanged on desktop); FAQ rows have press feedback. | Checklist is clean; a person still needs to look at them (reading width, spacing, Arabic feel). |
| cookies (new page) | fixed (built phone-first; 0 fails on every setup, both languages) | Created on request. Also added an app-wide rule: a new page opens at the top (links used to keep the old scroll position); Back still returns to where you were. |

## Batch 3 — the signed-in dashboard (session mode: real server, Ahmed's account)
Baseline (before fixes, 136 captures): 155 fails. Populated states use the Seet workspace
(60 tenders, 11 proposals); "-new" states use his empty, unverified default workspace.
| Pages | Status | What to fix (known before the loop) |
|---|---|---|
| dashboard-shell | fixed (phone fails 91 → 0, reviewer PASS, desktop layout identical) | Fixed the hooks crash, names cut off at the wrong end in Arabic, English labels on the Arabic page, 44px drawer rows, workspace list mirrored and kept inside the drawer, press states. Open for you: the trash icon on AI-chat history deletes with no confirm; Radix menus/selects are left-to-right on Arabic pages app-wide (see decisions.md #15, #16). |
| dashboard-overview | fixed (phone fails 8 → 0, reviewer PASS after a second round; desktop layout identical) | Finished checklist steps now show a done line instead of a button (small change on desktop too); phones show loading placeholders instead of a false "17%" / "0"; tighter checklist rows. Open: the list opens the finished first step by default (decisions.md #18). |
| dashboard-rfps | fixed (phone fails 1 → 0, warnings 174/132 → 3, page height 17,934px → 3,214px; reviewer PASS after a second round; desktop identical apart from Arabic dates) | Phones show 10 tenders then "Show more (N left)"; rows have full-width 2-line titles with badges beneath, a 44px "..." menu, a delete confirm sheet; empty and no-match states have one clear action. Open: phone rows changed from View/Copy/Edit/Delete buttons to tap-the-row + "..." menu (decisions.md #19); the tender list is slow on the server (decisions.md #20). |
| dashboard-proposals | fixed (phone fails 0 → 0; warnings 152 → 100, all brand orange; reviewer PASS; desktop identical apart from Arabic dates/amounts) | 44px sub-tabs that fit at 360px; scannable rows for sent proposals and incoming offers (title, badges, amount, date, 2-column button grid); 10 at a time with "Show more"; empty states with one action; Arabic amounts, dates and "days left" wording. Open: decisions.md #22-#24. |
| dashboard-vendors | fixed (phone fails 24 → 0; warnings 556 → 100, all brand orange; reviewer PASS; desktop identical) | Joining link reads left-to-right with a 44px Copy button; vendor and request rows no longer squeeze names or clip "Applied via Traction"; filters in two columns; 10 at a time with "Show more"; the "Not verified" filter (matched nothing) now works. Open: decisions.md #25-#27. |

## Batch 2b — public pages that show data (fixture mode: made-up stress data, logged out)
Baseline (before fixes, 308 captures, commit in `.mobile-audit/batch-2b/baseline-commit.txt`): phone fails are worst on the marketplace (4-18 per capture), then the tender invite page (up to 8) and the company/people profile pages (1). Traction links are warnings only.
| Pages | Status | What to fix (known before the loop) |
|---|---|---|
| marketplace | fixed (3 rounds; 0 fails on all phones and desktop; open items in decisions.md: brand-colour contrast, Arabic wording check) | The Category / City / Type filter menus open but are invisible on every screen size, including desktop: they sit inside the scrolling pill row (`overflow-x-auto`), which also clips anything that hangs below it (checked live, the row is 39px tall and the menu is 240px). Also: page numbers are 36px taps, the pill row needs 44px targets, search box text size, Arabic letter-spacing, very long category names, company names cut off in the middle, "not settled" on first load. |
| company-profile, people-profile | fixed (2 rounds; 0 fails on all phones and desktop; open items in decisions.md #32) | One text-spills fail on every phone (a long unbroken word / URL pushes the page wide: the iPhone Chrome photo of Nour Contracting is 653px wide on a 393px screen). Long portfolio and certification names; check the Arabic-name person and the short-name person; "no such company" page. |
| traction | fixed (2 rounds; 0 fails and 0 warnings on phones except the company's own English text; decisions.md #33) | No fails, warnings only (11-25 per capture, mostly tap sizes and English on the Arabic page). Check the join-request area, long Arabic company name, "no such company" page. |
| tender-invite | fixed (1 round; 70 phone fails -> 0; decisions.md #34) | Up to 8 phone fails: text spills, things covering other things, the page wider than the screen on the small Android in Arabic, the floating submit bar covering text. Closed-tender and closes-today variants, "link not found" page. |

## Later batches (session mode: your real account, every save still blocked)
| Batch | Pages | Status |
|---|---|---|
| 2a | Static public pages (fixture mode, no login needed): landing, pricing, faq, getting-started, terms, privacy, docs | in progress |
| 2b | Public pages that show real data: marketplace, company/people/traction profiles, tender invite link (fixture mode, made-up stress data in `tests/mobile/fixtures/public-data.json`) | done, all four pages fixed (see the batch 2b table above); next: report to Ahmed |
| 3 | App shell + dashboard tabs (sidebar, bottom bar) | done, all five pages fixed (see the batch 3 table above); next: report to Ahmed |
| 4 | Vendor side: tender page, submit offer, form fill | done (decisions.md #35) |
| 5 | Tender wizard | done: all 12 steps fixed (32 states, 0 phone fails; see decisions.md #36); next: report to Ahmed |
| 6 | Owner's tender tabs, proposal comparison, edit | todo |
| 7 | Settings, integrations, profile editors | todo |
| 8 | Admin (first give AdminLayout a phone menu) | todo |
| 9 | "Feels like an installed app" pass, scoped to the pages already fixed (batches 1, 2, 3) | done for now (see below); 2b/4-8 get their own pass once each has its base fix |

### 9. What changed
| Part | Status | What it did |
|---|---|---|
| Press feedback on one-off controls | fixed | 20 hand-rolled clickable elements across batches 1-3 that gave no response to a tap (back-to-login, forgot-password, resend-code, skip-for-now, the onboarding account-type card, the sign-up modal's close button, and a dozen dashboard spots) now dim/shrink like every other button in the app. |
| Deliberate motion for content swaps | fixed | Built a small reusable helper (`client/src/lib/view-transition.ts`) using the browser's View Transitions API; wired into the dashboard's 4 tab switches so they cross-fade instead of cutting instantly. Falls back to no animation (not broken) on older Safari or with motion turned off. Caught and fixed a real bug along the way: Radix's Tabs fires its change event twice per click, which was crashing the whole dev server on every single tab click until fixed. |
| Manifest/icon recheck | checked, nothing to fix | Icons, manifest, and status-bar tinting are all still correct and nothing added since batch 1 reintroduced a stray browser-chrome moment. |
| **Extension 1: page-to-page transitions** | fixed | Every navigation between two different pages (not just switching dashboard tabs) now cross-fades. Wired once into wouter's `aroundNav` router hook, so it covers every `<Link>`/`setLocation` in the app without touching each call site. Also extended the existing cross-fade to the four "Show more" reveals and the RFP/vendor filter dropdowns, which batch 9's first pass hadn't reached yet. |
| **Extension 2: instant actions** | fixed | Accept/reject/shortlist an offer, remove a vendor, and delete an AI chat now update the screen the instant you tap, instead of waiting on the round trip to the server (React Query optimistic updates, rolled back if the server disagrees). |
| **Extension 3: skeleton loading sweep** | fixed | Checked every full-page spinner on the already-fixed pages against a shape-matching skeleton instead. Only `team-invite.tsx` needed the change (most others were button-level "submitting..." spinners, which are correct as-is, or genuinely brief handoffs with no fixed shape to hint at). Found and fixed a real bug while checking it live: the placeholder color and that page's own background used the same design token, so the first version was invisible. |
| **Extension 4: count-up animation** | fixed | The dashboard's three summary numbers (Active RFPs, Pending Proposals, Vendors in Base) now count up/down from whatever's on screen to the new value, instead of swapping the digit in place - on first real load and on a live change (e.g. right after creating a tender), never on a plain revisit where nothing changed. |
