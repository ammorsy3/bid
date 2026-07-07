# Tour Guide — Mobile Update Status

Tracking the mobile pass over the app's onboarding tour guides (spotlight tours + hint banners). Engine lives in `client/src/lib/tour.tsx`, content in `client/src/lib/tour-steps.ts`.

| Page | File | Tour type | Steps / hint | Fixed? |
|---|---|---|---|---|
| Dashboard | `Dashboard.tsx` | Spotlight tour | sidebar-nav, create-tender, dashboard-tabs, onboarding-tasks, user-menu | Yes |
| Settings | `Settings.tsx` | Spotlight tour | settings-account-tab, settings-company-tab, settings-team-section | Yes |
| AI Copilot | `TenderAICopilot.tsx` | Spotlight tour (x2) | Intro: quick-actions, chat-orb. Separate: preview-toggle (fires once a draft exists) | Yes |
| Tender Create Choice | `TenderCreateChoice.tsx` | Spotlight tour | ai-choice, manual-choice | Yes |
| Tender Details | `tender-details.tsx` | Spotlight tour | offers-section, negotiate-banner, proposal-comparison | Yes |
| Vendors Base | `Dashboard.tsx` (vendors tab — `VendorsBase.tsx` is unrouted/dead) | Spotlight tour | vendors-tabs, vendors-search, vendors-requests-tab | Yes |
| Tender Review | `TenderReview.tsx` | Dismissible banner | `tenderReview` hint | No |
| Submission Process Step | `TenderSubmissionProcessStep.tsx` | Dismissible banner | `submissionProcess` hint | No |
| Evaluation Criteria Step | `TenderEvaluationCriteriaStep.tsx` | Dismissible banner | `evaluationCriteria` hint | Yes |
| Form Builder | `TenderFormBuilder.tsx` | Dismissible banner | `formBuilder` hint | No |
| Form Fill | `TenderFormFill.tsx` | Dismissible banner | `formFill` hint | No |
| Negotiation Mode | `tender-details.tsx` | Dismissible banner | `negotiationMode` hint | No |
| Tender Invite Link | `TenderInviteLink.tsx` | No tour guide — general mobile UI pass | — | Yes |
| Project Scope Step | `TenderProjectScopeStep.tsx` | No tour guide — general mobile UI pass | — | Yes |

_Last updated: 2026-07-06_

**Tender Create Choice fix (2026-07-06):** page read `(user as any)?.activeCompany?.verificationStatus`, but `activeCompany` is a separate top-level field on the auth store, not a property of `user` — every other page destructures it as `const { user, activeCompany } = useAuthStore()`. This page only destructured `user`, so `verificationStatus`/`activeCompanyId` were always `undefined`, which meant the tour's `autoStart: verificationStatus === 'verified'` check was always false (tour never showed) and, separately, the verification gate (`if (verificationStatus && verificationStatus !== 'verified')`) never triggered either. Now destructures `activeCompany` directly from the store.

**AI Copilot fix (2026-07-06):** on mobile, the dark overlay leaves an un-dimmed "clear zone" at the bottom of the screen so the tour card (pinned to the bottom) isn't covered by the dim. That clear zone's height was computed from the hardcoded `CARD_H = 200` constant in `tour.tsx`, not the card's actual rendered height — since each step's title/body text is a different length, the real card is often shorter than 200px, leaving a band of un-dimmed page content visible between the real card and the assumed boundary. Looked like a phantom highlight at the bottom of the screen with no real spotlight ring around it (reported on the AI Copilot intro tour, but the bug is engine-level and affects every mobile spotlight tour). Fixed by measuring the card's actual height via a ref + `ResizeObserver` and using that instead of the fixed constant.

**Vendors Base fixes (2026-07-05):** step 2 (`vendors-search`) no longer silently skips when the join-requests sub-tab was last left open (tour now forces the vendors-list sub-tab while active); spotlight no longer lands near the bottom of the screen (main content scroll now resets on tab switch); "Book a demo" banner and onboarding task rows no longer collapse to one-word-per-line on mobile; "Completed" badge shrunk to fit more comfortably in the task row.

**Tender Details fixes (2026-07-05):** steps 2-3 (`negotiate-banner`, `proposal-comparison`) were auto-skipping right after step 1 because their target elements only exist for a closed tender with 2+ offers — the tour now filters its own step list against those same conditions instead of discovering the missing targets at runtime. Also fixed a race condition where the tour could evaluate that filter before the offers query had finished loading, wrongly dropping steps that the real data would've included.

**Tender Invite Link fixes (2026-07-05):** company name header no longer overlaps the "Open for Submissions" badge on mobile (row now stacks, name truncates); "At a Glance" Category cell no longer forces itself to an empty full-width row, leaving a gap next to Format (removed an incorrect `col-span-2`).

**Project Scope Step fixes (2026-07-05):** Start date / End date picker buttons ("Select date" placeholder, or a formatted date) no longer spill text past the button's rounded border on narrow columns — base `Button` has `whitespace-nowrap` with no overflow handling, so text now truncates with an ellipsis instead.

**Engine-level fix, applies to every tour/banner (2026-07-05):** `usePageTour`'s and `TourBanner`'s server-sync effects in `tour.tsx` only ever moved dismissal state one direction (toward "dismissed"), never back. Reported on Evaluation Criteria Step's banner, which wasn't reappearing after "Take a tour" — but the same one-directional bug existed for every spotlight tour and every banner in the app, since a reset done on one page can't be reflected until the next page's own sync effect runs, and that effect was incapable of un-hiding anything. Both effects now set state in both directions based on the synced result. Only Evaluation Criteria Step is marked fixed above since it's the only one actually re-tested — but the other still-"No" banner rows should be less likely to hit this specific symptom now too.
