# Mobile + Arabic quality bar

What "looks like a real mobile app, with proper Arabic" means for Bid. The
fixer agent builds to this bar; the reviewer agent judges against it. The
automatic checklist (`tests/mobile/checker.js`) enforces the measurable parts.

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

## 6. Desktop stays exactly as it is
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
