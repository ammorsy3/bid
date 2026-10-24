# Arabic alignment of audit-added strings

Scope: Arabic lines added or changed in `client/src` between 8db4ab1 and HEAD (about 490 lines: 444 in `i18n.tsx`, the rest in `category-labels.ts`, `docs-manifest.ts`, `Pricing.tsx` and small literals). Only the strings listed below were changed; every other new string already matched the app.

## Rules inferred from the existing app
- Mixed register, mostly plain standard Arabic. Everyday dialect is used in errors and empty states ("ما تقدر", "ما فيه", "ما قدرنا" in the base too), so dialect there is kept.
- Failure messages lead with "تعذر + noun" (59 uses). Retry is "حاول مرة أخرى" or "حاول مرة ثانية" (both common).
- Digits are Western (0-9); Arabic-Indic digits are almost absent in older strings.
- Tanween is written on the letter before the alef ("يومًا", "دائمًا", 74 uses), never after it ("يوماً").
- No kasra/fatha on imperatives; shadda and tanween are the only common diacritics. Count nouns follow يوم واحد / يومان / أيام / يومًا, سنة / سنتان / سنوات / سنة.
- Glossary: طلب عروض and مناقصة are both used; عرض = offer; الرقم الضريبي; العنوان الوطني; تصفّح; نقل لأعلى.

## Strings changed

### Dashboard

| Key | Before | After | Why |
|---|---|---|---|
| daysLeftOne | يوم واحد متبقي | يوم واحد متبقٍ |  |

### Admin checkouts

| Key | Before | After | Why |
|---|---|---|---|
| checkoutsSubtitle | كل من بدأ شراء باقة. من لم يكمل يصله تذكير واحد تلقائي بالبريد، ويمكنك التواصل معه شخصياً من هنا أيضاً. | كل من بدأ شراء باقة. من لم يكمل يصله تذكير واحد تلقائي بالبريد، ويمكنك التواصل معه شخصيًا من هنا أيضًا. | tanween on alef (app style) |

### Cookie policy

| Key | Before | After | Why |
|---|---|---|---|
| itemDrafts | يحفظ طلب عروض أو بريفًا أو خطوة إعداد لم تكملها، حتى لا تفقدها إذا أغلقت الصفحة. | يحفظ طلب عروض أو ملخصًا أو خطوة إعداد لم تكملها، حتى لا تفقدها إذا أغلقت الصفحة. | app word for brief |

### Upgrade and billing

| Key | Before | After | Why |
|---|---|---|---|
| titleFallback | رقِّ باقتك للمتابعة | رقّ باقتك للمتابعة | no kasra |
| perMonthPlusVat | شهرياً + الضريبة | شهريًا + الضريبة | tanween on alef (app style) |
| desc_marketplace | صِل إلى موردين لم تتعامل معهم بعد. المناقصات المجانية خاصة (بدعوة فقط)، والنشر في السوق ضمن باقة برو. | صل إلى موردين لم تتعامل معهم بعد. المناقصات المجانية خاصة (بدعوة فقط)، والنشر في السوق ضمن باقة برو. | no kasra |
| desc_aiBuilder | صِف ما تحتاجه ويكتب المنشئ الذكي المناقصة لك، مع تقدير للميزانية واقتراحات للوصف. ضمن باقة برو. | صف ما تحتاجه ويكتب المنشئ الذكي المناقصة لك، مع تقدير للميزانية واقتراحات للوصف. ضمن باقة برو. | no kasra |
| desc_ownTemplates | حوّل أفضل مناقصاتك إلى قوالب وأعد استخدامها بنقرة. ويمكنك دائماً البدء من قوالب Bid الجاهزة مجاناً. | حوّل أفضل مناقصاتك إلى قوالب وأعد استخدامها بنقرة. ويمكنك دائمًا البدء من قوالب Bid الجاهزة مجانًا. | tanween on alef (app style) |
| title_qa | أجرِ جولات الأسئلة والأجوبة داخل Bid | أجر جولات الأسئلة والأجوبة داخل Bid | no kasra |
| title_comparison | مقارنة العروض جنباً إلى جنب | مقارنة العروض جنبًا إلى جنب | tanween on alef (app style) |
| pageTitle | رقِّ باقتك | رقّ باقتك | no kasra |
| compareNote | الأسعار لا تشمل ضريبة القيمة المضافة ١٥٪. سعر واحد لكل مساحة عمل يشمل فريقك كله. يمكنك الإلغاء في أي وقت. | الأسعار لا تشمل ضريبة القيمة المضافة 15٪. سعر واحد لكل مساحة عمل يشمل فريقك كله. يمكنك الإلغاء في أي وقت. | Western digits |
| row_comparison | المقارنة جنباً إلى جنب | المقارنة جنبًا إلى جنب | tanween on alef (app style) |
| bannerOneLeftDesc | رقِّ إلى برو لمناقصات غير محدودة والنشر في السوق والمنشئ الذكي. | رقّ إلى برو لمناقصات غير محدودة والنشر في السوق والمنشئ الذكي. | no kasra |
| bannerLimitDesc | رقِّ إلى برو لتواصل إنشاء المناقصات. | رقّ إلى برو لتواصل إنشاء المناقصات. | no kasra |
| seatsNote | الباقة المجانية لشخص واحد. رقِّ باقتك لإضافة فريقك. | الباقة المجانية لشخص واحد. رقّ باقتك لإضافة فريقك. | no kasra |
| compareLocked | قارن {count} عروض جنباً إلى جنب. | قارن {count} عروض جنبًا إلى جنب. | tanween on alef (app style) |
| heroTitle1 | رقِّ باقتك | رقّ باقتك | no kasra |
| billedMonthly | تُحصّل شهرياً | تُحصّل شهريًا | tanween on alef (app style) |
| trustCancel | ألغِ في أي وقت | ألغ في أي وقت | no kasra |
| vatNote | الأسعار لا تشمل ضريبة القيمة المضافة ١٥٪. | الأسعار لا تشمل ضريبة القيمة المضافة 15٪. | Western digits |
| save20 | وفّر ٢٠٪ | وفّر 20٪ | Western digits |
| status_frozen | موقوفة مؤقتاً | موقوفة مؤقتًا | tanween on alef (app style) |
| freeDesc | أنت على الباقة المجانية. رقِّ باقتك للنشر في السوق والتحليل بالذكاء الاصطناعي والمزيد. | أنت على الباقة المجانية. رقّ باقتك للنشر في السوق والتحليل بالذكاء الاصطناعي والمزيد. | no kasra |
| perMonth | / شهرياً | / شهريًا | tanween on alef (app style) |
| billedYearly | تُدفع سنوياً | تُدفع سنويًا | tanween on alef (app style) |
| plusVat | + ضريبة القيمة المضافة ١٥٪ | + ضريبة القيمة المضافة 15٪ | Western digits |
| vat | ضريبة القيمة المضافة (١٥٪) | ضريبة القيمة المضافة (15٪) | Western digits |
| from_billing | محفوظة سابقاً | محفوظة سابقًا | tanween on alef (app style) |
| ph_crNumber | ١٠ أرقام | 10 أرقام | Western digits |
| err_invalidEmail | أدخل بريداً إلكترونياً صحيحاً | أدخل بريدًا إلكترونيًا صحيحًا | tanween on alef (app style) |
| err_invalidVat | الرقم الضريبي ١٥ رقماً يبدأ وينتهي بالرقم ٣ | الرقم الضريبي 15 رقمًا يبدأ وينتهي بالرقم 3 | tanween on alef (app style); Western digits |
| err_invalidCr | رقم السجل التجاري ١٠ أرقام | رقم السجل التجاري 10 أرقام | Western digits |
| returnSuccessDesc | شكراً لك! سيصلك الإيصال على بريدك الإلكتروني. | شكرًا لك! سيصلك الإيصال على بريدك الإلكتروني. | tanween on alef (app style) |
| notConfigured | الدفع غير متاح حالياً. حاول مرة أخرى بعد قليل. | الدفع غير متاح حاليًا. حاول مرة أخرى بعد قليل. | tanween on alef (app style) |
| detailsMissing | أكمل بيانات الفوترة المطلوبة أولاً. | أكمل بيانات الفوترة المطلوبة أولًا. | tanween on alef (app style) |
| detailsDesc | لإصدار فاتورتك. عبّأنا ما نعرفه مسبقاً، أضف الناقص فقط. | لإصدار فاتورتك. عبّأنا ما نعرفه مسبقًا، أضف الناقص فقط. | tanween on alef (app style) |

### Pricing page

| Key | Before | After | Why |
|---|---|---|---|
| perUserMo | شهرياً + الضريبة | شهريًا + الضريبة | tanween on alef (app style) |
| freeVenProposals | نحو 10 عروض شهرياً | نحو 10 عروض شهريًا | tanween on alef (app style) |
| a4 | لا. السعر لكل شركة وليس لكل شخص. فريقك كله يعمل في مساحة عمل واحدة. الباقة المجانية تشمل مقعداً واحداً، وباقتا برو وبزنس بلا حد للمقاعد. | لا. السعر لكل شركة وليس لكل شخص. فريقك كله يعمل في مساحة عمل واحدة. الباقة المجانية تشمل مقعدًا واحدًا، وباقتا برو وبزنس بلا حد للمقاعد. | tanween on alef (app style) |
| ctaSub | 3 مناقصات، بدون بطاقة. ارتقِ يوم تُغطّي Bid تكلفتها. | 3 مناقصات، بدون بطاقة. ارتق يوم تُغطّي Bid تكلفتها. | no kasra |

### Company profile errors

| Key | Before | After | Why |
|---|---|---|---|
| loadFailed | ما قدرنا نحمّل هذي الصفحة | تعذر تحميل هذه الصفحة | app uses "تعذر" |
