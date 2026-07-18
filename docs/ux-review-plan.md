# Bid — Unified UX/UI Review & Responsive Redesign Plan

> **Deliverable:** After approval, this content is written to `docs/ux-review-plan.md` (plus the 29 "before" screenshots already captured in `docs/ux-review/before/`). **Analysis only — no app code changes in this pass.** Opus implements item-by-item afterward, on a non-main branch.

## Context

A single deep end-to-end review of the authenticated app (bidapp.sa) was performed on the running dev build (`localhost:5001`) at **1440×900 and 390×844** for every reachable internal screen: signup/OTP → onboarding → dashboard (Overview / RFPs / Proposals / Vendors Base) → marketplace → full manual RFP wizard (all 5+2 steps to the publish attempt) → AI copilot → settings (account / integrations) → company editor + public profile → docs / getting-started / FAQ → notifications + dark mode. Baselines: `docs/ux-review/before/*.png` (01–29, desktop+mobile pairs).

**Not reviewed (blocked):** Tender details/edit + proposals-received screens — publishing requires a *verified* company; the server correctly 403s and the permission classifier blocked my dev-DB `UPDATE companies SET verification_status='verified'`. Either approve that one-line update or provide a verified/admin dev account, and these screens get a follow-up review pass. Admin suite also unreviewed (needs admin account).

### What exists and is good
- A real brand token system in `client/src/index.css` ("Volume 01"): Signal Orange `#FE3C01`, Ink `#1A1613`, Cream `#F4EDE1`, Stone `#8A8078`, Paper `#FFF`, plus dot-state colors (Idle/Live/Decision/Won/Lost/Pending) — distinctive and ownable.
- Fonts loaded: **Space Grotesk** (sans), **Inter** (display), **JetBrains Mono**, **IBM Plex Sans Arabic**.
- shadcn/Tailwind component kit (`client/src/components/ui/*`), dark theme, i18n (en/ar), numbered-section dashboard motif ("01 Overview.") with the orange full-stop — a genuinely distinctive editorial voice.

### The core problem
The identity fragments into **four visual dialects**: (1) warm cream dashboard, (2) white/dot-grid wizard pages, (3) a **purple-gradient** public company page, (4) grey marketing-style marketplace + a separate docs look. Mobile is a shrunken desktop rather than designed. And a set of hard functional bugs undermines trust.

---

## Bug register (fix first — independent of redesign)

| # | Bug | Where | Evidence |
|---|-----|-------|----------|
| B1 | **Raw i18n keys rendered** (`onboarding.verifyToContinueTitle`, `docCrLabel`…) — whole verification-gate screen is untranslated key soup; "required" badge clips into button | `/tenders/new` when unverified | `11-verify-gate-broken-i18n-desktop.png` |
| B2 | **Silent login failure** — 401 from `/api/auth/login` shows *nothing* in the UI | `/login` | console log |
| B3 | **Silent publish failure** — 403 from `POST /api/tenders` (unverified company) shows no toast/message; button just does nothing | wizard Review step | `19-publish-403-desktop.png` |
| B4 | **No show-password toggle on Login** (Signup *has* one — inconsistency) | `/login` | user-reported + confirmed |
| B5 | **Deadline off-by-one** — picked July 28 in the calendar, review shows "July 27th, 2026" (UTC/local conversion) | wizard submission → review | `18-wizard-review-desktop.png` |
| B6 | **Currency locale mismatch** — AI budget shows `٣٠٠٬٠٠٠ ر.س.` (Arabic-Indic digits) in the English UI; same value renders "SAR 300,000" one step later | wizard budget step | `15-wizard-budget-ai-desktop.png` |
| B7 | **Marketplace filter bar collapses at 390px** — filters overlap the search input inside a distorted pill | `/marketplace` mobile | `10-marketplace-mobile.png` |
| B8 | **Verification gate is client-side only** — `/tenders/new/manual` reachable by direct URL (server does enforce at POST; the client should match, and the gate screen is B1's broken one) | tender creation | verified by navigation |
| B9 | Empty "CR" row (icon + label, no value) on public company card | `/company/:slug` | `24-company-public-desktop.png` |
| B10 | **Tour fatigue** — separate auto-launching product tours on Dashboard (5 steps), Vendors Base (3), AI copilot (2), Settings (3); each interrupts on first visit of each section | everywhere | multiple screenshots |

---

## Section A — The new design direction: **"Tender Paper"**

One system, built *up* from the existing Volume-01 tokens (don't discard the identity — commit to it everywhere, and sharpen it). Personality: **editorial procurement ledger** — the confidence of a well-set contract document: cream paper, ink type, one signal color used sparingly and decisively, numbered sections, stamped statuses.

### A1. Mood & personality
- **Keywords:** deliberate, stamped, official-but-modern, Saudi-forward, calm surfaces / loud accents.
- Signal Orange is a *signal*, not a paint bucket: primary CTA, live-state dots, active nav, the full-stop period. Everything else stays ink/stone/cream.
- Kill the leftover dialects: no dot-grid backgrounds, no purple gradients, no grey marketing hero inside the app shell.

### A2. Type system (fonts already loaded — enforce roles)
| Role | Face | Usage |
|---|---|---|
| Display | **Space Grotesk 700** | Page titles ("Overview."), wizard step headlines, stat numerals. Tight leading (1.05), tracking −0.02em. Desktop 40/48px → mobile 28/32px |
| UI text | **Inter** 400/500/600 | Body, labels, inputs, tables. 14px base desktop, 16px inputs on mobile (prevents iOS zoom) |
| Mono | JetBrains Mono | Amounts, IDs, dates in tables, API keys — procurement numbers deserve tabular mono |
| Arabic | IBM Plex Sans Arabic | Mirror roles under `[dir="rtl"]`; digits **always Latin** in en locale, Arabic-Indic only in ar locale (fixes B6 systemically) |
- Scale (rem): 12 / 14 / 16 / 18 / 22 / 28 / 40 with fixed line-heights; expose as `--text-*` tokens so both breakpoints pull from one ramp.

### A3. Color system (consolidate to tokens; delete one-off hexes)
- **Surfaces (light):** Canvas Cream `#F4EDE1` → Panel `#EBE1D0` (sidebar rail) → Card Paper `#FFFFFF` → Spotlight `#FBF8F4`. Exactly these four elevations; every screen (wizard included) sits on Canvas Cream.
- **Ink ramp:** Ink `#1A1613`, Stone `#8A8078`, Hairline `hsl(28 12% 88%)`.
- **Signal:** Orange `#FE3C01` (hover `#E33600`, wash `#FFEDE6`).
- **Status = the existing dot vocabulary**, promoted to chips used identically everywhere: Idle-Stone, Live-Orange (pulse), Decision-Ink, Won-Green `#1FA56A`, Lost-Red `#D7321F`, Pending-Amber `#F0A800`.
- **Dark theme:** same relationships on warm-black surfaces (`#141110` canvas / `#1D1917` card); keep the cream *tint* in text (`#F4EDE1` at 92%), never pure white. Audit every redesigned screen in both themes.
- Purple company-page gradient → replaced by Cream-to-Orange "letterhead" band (see B-8 below).

### A4. Spacing & layout principles
- **4px base grid;** component paddings 12/16/24; section gaps 32/48; page gutter 24 desktop / 16 mobile.
- **Content measure:** forms max-w 640px; reading text max-w 720px; full-bleed only for tables/boards.
- **One app shell for every internal screen** (wizard included — it currently drops the shell entirely): sidebar rail on ≥1024px, top bar + **bottom tab bar** on mobile. Wizard/AI copilot may use a "focus" variant of the same shell (rail collapsed to a slim logo spine + exit), never a different chrome.
- **No inner-scroll forms:** the scope step hides Timeline/Description inside a card with hidden overflow (`14-wizard-scope-desktop.png`). Cards grow with content; the page scrolls.

### A5. Component style
- **Cards:** Paper, 1px hairline, radius 12, shadow only on hover/drag. Kill mixed radii (currently 8/12/16/24 coexist).
- **Buttons:** primary = Orange fill/white; secondary = ink outline on paper; tertiary = ink text + orange underline on hover. Height 40 desktop / 48 mobile, radius 10. Destructive = Lost-Red. **Disabled = 40% opacity of the real color** — today's washed-salmon disabled Next buttons read as broken.
- **Inputs:** paper field, hairline border, ink text; orange ring on focus; label 13px/600 above; helper 12px Stone below. Password fields always get the eye toggle (B4). Error state: Lost-Red border + message — never silent.
- **Status chips:** dot + label, tinted wash background; identical on dashboard lists, marketplace cards, admin tables.
- **The numbered-section motif ("01 / Overview.")** becomes the official page-header component (number chip + display title + orange period + subtitle) used on *every* internal page — it's currently the best thing in the app and appears only on the dashboard.
- **Empty states:** one pattern — icon in orange-wash squircle, display-font headline ("No RFPs."), one-line Stone subcopy, single primary action. (Current ones are close; standardize sizes/spacings.)
- **Toasts:** every mutating request resolves to a success or Lost-Red error toast (B2/B3 are instances of a missing global rule — add a default `onError` in the query/mutation client).

### A6. Responsive strategy (one system, two ergonomics)
- **≥1024px:** sidebar rail 256px (collapsible), content max 1200px centered.
- **<1024px:** top bar (logo + context title + avatar) and a **4-item bottom tab bar**: Home, RFPs, Proposals, Vendors — with the Marketplace and "Create RFP" living as a raised center FAB-style action in the bar. The current hamburger→drawer buries every core destination two taps deep.
- **Notifications get a first-class bell** in the top bar / rail (badge + panel), replacing the flyout-inside-avatar-menu (`28-notifications-desktop.png`).
- Tables → card lists at <768px (define per-table which 3 fields survive); filter rows → horizontally scrollable chip rail + "Filters" sheet (fixes B7's pattern properly).
- Wizards on mobile: sticky top progress bar, sticky bottom action bar (Back/Next), content scrolls between — thumb-reachable, no full-page scroll to find "Next".
- Touch targets ≥44px; dialogs on mobile become bottom sheets.
- **Onboarding tours:** replace all four auto-tours with dismissable inline hint cards (the wizard already has the right pattern: "Setting your scoring weights" hint) + a single opt-in "Take a tour" entry that exists in the sidebar footer anyway (B10).

---

## Section B — Screen-by-screen (prioritized HIGH → LOW)

Ordering = user-impact × visibility. Each item: current issues (UX/UI, desktop-vs-mobile), then the responsive redesign proposal.

### HIGH

**B-1. Global shell & navigation** (`AdminLayout`/dashboard sidebar, mobile drawer)
- *Issues:* Sidebar loses "Create RFP" prominence when collapsed; "Not Verified" warning appears 3× simultaneously (header subtitle, yellow card, avatar badge); notifications buried in avatar flyout; mobile = hamburger + full-height drawer for 4 destinations; wizard/marketplace/docs/settings each swap to different chrome (disorienting).
- *Proposal:* One shell for all internal routes (A6). Single verification banner slot (dismissable, one instance). Bell + notification panel in bar. Bottom tabs on mobile. Focus-variant shell for wizard/AI. Consistent "back" affordance (today: orange pill "Back", plain link, or logo-click depending on page).

**B-2. Verification gate & publish path** (B1, B3, B8)
- *Issues:* The single most important conversion path (create → publish) dead-ends in an untranslated, clipped screen; publish fails silently; gate skippable by URL.
- *Proposal:* Rebuild gate screen on the shell with real i18n strings, document checklist with per-doc upload state chips (Pending-Amber / Won-Green), and honest copy about admin review time. Client route-guard matches server rule. Publish button: loading → success (redirect to tender details) or error toast naming the actual blocker with a "Get verified" CTA.

**B-3. RFP creation wizard** (steps: start method, title, scope, budget, submission, criteria, brief/review)
- *Issues:* Step counter lies ("1/5" … then "5/7 (Optional)"); no persistent step map — users can't see the whole journey; scope card hides half its fields behind inner scroll (desktop); disabled-Next styling reads broken; criteria defaults sum to 85% and silently block Continue ("Add 15% more weight" appears only inside a small ring); submission-type cards show no visible selected state in a11y tree (selection feedback is color-only); date off-by-one (B5); currency locale flip (B6); left headline column is 60% empty at desktop, wasted.
- *Proposal:* Single 7-step definition with a persistent left rail (desktop) / top progress dots (mobile): Method → Title → Scope → Budget → Response → Criteria (optional, clearly skippable) → Review. Two-column desktop (rail + 640px form column, headline collapses into the header component); mobile sticky top progress + sticky bottom actions. Scope: sections stack openly, no inner scroll. Criteria: weights auto-balance (adjusting one redistributes remainder) with a live "= 100%" bar. Selected cards get ink border + orange check chip + `aria-pressed`. All dates via a single date util (UTC-safe); all money via one `formatSAR(locale)` using the existing Saudi-riyal symbol class.

**B-4. Review/Brief step ("publish page")**
- *Issues:* Strong content, but it's a different design dialect (white, its own header); Quick Summary sidebar duplicates the hero strip; requirement checklist is 10 unchecked-looking rows with unclear included/excluded semantics; voice note & video sections look like empty demo cards; "Publishing as Akams Trading Co" is the only hint of accountability.
- *Proposal:* Make it a true "final document preview": letterhead-style header (title, buyer, deadline, budget — mono numerals), sections rendered as the vendor will see them, edit-pencil per section deep-linking back to its step. Right rail (desktop) / bottom sheet (mobile): publish toggles, language & AI-translation, single primary Publish. Requirements become toggle chips (included = ink chip with orange check).

**B-5. Dashboard Overview**
- *Issues:* For a new user the whole screen is onboarding (fine) but stat tiles are dead zeros with no destination; "Book a demo" black banner dominates over the actual next action; checklist items don't show per-item completion state clearly; "6 steps" copy duplicated in header and section 02; mobile stat tiles stack to 3 tall cards eating a full viewport.
- *Proposal:* Keep the numbered editorial header. Stat tiles become tappable (route to RFPs/Proposals/Vendors) with Live-dot pulse when >0 and a sparkline slot for later; 3-across desktop, horizontal scroll-snap row on mobile. Getting-started checklist: progress ring + per-item Won-Green check stamps, collapses permanently once 6/6. Demo banner demoted to a dismissable card at list end.

**B-6. Marketplace**
- *Issues:* Inside the app it's a full marketing page (giant "Tenders Marketplace." hero, separate top nav, footer with Login links shown to a logged-in user); filter pill breaks at 390px (B7); List/Grid toggle floats detached; empty state is faint grey text lost mid-page.
- *Proposal:* Two contexts, one design: logged-in `/marketplace` renders inside the shell — header component ("Marketplace."), filter chip rail (Category / City / Type / sort) + Filters sheet on mobile, tender cards with status dot, budget in mono, deadline countdown; standard empty state with "Post a tender" CTA. The marketing hero survives only for logged-out visitors.

### MEDIUM

**B-7. RFPs / Proposals / Vendors tabs**
- *Issues:* Header sits inside the tab panel, so tabs feel like separate pages with duplicated headers ("02 RFPs.", "03 Proposals.", "04 Vendors Base."); filter combos ("All Types", "Offers Received") unlabeled; Proposals' segmented control is an orange pill row unrelated to other tab patterns; Traction-Link promo card sits above the actual vendor list.
- *Proposal:* These become real routes (`/rfps`, `/proposals`, `/vendors`) sharing the page-header component; one segmented-control style everywhere; filters as labeled chip rail; Traction Link promo becomes a compact banner under the header, dismissable.

**B-8. Company public profile + editor**
- *Issues:* Public page is off-brand purple with an empty CR row (B9) and near-empty body; editor is solid (left nav, profile strength) but a *fourth* chrome variant; editor mobile tab rail truncates ("Se…").
- *Proposal:* Public page = cream letterhead band (ink name, status chip, industry), Paper cards for About/Facts/Portfolio, only-populated rows render; it's the vendor-facing trust page, so mirror the RFP "document" aesthetic. Editor adopts the shell; profile-strength meter moves into the page header; mobile section nav = scrollable chips with ellipsis-free labels.

**B-9. AI Copilot**
- *Issues:* Entry screen is charming (orb) but ignores the shell (own header, dot-grid, ✕ with no confirm); quick-action cards mix green/orange randomly; Beta chip is purple (off-palette); yet another auto-tour.
- *Proposal:* Focus-shell variant; orb keeps its moment but on Canvas Cream; quick actions become 4 uniform ink-outline cards with orange icon chips; Beta chip = amber; exit confirms if a draft exists; conversation view inherits input/button tokens.

**B-10. Settings (account / company / notifications / integrations)**
- *Issues:* Its own chrome (5th variant) + auto-tour; "GDPR" section (wrong regulation for a Saudi product — should be PDPL, and it's an odd lone checkbox); theme cards fine but System thumbnail unreadable; Integrations page is unstyled-plain and duplicates "Back" as a lone orange pill; fullPage screenshot shows the split-background artifact of a half-height sidebar.
- *Proposal:* Settings inside the shell with left section nav (desktop) / chip rail (mobile) matching the company editor; rename GDPR → "Privacy & compliance (PDPL)" with real content; Integrations gets header component + card tables for keys/integrations with mono key display and copy buttons.

### LOW

**B-11. Auth & onboarding (login, signup, OTP, role choice, company basics)**
- *Issues:* Layout is decent; left brand panel wastes its bottom half; "Let's get yourworkspace" missing space (copy bug); logo dot renders as separate glyph in a11y (`B ı d`); login lacks password toggle (B4) and error display (B2); OTP screen has no shell-consistent header; role-choice icons mix green/orange arbitrarily.
- *Proposal:* Keep split layout; brand panel gets the dot-state legend as living identity; fix copy; unified icon treatment (orange chips); login gains eye toggle + inline error + rate-limit message; OTP auto-submit is already great — add paste support note and resend as text link.

**B-12. Docs / Getting started / FAQ**
- *Issues:* Docs = separate product look ("BidCore API docs", different nav/type); acceptable for API docs but Getting-started/FAQ are user docs living in a third hybrid style; all lack the shell so "Back to Dashboard" is the only escape.
- *Proposal:* User-facing help pages adopt the shell + reading column (720px); API docs may keep their layout but swap tokens (cream/ink/orange + Space Grotesk headings) so it reads as the same company.

**B-13. Dark theme audit**
- *Issues:* Dashboard dark is decent, but cream-dialect components (yellow verification card, avatar badges) keep light-theme colors; wizard/marketplace/company pages untested in dark and will break once unified.
- *Proposal:* After each screen's redesign lands, verify both themes; status chips get dark-mode wash values; treat dark as a first-class token set, not an overlay.

---

## Implementation notes (for the coding pass)

- **Order:** Bug register B1–B10 → A-tokens/A5 primitives (page-header, chips, empty-state, toast rule) → B-1 shell → B-2 → B-3/B-4 → B-5/B-6 → B-7…B-13.
- Key files: `client/src/index.css` (tokens), `tailwind.config.ts`, `client/src/components/ui/*` (primitives), `client/src/components/AdminLayout.tsx` + dashboard sidebar (shell), `client/src/pages/Dashboard.tsx`, `client/src/pages/Marketplace.tsx`, `client/src/pages/Tender*.tsx` (wizard), `client/src/lib/i18n.tsx` (missing `onboarding.*` keys), date/currency utils (new, shared).
- Reuse: existing dot-state tokens, `saudi-riyal-symbol` CSS, shadcn primitives, the numbered-header pattern from `Dashboard.tsx`.
- **Verification:** re-run this exact Playwright walkthrough after each phase; screenshot to `docs/ux-review/after/` with identical names; diff against `before/`. `npm run check` + `npm run test` green; e2e specs (`tests/e2e/pages.spec.ts`) still pass. i18n: grep rendered pages for `\w+\.\w+` key patterns in en and ar. Dates: create tender with deadline D, assert review shows D.
- **Open item for the user:** approve the dev-DB verification update (or supply a verified/admin account) → then a follow-up capture+review of Tender details, offers, award flow, and the Admin suite; append findings to Section B before implementing those screens.

---

## Implementation status (2026-07-18, branch `review/fable-improvements`)

**Done & verified** (commits `54bed6e`, `3c7b82d`, `1d73363`):
- Bug register B1–B10: all fixed, verified end-to-end (a tender was published through the real flow to prove the date/currency/publish paths).
- Section A: primitives built (`page-header`, `status-chip`, `empty-state`, `lib/date.ts`, `RequireVerified`).
- Dashboard visual redesign — "signal desk": ink hero panel (grain + orange bloom) fusing heading and tappable stat tiles; porcelain canvas replaces cream + dot grid; demo banner demoted; white cards for get-started/negotiate. Verified light/dark, desktop/mobile.
- B-3 wizard: consistent step numbering (5/5), "Balance to 100%" weight fix, clean disabled buttons across 11 steps. B-5 tiles/stamps. B-8 company band on-brand. B-10 PDPL copy. B-11 login errors + password toggle + unified role-choice icons.

**Deliberately skipped** (owner's instruction): B-6 marketplace redesign, B-9 AI copilot redesign.

**Deferred** (next increment): B-1 unified app shell (bottom-tab mobile nav, notifications bell, one chrome for wizard/settings/docs) and the dependent B-7/B-12 route unification; full B-13 dark audit beyond the dashboard.
