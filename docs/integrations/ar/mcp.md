# تكامل MCP

نتيح مساعد Bid بوصفه خادم **Model Context Protocol** ليتمكن Claude Desktop وCursor وأي عميل LLM آخر يدعم MCP من استخدامه كأداة — لصياغة طلب عروض عبر المحادثة ثم نشره.

## نقطة النهاية

- الرابط: `https://<your-host>/mcp`
- النقل: **HTTP JSON-RPC 2.0** (بدون SSE). كل طلب POST واحد = استدعاء RPC واحد.
- المصادقة: ترويسة `X-Api-Key` أو `Authorization: ApiKey` في كل طلب.

## الأدوات المتاحة

| الأداة                     | الغرض                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| `copilot_create_session`   | بدء محادثة جديدة. تعيد `sessionId`.                               |
| `copilot_send_message`     | إرسال رسالة المستخدم والحصول على رد الوكيل والمسودة الحالية.       |
| `copilot_launch_tender`    | نشر طلب العروض من المسودة الحالية للجلسة.                         |
| `copilot_get_session`      | جلب سجل الرسائل الكامل وحالة المسودة (لأغراض تصحيح الأخطاء).       |

> تستخدم أسماء الأدوات الشرطة السفلية (وليس النقاط) كي تجتاز التعبير النمطي الذي تفرضه OpenAI على أسماء الدوال في function-calling.
> إذا غلّفت خادم MCP داخل إطار عمل للوكلاء (مثل AI Agent في n8n أو LangChain) يمرر الأدوات إلى OpenAI،
> فأنت بحاجة إلى هذه الصيغة.

## Claude Desktop

يتعامل Claude Desktop مع MCP عبر stdio فقط، لذا استخدم الوسيط `mcp-remote` للربط بين الطرفين.

أضف ما يلي إلى `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bid-copilot": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://<your-host>/mcp",
        "--header",
        "X-Api-Key:bidc_live_<your-key>"
      ]
    }
  }
}
```

أعد تشغيل Claude Desktop. ستجد `bid-copilot` في قائمة الأدوات.

## Cursor

يدعم Cursor خوادم MCP البعيدة مباشرة. أضف ما يلي إلى `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bid-copilot": {
      "url": "https://<your-host>/mcp",
      "headers": {
        "X-Api-Key": "bidc_live_<your-key>"
      }
    }
  }
}
```

## مثال على تسلسل استدعاء الأدوات

1. `copilot_create_session({ name: "ACME RFP" })` → `{ sessionId }`
2. `copilot_send_message({ sessionId, message: "We need a 3-month IT migration" })` → `{ reply, tenderDraft, readyToLaunch, ... }`
3. واصل إرسال الرسائل حتى تصبح `readyToLaunch === true`.
4. `copilot_launch_tender({ sessionId })` → `{ tenderId, tenderUrl }`

## الاستخدام مع وكيل ذكاء اصطناعي (n8n أو LangChain أو وكيل مخصص)

عندما تغلّف خادم MCP داخل وكيل ذكاء اصطناعي (مثل عقدة AI Agent في n8n، أو الدالة `create_openai_tools_agent` في LangChain، أو حلقة ReAct مخصصة، وغيرها)، فيجب أن يبقى الوكيل **ناقلًا بسيطًا** — لا تدعه يعيد صياغة مدخلات المستخدم أو يلخّص مخرجات المساعد. المساعد لدينا هو صاحب المعرفة بالمجال، أما الوكيل فيكتفي بنقل الرسائل.

ضع النص التالي في موجّه النظام الخاص بالوكيل:

```text
You are a bridge between a human user and Bid's procurement Copilot. The Copilot is an expert RFP consultant — it produces the actual tender draft. Your job is to transport messages between the two without interpretation.

ON THE FIRST USER MESSAGE in a conversation:
1. Call copilot_create_session (pass a short descriptive name).
2. Remember the returned sessionId for the whole conversation.
3. Call copilot_send_message with that sessionId and the user's message VERBATIM.

ON EVERY SUBSEQUENT USER MESSAGE:
- Call copilot_send_message with the same sessionId and the user's verbatim message.

WHEN THE COPILOT REPLY INCLUDES readyToLaunch: true:
- Call copilot_launch_tender with the sessionId.
- Show the returned tenderUrl to the user.

HOW TO RESPOND TO THE USER:
- Return the Copilot's `reply` field verbatim. Do not paraphrase, shorten, or translate.
- If `suggestions` is non-empty, surface those as quick-reply options under the reply.
- If the Copilot asks a clarifying question, pass it straight through.

NEVER:
- Call copilot_send_message without a sessionId.
- Rewrite the user's message before sending.
- Fabricate tender content the Copilot didn't produce.
- Launch a tender while readyToLaunch is false.
```

## الأخطاء

تعيد استدعاءات الأدوات أخطاء JSON-RPC برموز قياسية:

- `-32602` — معاملات غير صالحة (صلاحية غير ممنوحة، أو جلسة غير موجودة، أو مسودة غير جاهزة، وغيرها)
- `-32603` — خطأ داخلي
- `-32601` — أداة غير معروفة
- رمز HTTP `429` — تجاوز حد المعدل (تتوفر ترويسة `Retry-After`)

## الحدود

هي نفسها حدود Webhook: 30 طلبًا في الدقيقة لكل مفتاح، وحد أقصى 8 KB لحجم جسم الرسالة.
