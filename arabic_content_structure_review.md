# Arabic Content — Structure & Quality Review

> Companion to `arabic_content_audit.csv` (3,457 keys × en/ar) and `arabic_glossary_draft.md`.
> **Diagnosis only — nothing has been changed.** Stack note: this is a React/TypeScript app, not Rails.
> The localization system is one dictionary — `client/src/lib/i18n.tsx` (`en:` block from line 8, `ar:` from line 3672) — resolved by `t('namespace.key')`. Emails live in `server/email.ts` as inline `isAr ? … : …` ternaries. RTL is applied by setting `dir="rtl"` + `lang="ar"` on `<html>` and using the `IBM Plex Sans Arabic` font.
>
> Screens marked ⚠️ **manual review** were not reachable in this audit session (they need a second account acting as vendor, received proposals, or an admin login) — strings for them ARE in the CSV; only the on-screen structural check is pending.

---

## 1. Public website

### Landing page `/` (`client/src/pages/Landing.tsx`)
- **Not on the central i18n system.** The page carries its own inline bilingual dictionary (~36 Arabic lines, e.g. line 50–53). Content is translated, but invisible to any centralized review/update process — and it renders the brand as **"بيد"** while the marketplace uses **"بِـد"** and most of the app leaves it Latin **"Bid"** (see glossary, term 12).
- Hero copy `heroSub: "اكتب بريف، أرسل للموردين، استلم العروض، رسّ المشروع."` — colloquial register ("بريف" is transliterated English "brief"; "رسّ" is dialect for award). Deliberate startup voice or accident? Decide once, apply everywhere.
- `btnCreateAccount: "سجّل حساب ←"` embeds a **left arrow** in the string. In RTL the arrow direction is content, not layout — flipping should come from CSS/icon, not the copy.

### Terms `/terms`, Privacy `/privacy`, FAQ `/faq`, Getting Started `/getting-started`, API Docs `/docs`
- **English-only, no i18n at all** (`Terms.tsx`, `Privacy.tsx`, `FAQ.tsx`, `GettingStarted.tsx` have no `useI18n`). For a Saudi-market product, legal pages existing only in English is the single largest missing-Arabic surface, and likely a compliance question (PDPL notices should be readable in Arabic).

---

## 2. Authentication

### Login `/login`
- Order (verified on screen): logo → "Sign in to your account" → email → password (+forgot link) → remember-device → Sign In → social buttons → sign-up link → terms/privacy links.
- The **footer links "Terms of Service · Privacy Policy" are hardcoded English JSX** (login.tsx ~line 292) — they never translate even in Arabic mode.
- Error strings now exist (`auth.loginError`, `loginErrorRateLimit`, `loginErrorGeneric`) in both languages — verify Arabic renders inside the new inline error banner with correct RTL icon placement (icon should sit right of text in RTL; current markup is LTR-ordered flex).
- `auth.loginSuccess` "تم تسجيل الدخول بنجاح" appears as a toast *before* the OTP screen — contradictory: the user has *not* finished signing in. Sequence/message mismatch.

### Signup `/signup`
- Password strength labels + "Show password" aria-labels are **hardcoded English** (`aria-label="Show password"` in register.tsx and login.tsx) — screen-reader users in Arabic get English.

### OTP `/verify-email`
- Order: logo → "Check your email" → sent-to line → 6 boxes → disabled Verify → resend countdown.
- OTP digit boxes have **no aria-labels at all** (unlabeled textboxes in the a11y tree — worse in Arabic where context is even thinner).
- Resend line format `"Didn't receive the code? Resend in 43s"` — check the Arabic version's number+letter ordering ("43s" style suffixes read badly in RTL; prefer "٤٣ ث" or full word).

---

## 3. Onboarding

### Role choice `/onboarding` — "Welcome, {name}! / How are you joining Bid?"
- Three cards (Company / Freelancer / Team). Copy is punchy in English; Arabic equivalents in `onboarding.*` read literal in places — flag for native pass.
- The left brand panel repeats the same headline/subtitle as auth pages (`onboardingPanel.setupWorkspace*`) — fine, but its Arabic says "منصة المشتريات الأكثر حداثة" (superlative marketing register) while inner steps are procedural — register whiplash between panel and form.

### Company basics `/onboarding/company-basics`
- The reassurance block ("Legal info… collected later from Settings → Company") names a navigation path — **verify the Arabic names the same menu labels actually used in Settings** ("الإعدادات ← الشركة"); paths described in prose go stale fast.

### Verification documents (onboarding step + `/tenders/new` gate)
- Same four document slots defined twice with **two different key sets** (`onboardingPanel.docNatLabel` vs `docNationalAddressLabel`) — duplicated content, single concept. Consolidation candidate (config exists: `lib/company-documents.ts`).
- Terminology: this flow mixes **التحقق** (145 uses app-wide) and **توثيق** (16 uses) for "verification" — two different Arabic concepts for one product state (see glossary term 10).

---

## 4. Requester journey (Dashboard `/dashboard`)

### Overview tab
- Order: "01 نظرة عامة." → stat tiles (Active RFPs / Pending Proposals / Vendors in Base) → demo banner → "02 Get started" checklist (6 items) → footer.
- Header subtitle `dashboard.getStartedDesc` ("6 steps to configure…") is used **twice on the same screen** — under the 01 header *and* under the 02 header. Duplicate visible text; the 01 instance describes the wrong section (stats, not steps).
- Stat tile labels are nouns without verbs — fine — but the Arabic for "Vendors in Base" should match the sidebar's "قاعدة الموردين" term exactly; verify no drift.
- The three "Not Verified" indicators (header subtitle, yellow card, avatar badge) each carry their own Arabic string — pick one surface (see UX plan B-1) and one wording.

### RFPs / Proposals / Vendors tabs
- Tab headers use "02 / 03 / 04" numbered titles while sidebar items carry the same names unnumbered — acceptable, but the Arabic tab title "قاعدة الموردين." with the editorial period needs checking: the orange full-stop motif is appended in code after Arabic text; in RTL the period lands on the *left* end of the word — visually it reads as a leading dot. **RTL-specific design/content bug.**
- Filter comboboxes ("All Types", "Offers Received") have no visible label in either language.

---

## 5. RFP creation

### Wizard steps 1–5 (`/tenders/new/*`)
- Step counter strings now read "1/5 … 5/5 (Optional)" (fixed this session). Arabic uses Latin digits "5 / 5" — consistent with the en side; fine, but decide digit policy globally (currency was fixed to locale digits; step counters are Latin in both).
- Title step microcopy "Keep it clear and specific" + word counter "6 / 10 words" — Arabic word counting works, but the counter renders "words · chars" mixed order in RTL; verify.
- Scope step: unit picker (`smart-unit-dropdown.tsx`) holds **28 hardcoded Arabic lines as a local map** — outside the dictionary; categories ("Content & Creative" etc.) equally local.
- Budget step: "AI Estimate / Set Manually" cards fine; **AI reasoning text returns in English only** (model output, `server/lib/tender-ai.ts` prompts English) even in Arabic UI — content in the wrong language mid-flow.
- Submission step: deadline explainer sentence rebuilds a date inside prose — Arabic sentence structure puts the weekday name first; verified format uses `ar-SA-u-ca-gregory` in places and plain `format(...)` in others — inconsistent calendar/locale sourcing.
- Criteria step: hint card + ring now has "Balance to 100%" — Arabic added (`موازنة إلى 100%`). The category names (Relevant Experience / Financial / Technical) come from `evaluation-criteria-data.ts` — **another local bilingual map (39 Arabic lines) outside the dictionary**.

### Review/Brief `/tenders/new/brief`
- Long page; section labels translated; **"Est." / "Range:" prefixes for the AI budget** were hardcoded English until this session (now keyed) — re-verify in Arabic.
- Vendor requirements list (10 default items) reads as legal boilerplate; Arabic phrasing is sound but items are duplicated in the criteria step — same list, two sources.

### AI Copilot `/tenders/new/ai`
- Greeting "Hey {name}, let's create something great" — Arabic version's tone should be checked (English is casual; literal Arabic of "let's create something great" sounds machine-like).
- The **conversation itself** (questions the copilot asks) originates from server prompts in English — Arabic users converse with an English-leaning agent. Content-in-journey mismatch to document for the copy phase.

---

## 6. Vendor invitation

### Invite link `/invite/:id` (`TenderInviteLink.tsx`, ns `vendorInvitation`, `invite`)
- ⚠️ Manual review (needs a second, vendor-side account to see the live page).
- Strings exist in both languages; date lines use `ar-SA-u-ca-gregory` correctly here.
- The tender's own content (title, description, deliverables) shows in the language it was written; the `translatedContent` AI-translation toggle exists — **empty-state when translation is missing** has no dedicated string (falls back silently to source language) — missing feedback message.

---

## 7. Marketplace publishing

### `/marketplace`
- Marketing hero + listing on one page; Arabic present (`marketplace.*`, 43+ keys).
- Brand rendered "بِـد" here (with kashida) vs "بيد" on landing — same word, two spellings, adjacent journeys.
- "Post a tender →" CTA embeds the arrow in the string again (RTL direction issue as landing).
- Publish-to-marketplace toggle in the wizard review: Arabic explains admin review, but the **binding-commitment confirmation** (`marketplace.confirmRequired*`) uses fallback `||` English defaults in code — if the key ever misses, users see raw English; keys exist today, but the pattern (`t(...) || 'English'`) hides future gaps. Found in `TenderBriefStep.tsx` handlePublish.

---

## 8. Vendor journey  ⚠️ manual review

- Vendor dashboard variants (`dashboard.*` member/vendor strings), vendors-base (`vendorsBase`, `vendorStatus`, `vendorPreQual` namespaces) are translated in the dictionary.
- **`submit-offer-modal.tsx` carries 74 hardcoded Arabic lines** — the entire submission-type labels/status maps are local. The most business-critical vendor surface is the least centralized.
- Traction link public page (`tractionPage.*`) translated; the *editor* (`TractionLinkEditor.tsx`) has stray hardcoded lines.

## 9. Proposal creation & submission  ⚠️ manual review
- Same `submit-offer-modal` note as above; validation of file-upload errors comes from `common.*` — generic wording ("Something went wrong") for a high-stakes act (submitting a bid). Needs stage-specific failure copy in Arabic ("تعذّر رفع الملف — لم يُقدَّم عرضك").

## 10. Proposal review & comparison  ⚠️ manual review
- `ProposalComparison.tsx` translated via dictionary + 1 hardcoded Arabic line; AI analysis output (executive summaries, criteria mapping) is **model-generated English** unless the tender language triggers Arabic prompts — verify with a real Arabic tender + proposals.

## 11. Awarding & purchase orders  ⚠️ manual review
- Award emails exist bilingually in `email.ts` (accepted/rejected/negotiation/milestone).
- Terminology: award = **ترسية** in tenderFlow/notifications but **منح** in settings/admin/formBuilder — two different acts to a reader (see glossary term 8).

---

## 12. Account, notifications & settings

### Settings `/settings`
- Renamed section "Privacy & compliance (PDPL)" this session — Arabic updated (`الخصوصية والامتثال (PDPL)`).
- **53 hardcoded English placeholders** app-wide concentrate here (e.g. `placeholder="Registered legal entity name"`, Settings.tsx:1913) — Arabic users type into English-hinted fields.
- Admin sub-pages are translated except **AdminFreelancers.tsx (no i18n at all)**.

### Notifications
- In-app notification strings (`notifications.*`) translated; **email notifications** (`server/email.ts`) are fully bilingual but standalone — subjects use **المناقصة** while in-app uses **طلب العروض** for the same object (glossary term 1: user gets an email about "المناقصة" and opens a screen about "طلب العروض").

---

## 13. Errors, empty states & system messages

- Empty states exist for RFPs/Proposals/Vendors/Marketplace ("لا توجد …") — short and fine; the *action hint* lines ("Create your first one.") should be checked for literalness ("أنشئ أول واحد" style).
- Global mutation-error fallback added this session is bilingual (reads localStorage language).
- `queryClient.ts` session-expired message **"Session expired. Please log in again." is English-only** (1 hardcoded line) — shown at the exact moment an Arabic user is thrown out.
- Validation namespace exists (`validation.*`); browser-native validation (required fields on plain inputs) will speak the OS language, not the app's — acceptable, note only.
- 13 keys have **identical en/ar values** — all placeholders (emails/URLs, acceptable) except review individually: list in `arabic_audit_stats.json → sameValue`.

---

## Strings bypassing the localization system (summary of locations)

| Location | Lines w/ Arabic | Pattern |
|---|---|---|
| `client/src/lib/tender-suggestions.ts` | 246 | AI seed content, local bilingual objects |
| `client/src/components/submit-offer-modal.tsx` | 74 | local label maps (vendor-critical) |
| `client/src/lib/tour-steps.ts` | 50 | tour copy, local bilingual |
| `client/src/pages/tender-details.tsx` | 39 | requirement formatter maps |
| `client/src/lib/evaluation-criteria-data.ts` | 39 | criteria categories |
| `client/src/pages/Landing.tsx` | 36 | page-local dictionary |
| `client/src/components/ui/smart-unit-dropdown.tsx` | 28 | unit names |
| `server/email.ts` + `server/routes.ts` + `server/lib/tender-ai.ts` | ~40+ pairs | `isAr ?` ternaries (works, but unauditable centrally) |
| English-only surfaces | — | Terms, Privacy, FAQ, GettingStarted, API Docs, AdminFreelancers, 53 placeholders, login footer links, aria-labels, `queryClient` session message |
| Dead file | — | `DashboardUI.tsx` (18 English text runs, **imported nowhere** — exclude from copy work, candidate for deletion) |

## Screens requiring screenshots / manual review
1. Vendor invite page as a real vendor (`/invite/:id`) — both languages.
2. Submit-offer modal, all four submission types — Arabic.
3. Proposals received + comparison + AI analysis with Arabic tender data.
4. Award / negotiation dialogs + resulting emails (Arabic recipient).
5. Admin suite (needs admin account) incl. AdminFreelancers (untranslated).
6. Full app pass with `dir="rtl"`: numbered-title period position, arrows-in-strings, toast alignment, OTP boxes order.
