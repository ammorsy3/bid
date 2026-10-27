# Vendor-offering classification

Task BID-OFFERING-CLASSIFICATION (2026-10-26). This note describes what was built, the rules the server enforces, and the contract for future search, matching and analytics. Matching, RFP extraction, automatic invitations and notifications are **not** implemented.

## 1. Catalogue

- **Source:** Google Sheet "Bid — Company Registration Catalogue" (`1iBjCNeg6n1kvUwtGpKSQck4nliaZrDo-pEA8NGd2n3g`), version `registration-1.0-draft`.
- **Snapshot:** a versioned local copy at `shared/offering-catalogue/source/registration-1.0-draft.sheets.json`, with provenance (revision, modified time, retrieval time) and a sha256 content checksum. Registration never contacts Google Sheets.
- **Import:** `npx tsx scripts/offering-catalogue/import.ts` builds the outputs below; `--check` fails if any output is out of date. The import is repeatable and idempotent. Any validation error aborts it before anything is written. It checks:
  - duplicate IDs;
  - missing parents;
  - inconsistent parent names or ID prefixes;
  - empty labels;
  - unknown offering types;
  - empty or duplicate examples;
  - the sheet's own roll-up counts;
  - the checksum.
- **Outputs:**
  - `catalogue.json` — what the app reads, on both server and client.
  - `item-ids.json` — persisted item IDs.
  - `migrations/0021_offering_catalogue_seed.sql` — an idempotent upsert for the database.
- **Levels:** main sector (42) → specialized sector (163) → offering group (695). The listed items inside a group (629) are offering *details*, not a fourth level.
- **Listed items:** "Includes (Examples)" is split only on `;`.
  - Each part becomes one item with `provenance: "source_example"`. The list is a non-exhaustive starting list, not an authoritative service catalogue.
  - A group whose only example repeats its own name (409 groups) has no listed items and is declared as a whole.
  - Nothing is invented, and no part is split further.
- **Stable IDs:**
  - Sector, specialization and group IDs come from the sheet.
  - Item IDs (`<group>-Inn`) are assigned once and stored in `item-ids.json`, keyed by group plus normalised source text. They survive reordering, label edits and translation.
  - A new example gets the next free number.
- **Catalogue changes:**
  - A record that leaves the source stays as `deprecated`: still readable, no longer selectable.
  - An existing ID whose parent changes is an import error, so a move needs a new ID.
  - Organizations keep deprecated records they already hold.
- **Arabic:** `labels.ar.json` holds the Arabic label for each ID (1,529 records). Source labels are preserved separately (`src`). Every label was reviewed for semantic accuracy against its source label on 2026-10-27; 49 labels were corrected (listed in section 8). The review changed meaning only, never IDs, parents, types or scope.

## 2. Data model (migrations 0020, 0021)

| Table | Holds |
| --- | --- |
| `offering_catalogue_versions`, `offering_sectors`, `offering_specializations`, `offering_groups`, `offering_items` | The non-sensitive catalogue, with status and the version each record was introduced in |
| `company_vendor_registrations` | Per organization: `status`, `revision`, `catalogue_version`, `registered_at`, `updated_at/by`. **Private.** Deliberately not a `companies` column: many responses spread company rows |
| `company_offering_items` | Explicit positive item selections. PK `(company_id, item_id)`; FK `(item_id, group_id)` → `offering_items(id, group_id)`, so an item can never be stored under another group |
| `company_offering_groups` | Group-level declarations, kept distinct from item selections. A declaration never implies the group's items |

- **Indexes** support these lookups:
  - organization → offerings (primary keys);
  - item → organizations;
  - group → organizations;
  - specialization → groups;
  - registration status.
- Every new table has RLS enabled, as in 0012/0014.
- **Not stored:** sector arrays, group arrays, roll-ups, "all future children" flags, exclusion lists. Partial states are derived from the explicit selections. A removed group's configuration is kept only in the editor's local draft, so it can be restored within that draft; it is never read as an offering.

## 3. Registration completeness (server-enforced)

**Statuses:**

| Status | Meaning |
| --- | --- |
| `legacy_unclassified` | Existed before this feature: unknown, not "offers nothing" |
| `requester_only` | A company that only requests offers |
| `pending` | Vendor registration started, nothing effective yet |
| `registered` | At least one effective offering |

**Invariant:** `registered` holds only while the organization has at least one effective offering, meaning a selected listed item or a group declaration. A sector or specialization choice is not one.

**Enforcement:** the only path to `registered` is `PUT /api/companies/:id/offerings`, which runs in one transaction under the registration row lock:

1. Check the revision the editor started from (409 `OFFERINGS_CONFLICT` with only the current revision; no selections).
2. Validate every ID against the catalogue and the organization's held records (422 `INVALID_SELECTION`, error codes only).
3. Refuse an empty classification (`OFFERINGS_REQUIRED`). A registered vendor cannot remove its last offering (`LAST_OFFERING_REQUIRED`); its previous offerings are kept.
4. Require explicit activation for `requester_only` (`activateVendor`, otherwise `VENDOR_NOT_ACTIVE`).
5. Replace the offerings, set the status, bump the revision and write a counts-only activity row.

All of these commit together or not at all. A retried save that already committed is answered without a second write.

**Who can do what:**
- Owner and admin of the active organization can change offerings.
- Every member can read them.
- There is no implicit platform-admin access.
- Client-sent status, company ID, role and unknown fields are refused, not ignored.

**Creation (`POST /api/companies`):**
- A company must send `vendorIntent`: `vendor` → `pending`, or `requester_only`.
- Teams and individuals only offer, so they always start `pending`.
- No organization is ever created as `registered`.

**Vendor capabilities:** offer submission (`POST /api/tenders/:id/offers`) and itemized pricing (draft and submit) refuse `pending` and `requester_only` organizations with 403 `VENDOR_REGISTRATION_REQUIRED`. Registration completeness is not verification, prequalification or bidding eligibility; those checks are unchanged and still apply.

**Unchanged concepts:**
- `companies.onboardingState` still means "first profile saved".
- `verificationStatus` is untouched.
- Authentication and email verification are separate.

**Organization-level:** classification belongs to the organization. Invited members reuse it, and switching workspace never shows another organization's data. Client drafts are keyed by user and organization and removed on logout.

## 4. Legacy policy

- Migration 0020 gives every existing company an explicit `legacy_unclassified` row.
- The old `companies.category` is **never** used to infer offerings.
- Legacy organizations keep every record, verification state and capability, including submitting offers: they are not locked out.
- Owners and admins see a dashboard prompt and can classify in Settings → Services & products. A legacy company that only requests can declare that.
- Until classified, a legacy organization is excluded from taxonomy analytics and from any future taxonomy-based matching.
- A company created by the old app between migration and deploy has no row. The new app reads it as `legacy_unclassified`, never as registered, and re-running 0020 backfills it.

## 5. Future deterministic matching (contract only, not implemented)

- RFP requirements will reference the same canonical IDs: group IDs and item IDs.
- **Specificity:**
  - An exact item selection is a stronger signal than a group declaration.
  - A group declaration never satisfies a specific item requirement on its own.
  - Specialization or sector overlap is a broad candidate signal only.
- **Requirement modes:** requirements will say all-of (mandatory) or any-of (optional). An organization meets all-of only when every required item is explicitly selected.
- **Separate checks:** authorization, verification, prequalification, availability and bidding eligibility stay separate, after taxonomy matching.
- **Who is eligible:** only `registered` organizations take part. `legacy_unclassified` is unknown.
- **Keyword-assisted classification (future):**
  - Use the deterministic normaliser in `shared/offering-catalogue/normalize.ts` (Arabic letter folding, diacritics, digits, articles).
  - Use curated aliases mapped to canonical IDs, kept separate from display labels.
  - Prefer exact labels and phrases, then aliases and tokens.
  - Return ambiguous terms as several candidates that need confirmation.
  - Keyword overlap is never proof that an RFP was understood. No AI API, embeddings or external search is needed.

## 6. Analytics

`server/lib/offering-analytics.ts`:

- **`organizationsBy(bucket)`**, for buckets `sector | specialization | group | item | offering_type`:
  - counts DISTINCT registered, non-deleted organizations per bucket;
  - for `item`, counts explicit item selections only;
  - buckets overlap, so per-sector counts must not be summed into a unique total.
- **`classificationStatusCounts()`** counts each organization once, including companies with no row (legacy).
- **`referenceOrganizationsBy()`** defines the semantics in memory. The integration test checks the SQL against it on Postgres.

Results are aggregates; do not log per-organization selections.

Example (organizations per specialization):

```sql
WITH effective AS (
  SELECT company_id, group_id FROM company_offering_items
  UNION SELECT company_id, group_id FROM company_offering_groups)
SELECT g.specialization_id, count(DISTINCT e.company_id)
FROM effective e JOIN offering_groups g ON g.id = e.group_id
JOIN company_vendor_registrations r ON r.company_id = e.company_id AND r.status = 'registered'
JOIN companies c ON c.id = e.company_id AND c.deleted_at IS NULL
GROUP BY 1;
```

## 7. Rollout

1. Apply `0020_vendor_offerings.sql`, then `0021_offering_catalogue_seed.sql`, per environment. Each needs approval; see the runbook in 0020.
2. Deploy the app.
3. Verify:
   - every existing company shows `legacy_unclassified`;
   - 695 active groups and 629 active items.

**Rollback:** before any offering is saved, the old app ignores these tables. After offerings exist, keep the tables.

## 8. Arabic label review (2026-10-27)

- **Coverage:** all 1,529 records (42 sectors, 163 specializations, 695 groups, 629 items), each compared with its source label.
- **Rule:** correct only meaning errors or ambiguity (a wrong concept, a narrowing or broadening, or a term that reads as something else in this catalogue). No stylistic rewrites. IDs, parents, types and scope are unchanged.
- **Result:** 1,480 kept, 49 corrected. Derived files regenerated with the importer (`catalogue.json`, `0021_offering_catalogue_seed.sql`); `item-ids.json` is unchanged.
- **Reviewer:** Claude Code (implementer), not a native-speaker copy editor.

| ID | Source | Before | After | Reason |
| --- | --- | --- | --- | --- |
| BID-D05-F02-G03-I01 | Assessment design | تصميم الاختبارات | تصميم أدوات التقييم | 'Assessment' was narrowed to 'tests/exams' (الاختبارات). |
| BID-D05-F03-G02-I02 | Vocational training kits | حقائب التدريب المهني | أطقم معدات التدريب المهني | 'الحقائب التدريبية' means training curricula/packages in Arabic usage; the source is physical kits under Classroom & Training Equipment. |
| BID-D07-F03-G03 | Voice-over & Subtitling | التعليق الصوتي والترجمة المرئية | التعليق الصوتي والترجمة النصية | 'الترجمة المرئية' is ambiguous (audiovisual/visual translation); subtitling is on-screen text translation. |
| BID-D07-F03-G03-I02 | Subtitling | الترجمة المرئية | الترجمة النصية للمحتوى المرئي | Same as parent: subtitling, not visual translation. |
| BID-D08-F02-G05 | Event attendee research | أبحاث حضور الفعاليات | أبحاث الحاضرين في الفعاليات | 'أبحاث حضور' reads as attendance-rate research; source is research about attendees. |
| BID-D08-F03-G01 | Exhibition Stands & Venue Fit-outs | أجنحة المعارض وتجهيز المواقع | أجنحة المعارض وتجهيز أماكن الفعاليات | 'المواقع' is ambiguous (sites/websites); source is event venues. |
| BID-D08-F03-G01-I02 | Temporary venue fit-out | التجهيز المؤقت للمواقع | التجهيز المؤقت لأماكن الفعاليات | Same venue ambiguity. |
| BID-D08-F03-G02 | Stages & Temporary Seating | المسارح والمقاعد المؤقتة | المنصات المسرحية والمقاعد المؤقتة | 'المسارح' means theatres (buildings); source is temporary stages. |
| BID-D08-F03-G02-I01 | Temporary stage construction | إنشاء المسارح المؤقتة | إنشاء المنصات المسرحية المؤقتة | Same: stages, not theatres. |
| BID-D11-F04-G02-I01 | Hardware security modules | وحدات أمن الأجهزة (HSM) | وحدات الأمان المادية (HSM) | 'وحدات أمن الأجهزة' means 'security of hardware'; an HSM is a hardware (physical) security module. |
| BID-D11-F04-G02-I02 | Authentication tokens | أدوات المصادقة | رموز المصادقة المادية | 'أدوات المصادقة' is vague (any tool); source is hardware authentication tokens. |
| BID-D12-F03-G01 | Business Process & Workflow Automation | أتمتة العمليات التجارية وسير العمل | أتمتة عمليات الأعمال وسير العمل | 'العمليات التجارية' narrows business processes to commercial/trade operations. |
| BID-D16-F01-G01 | Cement, Concrete & Masonry | الأسمنت والخرسانة والمباني الحجرية | الأسمنت والخرسانة ومواد أعمال المباني (كالطوب والبلوك والحجر) | 'المباني الحجرية' means stone buildings; source is masonry materials. 'أعمال المباني' is the usual Arabic BOQ term for masonry and keeps its full scope; stone is named, and the examples are introduced with 'كـ' (such as) so they do not read as exhaustive. (r2 had 'بالطوب والبلوك', which dropped stone — OFC-R2-1.) |
| BID-D17-F02-G01 | Switchgear & Distribution Boards | لوحات المفاتيح ولوحات التوزيع | معدات المفاتيح الكهربائية ولوحات التوزيع | 'لوحات المفاتيح' commonly means keyboards; source is electrical switchgear. |
| BID-D17-F02-G01-I01 | Switchgear | لوحات المفاتيح الكهربائية | معدات المفاتيح الكهربائية (Switchgear) | Same switchgear ambiguity. |
| BID-D17-F04-G05 | MEP testing and commissioning | اختبار وتشغيل الأنظمة الكهروميكانيكية | الاختبار والتشغيل التجريبي للأنظمة الكهروميكانيكية | 'تشغيل' alone reads as operation; commissioning is trial start-up and handover. |
| BID-D20-F02-G03 | Casting & Forging | السباكة والطرق | صب المعادن وطرقها | 'السباكة' is also the catalogue's word for plumbing; metal casting is unambiguous as 'صب المعادن'. |
| BID-D20-F02-G03-I01 | Metal casting | سباكة المعادن | صب المعادن | Same casting/plumbing ambiguity. |
| BID-D21-F02-G03 | Mechanical, Hydraulic & Pneumatic Drives | أنظمة النقل الميكانيكية والهيدروليكية والهوائية | أنظمة نقل الحركة الميكانيكية والهيدروليكية والهوائية | 'أنظمة النقل' reads as transport systems; drives are power-transmission systems. |
| BID-D21-F03-G01-I02 | Fasteners | أدوات التثبيت | المثبتات (البراغي والصواميل) | 'أدوات التثبيت' reads as fixing tools; fasteners are the components themselves. |
| BID-D22-F01-G04 | Passive Electronic Components | المكونات الإلكترونية الخاملة | المكونات الإلكترونية السلبية (غير الفعالة) | 'الخاملة' means inert; the electronics term for passive components is سلبية/غير فعالة. |
| BID-D22-F03-G01 | Industrial Controllers, Interfaces & Drives | وحدات التحكم والواجهات والمحركات الصناعية | وحدات التحكم والواجهات ومشغلات المحركات الصناعية | 'المحركات' means motors; the source 'drives' are motor drive controllers (VFDs). |
| BID-D22-F03-G01-I03 | Variable frequency drives | محركات التردد المتغير (VFD) | مشغلات المحركات متغيرة التردد (VFD) | A VFD is a drive controlling a motor, not a motor. |
| BID-D23-F01-G02 | Well Testing & Logging | اختبار الآبار وتسجيلها | اختبار الآبار وتسجيلاتها | 'تسجيلها' reads as registering wells; well logging is downhole measurement records. |
| BID-D23-F01-G02-I02 | Well logging | تسجيل الآبار | تسجيلات الآبار (جسّ الآبار) | Same well-logging ambiguity. |
| BID-D25-F02-G05 | Refractory materials | المواد الحرارية | المواد المقاومة للحرارة (الحراريات) | 'المواد الحرارية' means thermal materials generally; refractories are heat-resistant materials. |
| BID-D25-F03-G01 | Metal Stock & Alloys | مخزون المعادن والسبائك | المعادن نصف المصنعة والسبائك | 'مخزون' means inventory; 'metal stock' is semi-finished stock material (bars, sheets, sections). |
| BID-D25-F03-G01-I01 | Steel stock | مخزون الحديد الصلب | الصلب نصف المصنع | Same stock/inventory error. |
| BID-D25-F03-G01-I02 | Aluminum stock | مخزون الألومنيوم | الألومنيوم نصف المصنع | Same stock/inventory error. |
| BID-D25-F03-G01-I03 | Copper stock | مخزون النحاس | النحاس نصف المصنع | Same stock/inventory error. |
| BID-D27-F04-G02 | Animal Grooming & Boarding | العناية بالحيوانات وإيواؤها | العناية بمظهر الحيوانات وإيواؤها | 'العناية بالحيوانات' broadens grooming to all animal care, overlapping the parent specialization. |
| BID-D28-F01-G04 | Grains, Pulses & Edible Oils | الحبوب والبقوليات والزيوت النباتية | الحبوب والبقوليات وزيوت الطعام | 'الزيوت النباتية' narrows edible oils to vegetable oils. |
| BID-D28-F01-G04-I02 | Edible oils | الزيوت النباتية | زيوت الطعام | Same narrowing. |
| BID-D30-F01-G05 | Multimodal Freight & Forwarding | الشحن متعدد الوسائط والتخليص والشحن | الشحن متعدد الوسائط ووكالة الشحن | 'التخليص' means customs clearance (a separate group, BID-D30-F02-G07); forwarding is وكالة الشحن. |
| BID-D32-F04-G03 | Fitness instruction | التدريب الرياضي البدني | تدريب اللياقة البدنية | 'التدريب الرياضي البدني' duplicated sports coaching (BID-D40-F02-G02); source is fitness instruction. |
| BID-D33-F02-G01 | Laboratory Reagents & Diagnostic Kits | كواشف المختبرات وأدوات التشخيص | كواشف المختبرات ومجموعات التشخيص | 'أدوات' reads as instruments; kits are packaged test sets. |
| BID-D33-F02-G01-I02 | Diagnostic test kits | أدوات الاختبارات التشخيصية | مجموعات الاختبارات التشخيصية | Same kits/instruments ambiguity. |
| BID-D34 | Scientific, Laboratory, Testing & Certification | العلوم والمختبرات والاختبار والاعتماد | العلوم والمختبرات والاختبار وإصدار الشهادات | 'الاعتماد' means accreditation (a different service, BID-D34-F03-G04); certification is issuing certificates of conformity. |
| BID-D34-F03-G01 | Product & Management System Certification | اعتماد المنتجات وأنظمة الإدارة | إصدار شهادات المنتجات وأنظمة الإدارة | Same certification/accreditation error. |
| BID-D34-F03-G01-I01 | Product certification | اعتماد المنتجات | إصدار شهادات المنتجات | Same certification/accreditation error. |
| BID-D34-F03-G01-I02 | Management system certification | اعتماد أنظمة الإدارة | إصدار شهادات أنظمة الإدارة | Same certification/accreditation error. |
| BID-D35 | Furniture, Office, Retail & Commercial Equipment | الأثاث والمكاتب ومعدات التجزئة والمعدات التجارية | الأثاث والمعدات المكتبية ومعدات التجزئة والمعدات التجارية | 'المكاتب' reads as offices (premises); the source is office equipment. |
| BID-D35-F01-G01-I01 | Office desks | المكاتب | الطاولات المكتبية | 'المكاتب' is ambiguous between desks and offices. |
| BID-D35-F02-G01-I02 | Office organizers | منظمات المكاتب | أدوات التنظيم المكتبية | 'منظمات المكاتب' reads as 'office organizations'. |
| BID-D39-F04-G01 | Fire System Inspection & Commissioning | فحص أنظمة الحريق وتشغيلها | فحص أنظمة الحريق وتشغيلها التجريبي | 'تشغيلها' reads as operating the systems; commissioning is trial start-up and handover. |
| BID-D39-F04-G01-I02 | Fire protection commissioning | تشغيل أنظمة الحماية من الحريق | التشغيل التجريبي لأنظمة الحماية من الحريق | Same commissioning ambiguity. |
| BID-D40-F04-G04 | Venue Programming & Live Performance | برمجة المواقع والعروض الحية | برمجة فعاليات الأماكن والعروض الحية | 'برمجة المواقع' reads as programming websites; source is programming a venue's events. |
| BID-D40-F04-G04-I01 | Venue programming | برمجة فعاليات المواقع | برمجة فعاليات الأماكن | Same venue/website ambiguity. |
| BID-D41-F03-G03 | Humanitarian Logistics & Disaster Coordination | اللوجستيات الإنسانية وتنسيق الكوارث | اللوجستيات الإنسانية وتنسيق الاستجابة للكوارث | 'تنسيق الكوارث' literally means coordinating disasters. |
