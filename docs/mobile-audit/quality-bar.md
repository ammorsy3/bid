# Mobile + Arabic quality bar

What "looks like a real mobile app, with proper Arabic" means for Bid. The
fixer agent builds to this bar; the reviewer agent judges against it. The
automatic checklist (`tests/mobile/checker.js`) enforces the measurable parts.

## Priority order: iPhone Safari first
Most of Bid's phone traffic is Saudi iPhones. **iphone-webkit (Safari's
engine) is the priority phone check, checked before android-chrome or any
other project** — a fix that clears android-chrome but leaves an iOS-only
bug (auto-zoom on a <16px field, a safe-area gap, a WebKit-specific overflow)
is not done. When something can only be fixed for one engine at a time, fix
Safari's problem first. The owner's own 5-minute real-iPhone check (see
docs/mobile-audit/README.md) is the final word, since WebKit-via-Playwright
is a close approximation, not the real Safari.

## 1. Fits the phone
- Nothing wider than the screen. No sideways scrolling, nothing cut off at an
  edge, at 360, 393 and 430 px wide.
- One column on phones. Side panels and illustrations are for `lg:` and up.
- The page scrolls, not a box inside it. Use `min-h-dvh` (grows with content),
  never `h-screen`/`min-h-screen` + `overflow-hidden` + an inner scroller on phones.
  Keep desktop-only screen-height layouts behind `lg:`.
- Bars fixed to the bottom pad for the iPhone home bar:
  `pb-[max(1rem,env(safe-area-inset-bottom))]`.

## 2. Easy to use with a thumb
- Buttons and links: at least 44px tall on phones (24px absolute minimum, only
  when nothing else is within reach).
- Main action buttons are full width on phones (`w-full sm:w-auto`).
- Button rows wrap or stack on phones (`flex-col-reverse sm:flex-row`, `flex-wrap`,
  `gap-3`) — never a non-wrapping `justify-between` row of long labels.
- Popups are bottom sheets on phones (the shared `Dialog` already does this) and
  never taller than the screen without scrolling.

## 3. Typing works
- Field text is at least 16px on phones (`text-base md:text-sm`), otherwise the
  iPhone zooms in when the field is tapped and stays zoomed.
- Email fields: spread `emailInputProps` from `@/lib/form-validation` and add
  `autoComplete="username"` (sign-in) or `"email"`.
- Passwords: `autoComplete="current-password"` / `"new-password"`.
- Code boxes: `inputMode="numeric"`, `autoComplete="one-time-code"` on the first
  box, and the row must fit 320 px (`gap-1.5`, `w-9 min-[375px]:w-10`).
- Phone numbers: `type="tel" inputMode="tel" dir="ltr"`.
- With the keyboard open (≈400 px of screen left) the field being typed in and
  the submit button can both be reached.

## 4. Arabic is first-class
- The layout mirrors: logical classes only — `ms-/me-/ps-/pe-`, `start-/end-`,
  `text-start/text-end`, `border-s/border-e`, `rounded-s/rounded-e`. Never
  `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` for anything that should
  flip. `space-x-*` does not flip: use `gap-*`.
- Icons that point a direction (arrows, chevrons, "back", "next") flip in Arabic
  with `rtl:-scale-x-100`, unless the code already swaps the icon by language.
- Email, password, phone, URL, code and number fields stay left-to-right
  (`dir="ltr"`) inside Arabic pages. So do emails, URLs and codes shown as text
  (wrap them in `<bdi dir="ltr">` or the existing `.latin-token`).
- Arabic uses **IBM Plex Sans Arabic** (the Latin font stays Space Grotesk / Inter).
- No letter-spacing (`tracking-*`) on Arabic text — it breaks the joined letters.
  No `uppercase` on Arabic. Line height ≥ 1.5 for Arabic body text.
- No English left on Arabic pages, except brand names (Bid, Google, LinkedIn…),
  emails and URLs. Every visible string goes through `t()`; add the key to both
  `en` and `ar` in `client/src/lib/i18n.tsx`. Arabic wording follows
  `arabic_glossary_draft.md`. List every new or changed Arabic string in the page
  result so a native speaker can check it.
- Digits: Western digits (0-9) in both languages unless the design says otherwise;
  never Arabic-Indic digits on English pages.

## 5. Dark mode doesn't break anything
- Pages that force light mode (auth, onboarding) must not flash dark and must
  survive "force dark" in Samsung Internet / Chrome.
- Pages with a hard-coded cream background carry `surface-cream` so the logo
  stays visible (see the note in `client/src/index.css`).
- Text contrast at least 4.5:1.

## 6. Feels like an installed app, not a website you're visiting
The client's own words: it should feel like something from the App Store, not
a browser tab. Ahmed's clarification (2026-09-25): this is about the whole
journey, not the home-screen icon — every screen, tap and transition someone
moves through, not a one-time "Add to Home Screen" moment. The icon/manifest
work below is table stakes, not the point. Concretely:
- **Every tap answers back.** A phone has no hover — without an `:active`
  state a tap gives no feedback until the action finishes, which reads as
  slow/broken. `Button` and `NeonButton` already dim + shrink slightly on
  press (`active:scale-[0.97]`); anything that rolls its own clickable
  `<div>`/`<button>` instead of using those needs the same treatment.
- **No browser tells.** No grey tap-highlight flash (suppressed globally),
  no visible scrollbars on phones (default), no pull-past-the-edge chaining
  into the browser's own refresh/back gesture (`overscroll-behavior-y:
  contain`, set globally — don't fight it with `overscroll-behavior: auto`).
- **Opens like an app.** `site.webmanifest` + `apple-touch-icon.png` mean
  "Add to Home Screen" gets the real Bid icon and opens full-screen with no
  address bar; `theme-color` tints the status bar to match the page. If you
  add a genuinely new screen (not a variant of an existing one), it doesn't
  need a manifest change, but check it doesn't reintroduce a stray browser
  chrome moment (e.g. a full page navigation where a modal would do).
- **Motion feels deliberate, not instant cuts.** Popups slide in as bottom
  sheets (already the case for `Dialog`/`Sheet` on phones) rather than
  popping. Prefer a transition over a hard flash when content swaps.
- **Never make people pinch-zoom.** This is the practical test: if reading
  or tapping anything requires zooming in, it fails section 1/2 above,
  regardless of what this section says.

## 7. Desktop stays exactly as it is
- Phone fixes use the base classes; the desktop look is kept with `md:`/`lg:`
  prefixes. The 1280 px photos before and after must match.

## Repo traps (read before editing)
- `client/src/pages/landing.css` has `.landing-page section{padding:80px 0}`;
  scope new rules under `.landing-page` or they silently lose.
- Hard-coded cream pages need `.surface-cream` or the logo vanishes in dark mode.
- `server/vite.ts` stops the full dev server on any build error; batch 1 uses
  plain Vite on :5138 for that reason.
- Edits to `client/src/lib/i18n.tsx` force a full page reload.
- Big files (`Dashboard.tsx` 4k lines, `tender-details.tsx` 3k): change only the
  lines you mean to; never reformat a whole file.
