# Arabic Translation Plan

**Date:** 2026-03-03
**Goal:** Make 100% of the application available in Arabic using the existing i18n system.

---

## Current State

- **i18n system:** Custom React Context in `client/src/lib/i18n.tsx`
- **Hook:** `useI18n()` → `{ t, language, setLanguage, isRtl }`
- **Translation call:** `t('namespace.key')`
- **Fully translated pages:** `Dashboard.tsx`, `Settings.tsx` (2 of ~46 pages)
- **Coverage gap:** ~95% of the application has hardcoded English strings

---

## How the i18n System Works

All translations live in a single file: `client/src/lib/i18n.tsx`.

```ts
const translations = {
  en: { settings: { firstName: "First name" }, dashboard: { ... } },
  ar: { settings: { firstName: "الاسم الأول" }, dashboard: { ... } },
};
```

To use a translation in a component:
```tsx
import { useI18n } from '@/lib/i18n';

const { t, isRtl } = useI18n();
return <h1>{t('mySection.myKey')}</h1>;
```

---

## Priority Order

Work through sections in this order (highest user-facing impact first):

1. **Authentication** — login, register, invitation signup
2. **Onboarding** — company onboarding, vendor onboarding
3. **Tender flows** — creation wizard (all steps), tender details, edit pages
4. **Vendor pages** — vendor dashboard, vendor base, vendor profile, pre-qualification
5. **Proposals** — submit offer modal, incoming offers, proposal details
6. **Admin pages** — admin dashboard, awards, join requests, users, vendors, audit logs
7. **Shared components** — navbar, tender card, modals, form components
8. **Landing page** — header, hero, features, footer, how it works, etc.

---

## Section-by-Section Tasks

### 1. Authentication Pages

Files:
- `client/src/pages/login.tsx`
- `client/src/pages/register.tsx`
- `client/src/pages/invitation-signup.tsx`

Keys to add under `auth.*`:
```
auth.signIn, auth.signUp, auth.email, auth.password, auth.confirmPassword,
auth.forgotPassword, auth.noAccount, auth.haveAccount, auth.loginSuccess,
auth.invalidCredentials, auth.emailRequired, auth.passwordRequired,
auth.passwordMismatch, auth.invitationExpired, auth.createAccount
```

RTL note: All form labels, placeholders, error messages, and button text must be covered.

---

### 2. Onboarding Pages

Files:
- `client/src/pages/CompanyOnboarding.tsx`
- `client/src/pages/VendorOnboarding.tsx`
- `client/src/pages/VendorPreQualification.tsx`

Keys to add under `onboarding.*`:
```
onboarding.welcome, onboarding.getStarted, onboarding.companyName,
onboarding.industry, onboarding.companySize, onboarding.next, onboarding.back,
onboarding.submit, onboarding.profileCompleted, onboarding.step (e.g. "Step 1 of 4"),
onboarding.uploadLogo, onboarding.categories, onboarding.certifications,
onboarding.preQualTitle, onboarding.preQualDesc
```

---

### 3. Tender Creation Wizard

Files (in order of wizard flow):
- `TenderCreateChoice.tsx`
- `TenderStartMethodStep.tsx`
- `TenderTitleStep.tsx`
- `TenderDescriptionStep.tsx`
- `TenderBriefStep.tsx`
- `TenderScopeStep.tsx`
- `TenderProjectScopeStep.tsx`
- `TenderSkillsStep.tsx`
- `TenderVendorRequirementsStep.tsx`
- `TenderBudgetStep.tsx`
- `TenderAIBudgetStep.tsx`
- `TenderEvaluationCriteriaStep.tsx`
- `TenderSubmissionProcessStep.tsx`
- `TenderFormBuilder.tsx`
- `TenderReview.tsx`
- `TenderEditPage.tsx` / `tender-edit.tsx`
- `TenderAICopilot.tsx`
- `CreateTender.tsx`

Keys to add under `tender.*`:
```
tender.createTender, tender.editTender, tender.title, tender.description,
tender.budget, tender.budgetMin, tender.budgetMax, tender.deadline,
tender.scope, tender.skills, tender.vendorRequirements, tender.evaluationCriteria,
tender.submissionProcess, tender.reviewAndPublish, tender.publish, tender.saveDraft,
tender.formBuilder, tender.addQuestion, tender.questionType, tender.required,
tender.aiCopilot, tender.aiSuggestion, tender.acceptSuggestion, tender.regenerate,
tender.inviteVendors, tender.copyLink, tender.published, tender.draft,
tender.closed, tender.cancelled, tender.deleteConfirm, tender.deleteSuccess,
tender.publishSuccess, tender.saveSuccess, tender.errorSaving
```

---

### 4. Tender Details & Invitation

Files:
- `client/src/pages/tender-details.tsx`
- `client/src/pages/TenderInviteLink.tsx`
- `client/src/pages/VendorInvitation.tsx`
- `client/src/components/tender-card.tsx`

Keys to add under `tenderDetails.*`:
```
tenderDetails.postedBy, tenderDetails.deadline, tenderDetails.budget,
tenderDetails.status, tenderDetails.description, tenderDetails.requirements,
tenderDetails.submitProposal, tenderDetails.invited, tenderDetails.inviteLink,
tenderDetails.copyInviteLink, tenderDetails.linkCopied, tenderDetails.vendorsInvited,
tenderDetails.evaluate, tenderDetails.compareProposals
```

---

### 5. Vendor Pages

Files:
- `client/src/pages/vendor-dashboard.tsx`
- `client/src/pages/VendorsBase.tsx`
- `client/src/pages/VendorStatus.tsx`
- `client/src/pages/TractionLink.tsx`
- `client/src/pages/RequesterProfile.tsx`

Keys to add under `vendor.*`:
```
vendor.dashboard, vendor.myProfile, vendor.tractionLink, vendor.copyTractionLink,
vendor.verificationStatus, vendor.verified, vendor.unverified, vendor.pending,
vendor.uploadDocuments, vendor.technicalFile, vendor.financialFile,
vendor.statusPending, vendor.statusApproved, vendor.statusRejected,
vendor.joinRequest, vendor.requestSent, vendor.categories, vendor.city
```

---

### 6. Proposals

Files:
- `client/src/pages/TenderFormFill.tsx`
- `client/src/components/submit-offer-modal.tsx`

Keys to add under `proposal.*`:
```
proposal.submitProposal, proposal.technicalProposal, proposal.financialProposal,
proposal.attachDocuments, proposal.notes, proposal.submit, proposal.submitted,
proposal.submittedOn, proposal.viewProposal, proposal.accept, proposal.reject,
proposal.ignore, proposal.status, proposal.pending, proposal.accepted,
proposal.rejected, proposal.offerAmount, proposal.currency
```

---

### 7. Admin Pages

Files:
- `client/src/pages/AdminDashboard.tsx`
- `client/src/pages/AdminAwards.tsx`
- `client/src/pages/AdminJoinRequests.tsx`
- `client/src/pages/AdminUsers.tsx`
- `client/src/pages/AdminVendors.tsx`
- `client/src/pages/AdminAuditLogs.tsx`

Keys to add under `admin.*`:
```
admin.dashboard, admin.pendingVerifications, admin.joinRequests,
admin.proposals24h, admin.blockedAwards, admin.awards, admin.unblockAward,
admin.unblockSuccess, admin.users, admin.vendors, admin.auditLogs,
admin.approve, admin.reject, admin.promoteUser, admin.userPromoted,
admin.verifyVendor, admin.vendorVerified, admin.actionPerformedBy,
admin.timestamp, admin.action, admin.target
```

---

### 8. Shared Components

Files:
- `client/src/components/navbar.tsx`
- `client/src/components/create-tender-modal.tsx`
- `client/src/pages/not-found.tsx`
- `client/src/pages/invitation-links.tsx`

Keys to add under `common.*` / `nav.*`:
```
nav.home, nav.tenders, nav.proposals, nav.vendors, nav.settings, nav.logout,
common.save, common.cancel, common.delete, common.edit, common.view,
common.search, common.filter, common.clearFilters, common.loading,
common.error, common.success, common.confirm, common.yes, common.no,
common.notFound, common.goHome, common.unexpectedError, common.tryAgain
```

---

### 9. Landing Page (lowest priority — not shown to logged-in users)

Files:
- `client/src/components/landing/Header.tsx`
- `client/src/components/landing/Hero.tsx`
- `client/src/components/landing/Features.tsx`
- `client/src/components/landing/Footer.tsx`
- `client/src/components/landing/HowItWorks.tsx`
- `client/src/components/landing/SocialProof.tsx`
- `client/src/components/landing/Problem.tsx`
- `client/src/components/landing/Results.tsx`
- `client/src/components/landing/UseCases.tsx`
- `client/src/components/landing/Testimonials.tsx`

Keys to add under `landing.*`:
```
landing.nav.features, landing.nav.howItWorks, landing.nav.useCases,
landing.nav.testimonials, landing.nav.login, landing.nav.tryNow,
landing.hero.title, landing.hero.subtitle, landing.hero.cta,
landing.hero.watchDemo, landing.features.title, ... etc.
```

---

## RTL-Specific Considerations

The `isRtl` flag from `useI18n()` is already available. When working on components, check for:

- **Text alignment:** Use `isRtl ? 'text-right' : 'text-left'` where needed
- **Flex direction:** Icons before text labels may need to be reversed (`flex-row-reverse`)
- **Padding/margin:** `pl-*` / `pr-*` should use `ps-*` / `pe-*` (logical properties) where possible, or conditionally swap
- **Dropdowns and popovers:** Ensure they open in the correct direction
- **Input fields:** Placeholder alignment and text direction
- **Progress indicators / step wizards:** May need step order reversed visually for RTL

---

## How to Add Translations (Step-by-Step Workflow)

For each section:

1. Open the target file(s) and identify all hardcoded strings
2. Open `client/src/lib/i18n.tsx`
3. Add the English keys under `translations.en.sectionName`
4. Add the Arabic translations under `translations.ar.sectionName`
5. In the component file, add `const { t, isRtl } = useI18n();`
6. Replace each hardcoded string with the appropriate `t('section.key')` call
7. Add `import { useI18n } from '@/lib/i18n';` at the top if not present
8. Test by switching language in Settings → Language

---

## Checklist

### Phase 1 — Core App (must be done first)
- [ ] Authentication pages (`auth.*`)
- [ ] Company & Vendor onboarding (`onboarding.*`)
- [ ] Shared navbar & common components (`nav.*`, `common.*`)

### Phase 2 — Main Workflows
- [ ] Tender creation wizard (`tender.*`) — all ~13 step files
- [ ] Tender details & invitation pages (`tenderDetails.*`)
- [ ] Vendor pages (`vendor.*`)
- [ ] Proposals (`proposal.*`)

### Phase 3 — Admin & Edge Cases
- [ ] Admin pages (`admin.*`)
- [ ] Not-found page, error states

### Phase 4 — Landing Page
- [ ] All landing page components (`landing.*`)

---

## Notes

- **Do not create separate JSON files** — keep everything in `client/src/lib/i18n.tsx` to match the existing pattern
- **Do not split by page** — group by logical domain (auth, tender, vendor, etc.)
- **Arabic must be accurate** — use proper Gulf/MSA Arabic; avoid machine-translated guesses for domain-specific terms like "tender" (مناقصة), "proposal" (عرض), "vendor" (مورّد), "award" (ترسية)
- **Test RTL layout** after each section by enabling Arabic in Settings
