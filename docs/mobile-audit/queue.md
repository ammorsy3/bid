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
| Arabic font: IBM Plex Sans Arabic after the Latin fonts; Tailwind `tracking-*` neutralised on Arabic pages | todo |
| index.html: drop the Replit script; `color-scheme` so phones don't force-darken; set `dir`/`lang` and keep auth pages light before first paint | todo |
| Dialog / sheet close button and toast corner follow the language direction | todo |
| Direction icons flip with `rtl:-scale-x-100` (convention in quality-bar.md; applied page by page) | todo |

### 1b. Pages (one fixer run per row)
| Pages | Status | What to fix (known before the loop) |
|---|---|---|
| login, signup | todo | Expired saved session shows an endless "Preparing your workspace" loader (login.tsx:71-116): mark "just signed in" only after a real sign-in and clear the loader when the user turns out to be signed out. Check register.tsx for the same pattern. Signup eye icon: `right-2` → `end-2` (register.tsx:245/314). Password fields `dir="ltr"`. Page scrolls instead of the `h-screen overflow-hidden` shell (keep it for `lg:`). Add an AR/EN switch to both pages (English stays the default). Inside Instagram/Snapchat/X/Facebook/LinkedIn/TikTok in-app browsers, show a short note above the social buttons that Google sign-in needs Safari/Chrome. |
| verify-email, reset-password | todo | Code boxes: `autocomplete="one-time-code"` and the row fits 320–360px. Server error toasts are raw English. Password fields `dir="ltr"`. |
| sso-callback, desktop-suggestion, not-found | todo | ClerkCallback texts are hard-coded English and it isn't forced light. |
| onboarding | todo | Choice screen, join-with-code, colleagues found, waiting invitation, add-account. |
| onboarding-company, onboarding-individual, onboarding-team | todo | Shared `onboarding-layout.tsx` (100vh shell, step indicator). Button rows overflow in Arabic on ≤390px. `index.tsx:271` textarea is 14px. Category names in English. `individual-basics.tsx:22-23` validation messages are English. Team-invite role picker `w-40`. |
| team-invite, join | todo | |

## Later batches (session mode: your real account, every save still blocked)
| Batch | Pages | Status |
|---|---|---|
| 2 | Public pages: invite link, company/people/traction profiles, marketplace, pricing, faq, getting-started, terms, privacy, docs, landing | todo |
| 3 | App shell + dashboard tabs (sidebar, bottom bar) | todo |
| 4 | Vendor side: tender page, submit offer, form fill | todo |
| 5 | Tender wizard | todo |
| 6 | Owner's tender tabs, proposal comparison, edit | todo |
| 7 | Settings, integrations, profile editors | todo |
| 8 | Admin (first give AdminLayout a phone menu) | todo |
