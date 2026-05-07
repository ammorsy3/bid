# Bid — Brand Identity Implementation

This document records how the Bid brand identity (`attached_assets/Bid-Brand-Identity-Hero-Logo-Fixed-final-v2_1778148336788.pdf`) was applied to this codebase. It is the source of truth for tokens, components, and rules going forward.

If you're adding a new page or component, **read the "How to extend" section at the bottom**.

---

## 1. The brand in one minute

- **The dot is the brand.** A single perfect orange circle is the wordmark's tittle, the period at the end of every sentence, the data-viz primitive, and the state indicator.
- **One body font, one display font, one mono.** Space Grotesk (body), Inter Black 900 (display/wordmark), JetBrains Mono (numbers/IDs/code).
- **Six colors, one shape, every context.** Six dot states with motion: Idle (Stone, static), Live (Orange, pulse), Decision (Ink, stamped), Won (Green), Lost (Red), Pending (Amber, blink).
- **60 / 30 / 10 ratio.** Cream / Ink / Orange. Orange is never the background.
- **Voice rules.** Direct ("get to the number"), quantitative ("show the math"), confident not cocky. **Every brand sentence ends with a period.**

The full guidelines live in the PDF in `attached_assets/`.

---

## 2. Token system

All tokens live in `client/src/index.css`. Tailwind reads them via `tailwind.config.ts` (which now declares `fontFamily.sans = Space Grotesk`, `fontFamily.display = Inter`, `fontFamily.mono = JetBrains Mono`).

### 2.1 Brand neutrals (raw hexes)

| Token | Hex | Role |
|---|---|---|
| `--bid-ink` | `#1A1613` | Foreground, dark surfaces, type |
| `--bid-cream` | `#F4EDE1` | Marketing/identity background, ≥60% |
| `--bid-stone` | `#8A8078` | Support, muted, grid texture |
| `--bid-paper` | `#FFFFFF` | Product canvas (default app surface) |
| `--bid-orange` | `#FE3C01` | Signal — action, emphasis, ≤10% |

### 2.2 Dot states

| Token | Hex | Motion |
|---|---|---|
| `--state-idle` | `#8A8078` | static |
| `--state-live` | `#FE3C01` | `bid-dot-pulse` |
| `--state-decision` | `#1A1613` | none (stamped) |
| `--state-won` | `#1FA56A` | none |
| `--state-lost` | `#D7321F` | none |
| `--state-pending` | `#F0A800` | `bid-dot-blink` |

### 2.3 Shadcn semantic tokens (remapped)

`--primary` → Signal Orange. `--background` → Paper white (light) / Ink (dark). `--foreground` → Ink (light) / Cream (dark). `--ring` → Signal Orange. `--destructive` → brand red. Full set in `client/src/index.css`.

### 2.4 Font families (Tailwind)

```
font-sans     → Space Grotesk (default body, UI)
font-display  → Inter Black 900 (wordmark, page titles, big numerals)
font-mono     → JetBrains Mono (IDs, money, dates, code)
```

Loaded via Google Fonts CDN in `client/index.html`.

---

## 3. Brand components

### 3.1 `<BidLogo>` and `<BidMonogram>` — `client/src/components/brand/BidLogo.tsx`

Renders the wordmark with brand-correct geometry: dotless ı (U+0131) glyph in Inter 900, −0.055 em tracking, 0.255 em circle dot at the correct y-offset.

```tsx
<BidLogo size={28} />                      // default · ink word + orange dot
<BidLogo variant="onInk" size={32} />      // dark surfaces · cream word + orange dot
<BidLogo variant="onOrange" size={32} />   // signal surface · cream word + ink dot
<BidLogo variant="onCream" size={32} />    // everyday surface
<BidLogo variant="outline" size={32} />    // single-ink reproduction (engraving)
<BidMonogram size={32} />                  // square mark, used below 24 px
```

Favicon SVG: `client/public/favicon.svg` (B monogram on Ink).

### 3.2 `<StatusDot>` and `<StatusBadge>` — `client/src/components/brand/StatusDot.tsx`

The brand's "six colors, one shape" expressed as React. Drop-in replacement for any state pill.

```tsx
<StatusDot state="live" size={8} />        // pulsing orange circle
<StatusBadge state="won" label="Awarded" />// dot + label, soft tint background
```

### 3.3 Domain status mappers — `client/src/components/brand/statusMap.ts`

Map DB enum values → brand dot states:

```tsx
import { tenderStatusToState, awardStatusToState,
         proposalStatusToState, verificationStatusToState,
         reviewStatusToState } from "@/components/brand/statusMap";

<StatusBadge state={tenderStatusToState(tender.status)} label={...} />
```

Mappings (see file for details):

- Tender (`shared/schema.ts:257`) — `published` → Live, `closed` → Pending, `cancelled` → Lost, `draft` → Idle
- Award (`shared/schema.ts:547`) — `awarded` → Won, `blocked` → Lost, `pending` → Pending
- Proposal (`shared/schema.ts:360`) — `accepted` → Won, `rejected` → Lost, `superseded` → Idle, `pending` → Pending
- Company verification (`shared/schema.ts:81`) — `verified` → Won, `under_review` → Pending, `rejected` → Lost, `not_verified` → Idle
- Marketplace review — `approved` → Won, `rejected` → Lost, `pending` → Pending

### 3.4 Animations

Two keyframes added to `client/src/index.css`:

```css
.bid-dot-pulse  /* Live state · 1.6s pulse halo · `prefers-reduced-motion: reduce` honored */
.bid-dot-blink  /* Pending state · 1.4s opacity blink */
```

---

## 4. Approved colorways

Exactly four — never invent a fifth. These come straight from the brand book.

| # | Word color | Dot color | Surface | When |
|---|---|---|---|---|
| 01 | Ink `#0B0907` | Orange `#FE3C01` | white | default everywhere on light · "when in doubt, this is the answer" |
| 02 | Cream `#F4EDE1` | Orange `#FE3C01` | Ink/dark | dark mode UI, video, packaging |
| 03 | Cream `#F4EDE1` | Ink `#0B0907` | Orange | packaging, stickers, one-off signage |
| 04 | Ink `#0B0907` | Orange `#FE3C01` | Cream | docs, decks, "everyday surface" |

Outline variant (single-ink) for embossing, foil, engraving only.

**Constraints from the brand book:**
- Wordmark minimum digital size: **24 px wide**. Below that → `<BidMonogram>`.
- Dot is always a perfect circle, solid fill, 0° rotation. Never stroke / glow / gradient.
- Dot color always different from word color.

---

## 5. Implementation phases (chronological log)

### Phase 1 — Foundation
- Brand color tokens added to `index.css` for both `:root` and `.dark` scopes.
- Google Fonts loaded (Inter 900, Space Grotesk 300–700, JetBrains Mono 400/500/700).
- `<BidLogo>` + `<BidMonogram>` SVG components built.
- Favicon swapped to B monogram.
- Logo dropped into sidebar (`Dashboard.tsx`), all 4 auth pages, onboarding.
- Dotted-grid backgrounds re-tinted to low-opacity Stone / Cream.

### Phase 2 — Dot/Status System
- `<StatusDot>` + `<StatusBadge>` primitives + pulse/blink keyframes.
- Domain status mappers (`statusMap.ts`).
- Replaced ad-hoc badges in `tender-card.tsx`, `Dashboard.tsx`, `VendorProfileView.tsx`, `tender-details.tsx`.

### Phase 3 — Display headings + mono numerals
- Inter Black applied to page titles across Dashboard, tender-details, Marketplace, Settings, Admin pages.
- JetBrains Mono applied to dashboard stat tiles, tender card metadata, deadlines, currency.
- Status sweep extended to AdminMarketplace, CompanyProfilePage, invitation-signup.
- 60-file sed sweep replacing legacy coral hex (`#E25E45`, `#E8614D`) → Signal Orange.
- Onboarding layout: coral gradient panel → Ink (colorway 02).

### Phase 4 — Logo coverage sweep
- `AdminLayout` brand-ified (purple → orange, BidLogo added).
- 19 tender wizard pages: PNG `<img src={logoPath}>` → `<BidLogo>`.
- All wizard step h1s → display type.
- 7 admin page h1s → display type.
- Vendor + company page headings.

### Phase 5 — Shadcn primitive upgrades
- `CardTitle`, `DialogTitle`, `SheetTitle`, `AlertDialogTitle` all switched to `font-display font-black tracking-[-0.02em]` — affects every modal, sheet, alert dialog, and card title app-wide automatically.
- `Toaster` leads with `<StatusDot>` instead of lucide AlertCircle.
- Audit log action chips → brand status badges, timestamps + IDs in mono.
- Wizard step indicator: active step pulses orange, completed step uses state-won.

### Phase 6 — Tail surfaces
- VendorPreQualification, VendorOnboarding, TractionLink → display headings.
- not-found page redesigned with BidLogo + StatusDot.
- team-invite, requester-dashboard, vendor-dashboard, invitation-links → display.
- Hero h1s in TenderReview, CreateTender, TenderFormFill → 4xl Inter Black.

### Phase 7 — Final-mile sweep
- Navbar component: text "Bid" → `<BidLogo>`, blue accents → orange.
- SettingsNotifications, SettingsIntegrations, AdminMarketplace, verify-email h1s → display.
- Form-builder canvas + card library headings → display.
- AI Copilot welcome H2 → display, status indicator → `bid-dot-pulse`.
- VendorProfileView, RequesterProfileView profile names → display.

### Phase 8 — Docs accent + voice
- `.docs-scope` `--docs-primary` (and variants) swapped from old orange `hsl(22, 95%, 52%)` → Signal Orange `hsl(14, 99%, 50%)`. Body font in docs intentionally stays Inter (per design discussion).
- Brand-voice rewrites for empty states (EN + AR pairs):
  - "No tenders found" → "No tenders." / "لا توجد مناقصات."
  - "Create your first tender to get started" → "Create your first one." / "أنشئ أول مناقصة."
  - Plus 8 more (see `client/src/lib/i18n.tsx`).
- Empty-state h3s upgraded to display type. "Create your first" CTA: blue → Signal Orange.

### Phase 9 — Final cleanup, i18n audit, color sweep
- Wrote a Node audit script (`/tmp/audit_i18n.mjs`) that finds every `t('xxx')` call in code and cross-references against keys defined in `i18n.tsx`. Initial run: **18 missing keys**. Added all of them with EN + AR pairs (`common.dismiss`, `copilot.confirmReset*`, `formBuilder.cardVideoUrl*`, `formBuilder.insightVideoUrl*`, `formBuilder.insightVendorReqs*`, `tenderFlow.savedVoiceNote`, etc.). Final: **0 missing**.
- Hardcoded color sweep across 34 non-admin / non-form-builder / non-landing files. Swapped legacy blue/purple/emerald button accents to brand tokens (`bg-[var(--bid-orange)]`, `text-[var(--state-won)]`, etc.).
- Form-builder card library palette deliberately preserved.

### Phase 10 — Dark mode
- **Theme boot script** added inline in `client/index.html` so the `.dark` class is applied to `<html>` *before* React hydrates — eliminates the flash-of-light-mode on dark-mode boot.
- **Light-only color sweep across 93 files**: 660+ occurrences of `bg-white`, `text-gray-900`, `text-neutral-900`, `bg-gray-50`, `bg-neutral-50`, `bg-gray-100`, `bg-neutral-100` (all without dark variants) → swapped to semantic tokens (`bg-card`, `text-foreground`, `bg-muted`). Tokens already resolve correctly in both modes.
- **Generic dark variants brand-tuned across 44 files**: `dark:bg-gray-900` → `dark:bg-background`, `dark:bg-gray-800` → `dark:bg-card`, `dark:text-white` → `dark:text-foreground`, `dark:text-gray-{100,200,300}` → `dark:text-foreground` / `dark:text-muted-foreground`, `dark:border-gray-{700,800}` → `dark:border-border`. The brand's Ink/Cream tones now drive dark mode instead of generic gray.
- **Border token sweep across 78 files**: `border-gray-{100,200,300}` and `border-neutral-{100,200,300}` (no dark variant) → `border-border`.
- **Muted text token sweep across 93 files**: `text-gray-{500,600,700}` and `text-neutral-{500,600,700}` (no dark variant) → `text-muted-foreground`.
- After sweeps: **0 light-only patterns remain.** The brand's colorway 02 (Cream on Ink) is now the actual dark-mode behavior, not just a token declaration.

---

## 6. What's deliberately NOT done

| Item | Why | What it would take |
|---|---|---|
| **Homepage / `/` (Landing.tsx + components/landing/\*)** | User exclusion — homepage stays as is | A separate marketing-page redesign decision |
| **~~Dark-mode visual audit~~** | ~~User said "leave for last"~~ | ✅ **Done in Phase 10** — see notes below |
| **Charts / data viz** | No charts exist in the app today | When charts are introduced, render dot stacks per brand book ("no bars, no lines — just points of commitment, stacked") |
| **Voice rewrite beyond empty states** | Scope decision — empty states only | Dry-run rewrites of toasts, button labels, microcopy with user approval per surface |
| **Docs body font unification** | User preference — keep Inter in docs | If you change your mind, remove the `font-family: 'Inter'` rule from `.docs-scope` in `index.css` so docs inherit Space Grotesk |
| **`/admin/dashboard` blue avatar fallback** | Pre-existing nuance | Token swap to orange/ink |

---

## 7. What's likely still imperfect

I want to be honest: this rollout was thorough but not surgical. Things still likely off-brand:

1. **Hardcoded blue / purple / emerald colors in 42 files** — buttons, icons, status indicators in less-trafficked components: `AwardDialog`, `VendorProfileDrawer`, `TenderBriefCards`, several admin detail panels, `TenderAIBudgetStep`, etc. The shadcn primitive upgrades cover most cases automatically, but anything passing literal Tailwind classes like `bg-blue-600` or `text-emerald-700` still needs touching. Sweep recommendation: replace generic primary-button blues with `bg-[var(--bid-orange)]`, `text-[var(--bid-orange)]`, etc.
2. **Sub-card / tertiary headings** — h3/h4 in nested cards aren't always display type. The shadcn `CardTitle` upgrade covers most, but custom headings inline still vary.
3. **Loading skeletons** — current `Skeleton` component uses default shadcn animation. Could brand-tint shimmer to Cream/Stone.
4. **Tooltip / Popover bodies** — primitives use `bg-popover` (token-correct) but some content overrides with hardcoded styles.
5. **Form-builder card icons** — each card type has its own icon color. Some are in brand range from the sed sweep, others (greens, blues) aren't.
6. **Specific dialogs not individually reviewed** — `AwardDialog`, several form-builder modals, `ProposalComparison` interior, vendor pre-qual sub-screens.
7. **Voice/copy** — only empty states rewritten. Toasts, success messages, button labels, page descriptions all still in original wording. Brand book wants periods + quantitative claims everywhere appropriate.
8. **"Powered by Bid" footer brand mark in TractionLink / TractionLinkEditor** — still uses inline `<strong>Bid</strong>` text. Could swap to `<BidLogo>`.

A reasonable next pass: do a single click-through audit of every route, screenshot anything that looks off-brand, fix in a focused PR. Estimate: 3–5 hours of focused work to push from ~90% to ~99%.

**TypeScript baseline:** 79 errors throughout, all pre-existing — none introduced by the brand work.

---

## 8. How to extend (rules for new work)

### Adding a new page
1. **Logo:** drop `<BidLogo size={28}>` in the page header / sidebar / anywhere brand presence is needed. Use `variant="onInk"` if the surface is dark.
2. **Page title:** use `<h1 className="font-display font-black text-3xl tracking-[-0.04em]">`. Page heroes can go to `text-4xl`/`text-5xl` with `tracking-[-0.045em] leading-[0.92]`.
3. **Section titles:** `<h2 className="font-display font-black text-2xl tracking-[-0.03em]">`.
4. **Body text:** default — no class needed (Tailwind base sets Space Grotesk).
5. **Numbers, dates, IDs, money:** wrap in `<span className="font-mono">` and add `tabular-nums` if alignment matters.
6. **Buttons:** use shadcn `<Button>` with default variant (it pulls `bg-primary` = orange). Don't hardcode `bg-blue-*`.
7. **Status pills:** never roll your own — use `<StatusBadge state={...} />`.
8. **Status dots:** for inline indicators, use `<StatusDot state="live">` (auto-pulses) or `<StatusDot state="pending">` (auto-blinks).
9. **Surface background:** Paper white (`bg-background`) by default. Cream (`bg-[var(--bid-cream)]`) for hero / marketing-adjacent / empty-state pages. Ink for dark mode (handled by token).
10. **Microcopy:** brand sentences end with a period. Numbers > adjectives. If you add a string, add EN + AR in `client/src/lib/i18n.tsx`.

### When in doubt
- "When in doubt, this is the answer" = **colorway 01: Ink word + Orange dot on White surface.**
- Read the four-page brand panel in the PDF before inventing new patterns.

---

## 9. File map

```
client/src/components/brand/
  BidLogo.tsx        — wordmark + monogram
  StatusDot.tsx      — dot + badge primitives
  statusMap.ts       — DB enum → brand state mappers

client/src/index.css — all tokens + keyframes
client/index.html    — font + favicon
client/public/favicon.svg
tailwind.config.ts   — fontFamily declarations
```

---

*Implementation: 10 phases · ~310 file edits · 5 new files · 0 TypeScript errors introduced.*
