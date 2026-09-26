# تكامل Webhook

نقطة نهاية HTTP واحدة تستطيع n8n وMake.com وروبوتات المحادثة المخصصة — وأي أداة تستطيع إرسال JSON عبر POST — استخدامها لإدارة محادثة كاملة مع مساعد Bid وصولًا إلى طلب عروض حقيقي.

## نقاط النهاية

| الطريقة | نقطة النهاية | الوصف |
| --- | --- | --- |
| POST | `/integrations/webhook/{id}` | إرسال رسالة والحصول على رد من المساعد |
| POST | `/integrations/webhook/{id}/launch` | إطلاق طلب العروض لمحادثة معيّنة بشكل صريح |

## نقطة النهاية

`POST https://<your-host>/integrations/webhook/<integrationId>`

تجد `integrationId` في **الإعدادات ← التكاملات** بعد إنشاء تكامل من نوع `webhook`.

## الترويسات

- `Content-Type: application/json`
- `X-Api-Key: bidc_live_<your-key>`

## جسم الطلب

```json
{
  "conversationId": "slack-thread-1732-user-U0123",
  "message": "We need a new HR consulting firm.",
  "idempotencyKey": "optional-retry-token"
}
```

- `conversationId` — أي نص ثابت تختاره لكل مستخدم نهائي أو محادثة. نعتمد عليه لتذكّر المحادثة عبر الاستدعاءات. المعرّف نفسه = استمرار المحادثة نفسها.
- `message` — رسالة المستخدم، بحد أقصى 8 KB.
- `idempotencyKey` — اختياري. إذا كانت أداتك تعيد المحاولة عند انتهاء المهلة، فأرسل المفتاح نفسه وسنعيد الاستجابة المخزّنة مؤقتًا بدل إعادة المعالجة.

## الاستجابة

```json
{
  "reply": "Got it — what budget range are you working with in SAR?",
  "suggestions": ["Around 100–200k SAR", "Up to 500k", "Not sure yet"],
  "ready": false,
  "tenderUrl": null,
  "validationErrors": null
}
```

عندما يقرر الوكيل أن المسودة مكتملة:

- عند تفعيل **إطلاق تلقائي** في التكامل: تكون `ready: true` **ويكون** `tenderUrl` رابطًا حقيقيًا.
- عند تعطيل **إطلاق تلقائي**: تكون `ready: true` و`tenderUrl: null`. استدعِ نقطة نهاية الإطلاق أدناه للنشر.

## نقطة نهاية الإطلاق (عند تعطيل الإطلاق التلقائي)

`POST https://<your-host>/integrations/webhook/<integrationId>/launch`

```json
{
  "conversationId": "slack-thread-1732-user-U0123",
  "idempotencyKey": "optional-retry-token"
}
```

تعيد `{ tenderId, tenderUrl, invitationToken }` أو خطأ في التحقق من صحة البيانات إذا لم تكن المسودة جاهزة.

## الربط مع n8n

1. عقدة **HTTP Request**
   - الطريقة: `POST`
   - الرابط: `https://<your-host>/integrations/webhook/<integrationId>`
   - المصادقة: **Header Auth** باسم `X-Api-Key` وبقيمة `bidc_live_…`
   - الجسم: JSON يحتوي على `conversationId` و`message`.
2. في الخطوات اللاحقة: استخدم `{{$json.reply}}` لإرسال رد الوكيل إلى القناة التي يستخدمها المستخدم (Slack أو البريد الإلكتروني أو SMS).
3. عندما تكون `{{$json.ready}} === true`: أرسل `tenderUrl` إلى المستخدم أو شغّل الإطلاق.

## الربط مع Make.com

1. وحدة **HTTP** (POST)
   - الرابط: نفس الرابط أعلاه
   - الترويسات: `X-Api-Key: bidc_live_…` و`Content-Type: application/json`
   - نوع الجسم: Raw JSON
2. **Router** على `ready`: فرع لقيمة `true` (إرسال رابط طلب العروض)، وفرع لقيمة `false` (متابعة الحلقة مع الرد).

## التوقيع (اختياري)

إذا كان متغير البيئة `WEBHOOK_HMAC_SECRET_<companyId>` مضبوطًا على خادمنا، تتضمن كل استجابة ترويسة `X-Bid-Signature: sha256=<hex>` محسوبة على جسم الاستجابة الخام. استخدمها للتحقق من أن الاستجابة صادرة عنا (مفيد إذا كان مستقبلك متاحًا للوصول من الإنترنت المفتوح).

## رموز الأخطاء

| الحالة | المعنى                                                     |
| ------ | ---------------------------------------------------------- |
| `400`  | حقل مفقود أو بصيغة غير صحيحة                                |
| `401`  | مفتاح API مفقود أو ملغى أو خاطئ                             |
| `403`  | التكامل معطّل، أو الشركة غير موثقة                          |
| `404`  | `integrationId` غير معروف، أو المحادثة غير موجودة           |
| `409`  | المسودة غير جاهزة للإطلاق                                   |
| `413`  | جسم الرسالة كبير جدًا (أكثر من 8 KB)                        |
| `429`  | تجاوز حد المعدل — راجع ترويسة `Retry-After`                 |
