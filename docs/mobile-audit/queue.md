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
| dashboard-vendors | in progress | Join link truncated from the wrong end; "covered" fails; 42 warnings. |

## Later batches (session mode: your real account, every save still blocked)
| Batch | Pages | Status |
|---|---|---|
| 2a | Static public pages (fixture mode, no login needed): landing, pricing, faq, getting-started, terms, privacy, docs | in progress |
| 2b | Public pages that show real data: marketplace, company/people/traction profiles, tender invite link (need sample-data fixtures, or your sign-in for session mode) | todo |
| 3 | App shell + dashboard tabs (sidebar, bottom bar) | in progress (see the batch 3 table below) |
| 4 | Vendor side: tender page, submit offer, form fill | todo |
| 5 | Tender wizard | todo |
| 6 | Owner's tender tabs, proposal comparison, edit | todo |
| 7 | Settings, integrations, profile editors | todo |
| 8 | Admin (first give AdminLayout a phone menu) | todo |
| 9 | Dedicated "feels like an installed app" pass over every page: press states on any one-off controls, deliberate motion for content swaps, re-check the manifest/icon still fits new screens. Safari/iOS is checked first throughout — see quality-bar.md. Global groundwork already shipped in batch 1 (icon/manifest, global press states, tap-highlight, overscroll). | todo |
