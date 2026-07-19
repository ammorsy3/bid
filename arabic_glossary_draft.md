# Arabic Glossary — Draft (extracted, not prescribed)

> Counts are occurrences inside Arabic values of `client/src/lib/i18n.tsx` (3,457 keys), plus notes from hardcoded surfaces (`Landing.tsx`, `email.ts`, `submit-offer-modal.tsx`). **This documents what exists today, including contradictions — it does not yet choose winners.** Choosing the canonical term per row is the next (copy) phase, with a native reviewer.

| # | Concept (product meaning) | Current Arabic variants (count) | Current English | Where used | Inconsistency notes |
|---|---|---|---|---|---|
| 1 | **The buyer's request document** — the thing a requester creates, publishes, receives proposals against | طلب عروض (22) · طلب العروض (43) · طلبات العروض (43) ⟷ مناقصة (54) · المناقصة (43) · مناقصات (25) | RFP / Tender (both used in English too) | طلب العروض: dashboard, tenderFlow, formBuilder, copilot, landing ⟷ مناقصة: marketplace, admin, notifications, invitationLinks, **all emails** | **The core split.** In-app requester flow says طلب عروض; marketplace, admin, notifications and every email say مناقصة. A user gets an email about "المناقصة" linking to a screen titled "طلب العروض". Same split exists in English (RFP vs Tender). One pair must win everywhere. |
| 2 | **The vendor's response** | عرض (153) · العرض/العروض (167+) · مقترح (8) · اقتراح (2) | Proposal / Offer / Bid | everywhere | عرض dominates, but عرض also literally lives inside "طلب **عروض**" (concept 1) — "قدّم عرضك على طلب العروض" stacks the same word for two objects. If مناقصة wins concept 1, this ambiguity disappears; if طلب عروض wins, consider مقترح for the response. |
| 3 | **Vendor** (supplier side) | مورد (278) · الموردون forms (475+ total) | Vendor / Supplier | everywhere incl. sidebar "قاعدة الموردين" | Consistent — the strongest term in the app. Keep. |
| 4 | **Requester / buyer** | مشتري (14) · المشتري (10) · طالب (10, partly in other senses) | Requester / Buyer | scattered | Low frequency and mixed; English UI itself wavers (Requester vs Buyer). Needs a decision more than a fix. |
| 5 | **Company / workspace** | شركة (109) · الشركة (95) | Company | everywhere | Consistent. Note "workspace" is sometimes مساحة عمل in onboarding — verify overlap. |
| 6 | **Dashboard** | لوحة التحكم (13) · اللوحة (1) | Dashboard | nav, auth, emails | Effectively consistent (لوحة التحكم). |
| 7 | **Marketplace** | السوق/سوق (31) | Marketplace | marketplace, nav, landing ("سوق بِـد") | Consistent as a word; brand attach varies with concept 12. |
| 8 | **Awarding** (selecting the winning proposal) | ترسية/الترسية (43) ⟷ منح (5) | Award | ترسية: tenderFlow, marketplace, notifications, admin ⟷ منح: settings, admin, formBuilder | ترسية is the procurement term and dominant; منح appears in admin/settings copy for the same act. Unify. |
| 9 | **Submit** (an action verb) | تقديم (141) · إرسال (45) · رفع (98) | Submit / Send / Upload | everywhere | Three verbs with real meaning differences (submit/send/upload) — mostly used correctly, but تقديم/إرسال swap on some buttons for the same action (e.g., proposal submission CTAs). Audit CTA-by-CTA in copy phase. |
| 10 | **Verification** | التحقق/تحقق (143) ⟷ توثيق/التوثيق (16) | Verify / Verification | التحقق: email OTP *and* company docs ⟷ توثيق: vendorStatus, marketplace badges | Two distinct product states — email verification vs company vetting — share التحقق in most places while badges say موثّق. Recommend: التحقق = email/OTP, توثيق = company vetting; today they interleave. |
| 11 | **Deadline** | الموعد النهائي (37) · آخر موعد (12) · تاريخ الاستحقاق (3) | Deadline / Due date | الموعد النهائي broadly; آخر موعد in tenderFlow/marketplace; تاريخ الاستحقاق in formBuilder/milestones | Three variants; تاريخ الاستحقاق ("due/maturity date") is a finance term misapplied to milestones. |
| 12 | **Brand name** | بِد (2, marketplace) · بيد (5, landing) · بِـد (landing/marketplace nav) · Latin **Bid** (27) | Bid | everywhere | Four renderings. بيد is also a real Arabic word ("however/whereas") — actively confusing. Decide: Latin "Bid" always, or one fixed Arabic transliteration with diacritics (بِد) everywhere. |
| 13 | **RFP wizard steps** | e.g. نطاق المشروع، الميزانية، عملية التقديم، معايير التقييم | Scope, Budget, Submission process, Evaluation criteria | tenderFlow, tenderSteps | Internally consistent; ensure the same nouns appear in the review page section headers and vendor-side views. |
| 14 | **Milestones** | مراحل / معالم (mixed in tenderFlow) | Milestones | scope step, brief | Verify single term (مراحل الدفع if payment-linked). |
| 15 | **Verified badge** | موثّق (badges) vs تم التحقق (states) | Verified | vendorStatus, companyProfile, dashboard | Falls out of #10's decision. |

## Recurring UI verbs worth locking (from CSV type=Button/CTA)
- Create: إنشاء (dominant) — sometimes أنشئ imperative; pick voice (imperative vs masdar) for ALL buttons.
- Save / Cancel / Back / Next: حفظ / إلغاء / رجوع / التالي — consistent today except a few عودة for Back.
- Publish: نشر — consistent. Delete: حذف — consistent.

## Sources to include in the final glossary that are OUTSIDE the dictionary
- `submit-offer-modal.tsx` local map: submission-type names (عرض سعر فقط، عرض كامل (فني + مالي)…) — these define concept 2 for vendors and must match the wizard's names in `tenderFlow.*`.
- `email.ts`: subjects/bodies (مناقصة family — concept 1's biggest divergence).
- `evaluation-criteria-data.ts`, `smart-unit-dropdown.tsx`, `tour-steps.ts`, `Landing.tsx` local dictionaries.
