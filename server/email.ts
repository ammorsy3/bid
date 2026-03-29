const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const FROM_EMAIL = "info@bidapp.sa";
const MESSAGE_STREAM = "system";
const PRIVACY_POLICY_URL = "https://bidapp.sa/privacy";
const HELP_CENTER_URL = "https://bidapp.sa/help";
const COMPANY_LEGAL = "Bid International Ltd.";
const BRAND_COLOR = "#E25E45";

function getPostmarkToken(): string | null {
  return process.env.POSTMARK_API_TOKEN || null;
}

async function sendEmail(to: string | string[], subject: string, htmlBody: string): Promise<boolean> {
  const token = getPostmarkToken();
  if (!token) {
    console.warn("[Email] POSTMARK_API_TOKEN not set — skipping email send");
    return false;
  }

  const recipients = Array.isArray(to) ? to.join(", ") : to;

  try {
    const response = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        To: recipients,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: MESSAGE_STREAM,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Email] Postmark returned ${response.status}: ${errorBody}`);
      return false;
    }

    console.log(`[Email] Sent to ${recipients}: "${subject}"`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    return false;
  }
}

function getBaseUrl(appBaseUrl?: string): string {
  return appBaseUrl || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "bidapp.sa"}`;
}

// =============================================================================
// MASTER EMAIL TEMPLATE
// Every notification email is built from this single function.
// Branding, layout, typography, and spacing are defined here once.
// =============================================================================

interface DetailRow {
  iconEmoji: string;
  iconBg: string;
  label: string;
  value: string;
}

interface MessageBlock {
  label: string;
  text: string;
  borderColor: string;
}

type Lang = 'en' | 'ar';

interface EmailTemplateParams {
  // Header
  iconEmoji: string;
  iconBg: string;
  headline: string;
  subheadline: string;
  // Body
  recipientName?: string;
  bodyText?: string;
  details?: DetailRow[];
  messageBlock?: MessageBlock;
  // CTA
  ctaLabel: string;
  ctaUrl: string;
  ctaColor?: string;
  // Footer
  reasonText: string;
  // Language
  language?: Lang;
}

function buildEmailHtml(params: EmailTemplateParams): string {
  const {
    iconEmoji, iconBg, headline, subheadline,
    recipientName, bodyText, details, messageBlock,
    ctaLabel, ctaUrl, ctaColor = BRAND_COLOR,
    reasonText, language = 'en',
  } = params;

  const isRtl = language === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';
  const greeting = recipientName
    ? (isRtl ? `مرحباً ${recipientName}،` : `Hi ${recipientName},`)
    : (isRtl ? 'مرحباً،' : 'Hi,');
  const footerHelp    = isRtl ? 'مركز المساعدة'  : 'Help Center';
  const footerPrivacy = isRtl ? 'سياسة الخصوصية' : 'Privacy Policy';
  const footerContact = isRtl ? 'تواصل معنا'      : 'Contact Us';

  const logoBlock = `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
         <td style="background-color:${BRAND_COLOR};width:36px;height:36px;border-radius:10px;text-align:center;vertical-align:middle;">
           <span style="color:#ffffff;font-size:18px;font-weight:800;line-height:36px;">B</span>
         </td>
         <td style="padding-left:10px;">
           <span style="color:#18181b;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Bid</span>
         </td>
       </tr></table>`;

  const detailsBlock = details && details.length > 0 ? `
              <!-- Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:12px;margin-bottom:32px;">
                <tr><td style="padding:0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    ${details.map((row, i) => `
                    ${i > 0 ? '<tr><td colspan="2" style="padding:0 22px;"><div style="height:1px;background-color:#e4e4e7;"></div></td></tr>' : ''}
                    <tr>
                      <td style="padding:18px 22px;vertical-align:top;" width="56">
                        <div style="width:32px;height:32px;background-color:${row.iconBg};border-radius:8px;text-align:center;line-height:32px;">
                          <span style="font-size:15px;">${row.iconEmoji}</span>
                        </div>
                      </td>
                      <td style="padding:18px 22px 18px 0;">
                        <span style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">${row.label}</span>
                        <p style="margin:3px 0 0;color:#18181b;font-size:15px;font-weight:600;line-height:1.4;">${row.value}</p>
                      </td>
                    </tr>`).join('')}
                  </table>
                </td></tr>
              </table>` : '';

  const messageBlockHtml = messageBlock ? `
              <!-- Message Block -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8f8;border-left:4px solid ${messageBlock.borderColor};border-radius:0 8px 8px 0;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">${messageBlock.label}</span>
                    <p style="margin:6px 0 0;color:#374151;font-size:14px;line-height:1.7;">${messageBlock.text}</p>
                  </td>
                </tr>
              </table>` : '';

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f0f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f0f3;padding:48px 20px 32px;">
    <tr>
      <td align="center">

        <!-- Logo -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr><td align="center">${logoBlock}</td></tr>
        </table>

        <!-- Main Card -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06),0 0 1px rgba(0,0,0,0.1);">

          <!-- Icon + Headline -->
          <tr>
            <td style="padding:40px 44px 0;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:${iconBg};width:64px;height:64px;border-radius:50%;text-align:center;vertical-align:middle;">
                    <span style="font-size:28px;line-height:64px;">${iconEmoji}</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:20px 0 0;color:#18181b;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${headline}</h1>
              <p style="margin:8px 0 0;color:#71717a;font-size:14px;line-height:1.5;">${subheadline}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:24px 44px 0;">
              <div style="height:1px;background-color:#f0f0f0;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 44px 8px;">
              <p style="margin:0 0 ${bodyText ? '20px' : '28px'};color:#18181b;font-size:15px;line-height:1.6;">${greeting}</p>
              ${bodyText ? `<p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">${bodyText}</p>` : ''}
              ${detailsBlock}
              ${messageBlockHtml}
              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 8px;">
                    <a href="${ctaUrl}" style="display:inline-block;background-color:${ctaColor};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;box-shadow:0 1px 3px rgba(0,0,0,0.15);">${ctaLabel} &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reason Line -->
          <tr>
            <td style="padding:24px 44px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:8px;">
                <tr>
                  <td style="padding:14px 18px;" align="center">
                    <span style="color:#a1a1aa;font-size:12px;line-height:1.5;">${reasonText}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="margin-top:28px;">
          <tr>
            <td align="center" style="padding:0 0 12px;">
              <a href="${HELP_CENTER_URL}" style="color:#71717a;font-size:12px;text-decoration:none;font-weight:500;">${footerHelp}</a>
              <span style="color:#d4d4d8;margin:0 10px;">&#183;</span>
              <a href="${PRIVACY_POLICY_URL}" style="color:#71717a;font-size:12px;text-decoration:none;font-weight:500;">${footerPrivacy}</a>
              <span style="color:#d4d4d8;margin:0 10px;">&#183;</span>
              <a href="mailto:${FROM_EMAIL}" style="color:#71717a;font-size:12px;text-decoration:none;font-weight:500;">${footerContact}</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:4px 0 0;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.5;">&copy; 2025&#8211;2026 ${COMPANY_LEGAL} All rights reserved.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Shared reason text helpers — returns string in requested language
const REASON_VENDOR     = (lang: Lang) => lang === 'ar'
  ? "لقد تلقيت هذا البريد لأنك قدّمت عرضاً لهذه المناقصة على منصة بِد."
  : "You received this email because you submitted a proposal to this tender on Bid.";
const REASON_REQUESTER  = (lang: Lang) => lang === 'ar'
  ? "لقد تلقيت هذا البريد لأنك مالك أو مسؤول في الشركة التي نشرت هذه المناقصة على منصة بِد."
  : "You received this email because you are an owner or admin of the company that posted this tender on Bid.";
const REASON_COMPANY    = (name: string, lang: Lang) => lang === 'ar'
  ? `لقد تلقيت هذا البريد لأنك مالك أو مسؤول في ${name} على منصة بِد.`
  : `You received this email because you are an owner or admin of ${name} on Bid.`;
const REASON_JOIN_VENDOR    = (lang: Lang) => lang === 'ar'
  ? "لقد تلقيت هذا البريد لأنك قدّمت طلب انضمام إلى قاعدة موردين على منصة بِد."
  : "You received this email because you submitted a request to join a vendor base on Bid.";
const REASON_JOIN_REQUESTER = (lang: Lang) => lang === 'ar'
  ? "لقد تلقيت هذا البريد لأنك مالك أو مسؤول في شركة العميل على منصة بِد."
  : "You received this email because you are an owner or admin of the requester company on Bid.";

// =============================================================================
// NEW OFFER NOTIFICATION (existing trigger, kept for compatibility)
// =============================================================================

export async function sendNewOfferNotification(params: {
  tenderTitle: string;
  tenderId: string;
  vendorCompanyName: string;
  submittedAt: Date;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, vendorCompanyName, submittedAt, recipients, appBaseUrl } = params;

  if (recipients.length === 0) {
    console.log("[Email] No recipients for new offer notification — skipping");
    return;
  }

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const formattedDate = submittedAt.toLocaleDateString(isAr ? "ar-SA" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const subject = isAr
      ? `عرض جديد تم استلامه — ${tenderTitle}`
      : `New Proposal Received — ${tenderTitle}`;

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#128203;",
      iconBg: "#FFF1EE",
      headline:    isAr ? "تم استلام عرض جديد"                   : "New Proposal Received",
      subheadline: isAr ? "قدّم مورد عرضاً لمناقصتك."             : "A vendor has submitted a proposal to your tender.",
      recipientName: recipient.name,
      bodyText: isAr
        ? "خبر رائع — تم تقديم عرض جديد لإحدى مناقصاتك النشطة. راجع التفاصيل أدناه وانتقل إلى لوحة التحكم لتقييمه."
        : "Great news — a new proposal has been submitted to one of your active tenders. Review the details below and head to your dashboard to evaluate it.",
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة"        : "Tender",    value: tenderTitle },
        { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "المورد"          : "Vendor",    value: vendorCompanyName },
        { iconEmoji: "&#128337;", iconBg: "#F0FDF4", label: isAr ? "تاريخ التقديم"   : "Submitted", value: formattedDate },
      ],
      ctaLabel:   isAr ? "عرض المناقصة" : "View Tender",
      ctaUrl: tenderUrl,
      ctaColor: BRAND_COLOR,
      reasonText: REASON_REQUESTER(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// OFFER DECISION (accepted / rejected)
// =============================================================================

export async function sendOfferDecisionNotification(params: {
  outcome: 'accepted' | 'rejected';
  tenderTitle: string;
  tenderId: string;
  requesterCompanyName: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { outcome, tenderTitle, tenderId, requesterCompanyName, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;
  const isAccepted = outcome === 'accepted';

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAccepted
      ? (isAr ? `تهانينا — تم قبول عرضك: ${tenderTitle}` : `Congratulations — Your Proposal Was Accepted: ${tenderTitle}`)
      : (isAr ? `تحديث عرضك — ${tenderTitle}`             : `Proposal Update — ${tenderTitle}`);

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: isAccepted ? "&#10003;" : "&#10007;",
      iconBg:    isAccepted ? "#F0FDF4"  : "#FFF1EE",
      headline: isAccepted
        ? (isAr ? "تم قبول عرضك"      : "Your Proposal Has Been Accepted")
        : (isAr ? "لم يتم اختيار عرضك" : "Your Proposal Was Not Selected"),
      subheadline: isAccepted
        ? (isAr ? `تهانينا! قبلت ${requesterCompanyName} عرضك.`            : `Congratulations! ${requesterCompanyName} has accepted your proposal.`)
        : (isAr ? `شكراً لاهتمامك. راجعت ${requesterCompanyName} عرضك.`    : `Thank you for your interest. ${requesterCompanyName} has reviewed your proposal.`),
      recipientName: recipient.name,
      bodyText: isAccepted
        ? (isAr ? "خبر رائع! تم قبول عرضك. سجّل الدخول إلى لوحة التحكم لمراجعة التفاصيل والتنسيق مع المشتري."
                : "Great news! Your proposal has been accepted. Log in to your dashboard to view the details and coordinate next steps with the buyer.")
        : (isAr ? "نشكرك على الوقت الذي أمضيته في تقديم العرض. للأسف، قرر هذا المشتري عدم المضي قُدُماً بعرضك في الوقت الحالي."
                : "Thank you for taking the time to submit a proposal. Unfortunately, this buyer has decided not to proceed with your submission at this time."),
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة"      : "Tender",    value: tenderTitle },
        { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "منشور بواسطة"  : "Posted by", value: requesterCompanyName },
      ],
      ctaLabel:  isAr ? "عرض المناقصة" : "View Tender",
      ctaUrl: tenderUrl,
      ctaColor: isAccepted ? "#16a34a" : BRAND_COLOR,
      reasonText: REASON_VENDOR(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// AWARD (winning vendor)
// =============================================================================

export async function sendAwardNotification(params: {
  tenderTitle: string;
  tenderId: string;
  requesterCompanyName: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, requesterCompanyName, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAr
      ? `تهانينا — لقد فزت بالعقد: ${tenderTitle}`
      : `Congratulations — You've Been Awarded: ${tenderTitle}`;

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#127942;",
      iconBg: "#FFF7ED",
      headline:    isAr ? "لقد فزت بالعقد!"                           : "You've Been Awarded!",
      subheadline: isAr ? `اختارتك ${requesterCompanyName} لهذا العقد.` : `${requesterCompanyName} has selected you for this contract.`,
      recipientName: recipient.name,
      bodyText: isAr
        ? "تهانينا! تم اختيار عرضك وأُعلن فوزك رسمياً بهذا العقد. يرجى تسجيل الدخول لمراجعة التفاصيل والتنسيق مع المشتري."
        : "Congratulations! Your proposal has been selected and you have been officially awarded this contract. Please log in to your dashboard to review the details and coordinate next steps with the buyer.",
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة"      : "Tender",     value: tenderTitle },
        { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "ممنوح بواسطة"  : "Awarded by", value: requesterCompanyName },
      ],
      ctaLabel:  isAr ? "عرض تفاصيل الترسية" : "View Award Details",
      ctaUrl: tenderUrl,
      ctaColor: "#f59e0b",
      reasonText: REASON_VENDOR(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// NEGOTIATION ACTIONS (resubmission_request | discount_request | free_message | rejection)
// =============================================================================

export async function sendNegotiationActionNotification(params: {
  actionType: 'resubmission_request' | 'discount_request' | 'free_message' | 'rejection';
  tenderTitle: string;
  tenderId: string;
  requesterCompanyName: string;
  message: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { actionType, tenderTitle, tenderId, requesterCompanyName, message, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  type NegoCfg = { iconEmoji: string; iconBg: string; headline: string; subheadline: string; messageLabel: string; borderColor: string; subject: string };

  const configs = (lang: Lang): Record<string, NegoCfg> => {
    const isAr = lang === 'ar';
    return {
      resubmission_request: {
        iconEmoji: "&#128196;", iconBg: "#EFF6FF",
        headline:    isAr ? "طلب إعادة تقديم"                                              : "Resubmission Requested",
        subheadline: isAr ? `طلبت ${requesterCompanyName} منك مراجعة عرضك وإعادة تقديمه.` : `${requesterCompanyName} has asked you to revise and resubmit your proposal.`,
        messageLabel: isAr ? "رسالة من المشتري" : "Message from Buyer",
        borderColor: "#3b82f6",
        subject: isAr ? `طلب إعادة تقديم — ${tenderTitle}` : `Resubmission Requested — ${tenderTitle}`,
      },
      discount_request: {
        iconEmoji: "&#128178;", iconBg: "#FFF7ED",
        headline:    isAr ? "طلب مراجعة السعر"                                        : "Price Revision Requested",
        subheadline: isAr ? `طلبت ${requesterCompanyName} مراجعة سعر عرضك.`           : `${requesterCompanyName} has requested a revised price for your proposal.`,
        messageLabel: isAr ? "رسالة من المشتري" : "Message from Buyer",
        borderColor: BRAND_COLOR,
        subject: isAr ? `طلب مراجعة السعر — ${tenderTitle}` : `Price Revision Requested — ${tenderTitle}`,
      },
      free_message: {
        iconEmoji: "&#128172;", iconBg: "#F5F3FF",
        headline:    isAr ? "رسالة من المشتري"                                                    : "Message from Buyer",
        subheadline: isAr ? `لديك رسالة جديدة من ${requesterCompanyName} بشأن عرضك.`             : `You have a new message from ${requesterCompanyName} regarding your proposal.`,
        messageLabel: isAr ? "رسالة" : "Message",
        borderColor: "#6366f1",
        subject: isAr ? `رسالة جديدة بشأن — ${tenderTitle}` : `New Message Regarding — ${tenderTitle}`,
      },
      rejection: {
        iconEmoji: "&#10007;", iconBg: "#FFF1EE",
        headline:    isAr ? "لم يتم اختيار العرض"                                          : "Proposal Not Selected",
        subheadline: isAr ? `قررت ${requesterCompanyName} عدم المضي قُدُماً بعرضك.`        : `${requesterCompanyName} has decided not to proceed with your proposal.`,
        messageLabel: isAr ? "ملاحظة من المشتري" : "Note from Buyer",
        borderColor: BRAND_COLOR,
        subject: isAr ? `تحديث العرض — ${tenderTitle}` : `Proposal Update — ${tenderTitle}`,
      },
    };
  };

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';
    const cfg = configs(lang)[actionType];

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: cfg.iconEmoji,
      iconBg: cfg.iconBg,
      headline: cfg.headline,
      subheadline: cfg.subheadline,
      recipientName: recipient.name,
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة"     : "Tender",    value: tenderTitle },
        { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "منشور بواسطة" : "Posted by", value: requesterCompanyName },
      ],
      messageBlock: { label: cfg.messageLabel, text: message, borderColor: cfg.borderColor },
      ctaLabel:  isAr ? "عرض المناقصة" : "View Tender",
      ctaUrl: tenderUrl,
      ctaColor: BRAND_COLOR,
      reasonText: REASON_VENDOR(lang),
    });
    sendEmail(recipient.email, cfg.subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// AWARD BLOCKED (requester alert)
// =============================================================================

export async function sendAwardBlockedNotification(params: {
  tenderTitle: string;
  tenderId: string;
  vendorCompanyName: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, vendorCompanyName, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAr
      ? `إجراء مطلوب — الترسية معلقة للتحقق: ${tenderTitle}`
      : `Action Required — Award Pending Verification: ${tenderTitle}`;

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#9888;",
      iconBg: "#FFF7ED",
      headline:    isAr ? "الترسية معلقة للتحقق"                        : "Award Pending Verification",
      subheadline: isAr ? "يُرجى اتخاذ إجراء قبل إتمام الترسية."        : "Action required before the award can be finalised.",
      recipientName: recipient.name,
      bodyText: isAr
        ? `حاولت ترسية العقد على <strong>${vendorCompanyName}</strong>، لكن ملف هذا المورد لم يتم التحقق منه بعد على منصة بِد. الترسية معلقة وستُفعَّل بعد اكتمال التحقق.`
        : `You attempted to award the contract to <strong>${vendorCompanyName}</strong>, but this vendor's company profile has not yet been verified on Bid. The award is on hold and will be released once verification is complete.`,
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة"       : "Tender",          value: tenderTitle },
        { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "المورد المختار"  : "Selected Vendor", value: vendorCompanyName },
      ],
      ctaLabel:  isAr ? "عرض المناقصة" : "View Tender",
      ctaUrl: tenderUrl,
      ctaColor: "#f59e0b",
      reasonText: REASON_REQUESTER(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// TENDER STATUS — internal requester team (published | closed | cancelled)
// =============================================================================

export async function sendTenderStatusNotification(params: {
  newStatus: 'published' | 'closed' | 'cancelled';
  tenderTitle: string;
  tenderId: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { newStatus, tenderTitle, tenderId, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  type StatusCfg = { iconEmoji: string; iconBg: string; headline: string; subheadline: string; bodyText: string; subject: string };

  const configs = (lang: Lang): Record<string, StatusCfg> => {
    const isAr = lang === 'ar';
    return {
      published: {
        iconEmoji: "&#128640;", iconBg: "#F0FDF4",
        headline:    isAr ? "تم نشر المناقصة"                                          : "Tender Published",
        subheadline: isAr ? "مناقصتك الآن متاحة وتقبل العروض من الموردين."             : "Your tender is now live and accepting proposals from vendors.",
        bodyText:    isAr ? "تم نشر مناقصتك وأصبحت مرئية للموردين على منصة بِد. ستبدأ العروض بالوصول إليك — وستتلقى إشعاراً في كل مرة يتم فيها تقديم عرض."
                          : "Your tender has been published and is now visible to vendors on Bid. Proposals will start coming in — you'll receive a notification each time one is submitted.",
        subject: isAr ? `تم نشر المناقصة — ${tenderTitle}` : `Tender Published — ${tenderTitle}`,
      },
      closed: {
        iconEmoji: "&#128274;", iconBg: "#FFF1EE",
        headline:    isAr ? "أُغلقت المناقصة"                                          : "Tender Closed",
        subheadline: isAr ? "لم تعد مناقصتك تقبل تقديم عروض جديدة."                   : "Your tender has been closed to new proposal submissions.",
        bodyText:    isAr ? "لم تعد المناقصة تقبل عروضاً جديدة. انتقل إلى لوحة التحكم لمراجعة جميع العروض المقدمة وبدء عملية التقييم."
                          : "Your tender is no longer accepting new proposals. Head to your dashboard to review all submitted proposals and begin the evaluation process.",
        subject: isAr ? `أُغلقت المناقصة — ${tenderTitle}` : `Tender Closed — ${tenderTitle}`,
      },
      cancelled: {
        iconEmoji: "&#10060;", iconBg: "#FFF7ED",
        headline:    isAr ? "تم إلغاء المناقصة"   : "Tender Cancelled",
        subheadline: isAr ? "تم إلغاء مناقصتك."  : "Your tender has been cancelled.",
        bodyText:    isAr ? "تم إلغاء هذه المناقصة ولم تعد مرئية للموردين. إذا كان ذلك خطأً أو أردت إعادة فتحها، يرجى التواصل مع الدعم أو إنشاء مناقصة جديدة."
                          : "This tender has been cancelled and is no longer visible to vendors. If this was a mistake or you'd like to reopen it, please contact support or create a new tender.",
        subject: isAr ? `تم إلغاء المناقصة — ${tenderTitle}` : `Tender Cancelled — ${tenderTitle}`,
      },
    };
  };

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';
    const cfg = configs(lang)[newStatus];

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: cfg.iconEmoji,
      iconBg: cfg.iconBg,
      headline: cfg.headline,
      subheadline: cfg.subheadline,
      recipientName: recipient.name,
      bodyText: cfg.bodyText,
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة" : "Tender", value: tenderTitle },
      ],
      ctaLabel:  isAr ? "عرض المناقصة" : "View Tender",
      ctaUrl: tenderUrl,
      ctaColor: BRAND_COLOR,
      reasonText: REASON_REQUESTER(lang),
    });
    sendEmail(recipient.email, cfg.subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// TENDER CREATED — notify entire requester team (including creator)
// =============================================================================

export async function sendTenderCreatedNotification(params: {
  tenderTitle: string;
  tenderId: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAr
      ? `تم نشر مناقصة جديدة — ${tenderTitle}`
      : `New Tender Published — ${tenderTitle}`;

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#128640;",
      iconBg: "#F0FDF4",
      headline:    isAr ? "تم نشر مناقصة جديدة"                       : "New Tender Published",
      subheadline: isAr ? "المناقصة الآن متاحة وتقبل العروض من الموردين." : "The tender is now live and accepting proposals from vendors.",
      recipientName: recipient.name,
      bodyText: isAr
        ? "تم نشر مناقصة جديدة على منصة بِد وأصبحت مرئية للموردين. انتقل إلى لوحة التحكم لمراجعتها."
        : "A new tender has been published on Bid and is now visible to vendors. Head to your dashboard to review it.",
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة" : "Tender", value: tenderTitle },
      ],
      ctaLabel:  isAr ? "عرض المناقصة" : "View Tender",
      ctaUrl: tenderUrl,
      ctaColor: BRAND_COLOR,
      reasonText: REASON_REQUESTER(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// TENDER CLOSED → VENDORS (evaluation phase)
// =============================================================================

export async function sendTenderClosedToVendorsNotification(params: {
  tenderTitle: string;
  tenderId: string;
  requesterCompanyName: string;
  vendorRecipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, requesterCompanyName, vendorRecipients, appBaseUrl } = params;
  if (vendorRecipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  for (const recipient of vendorRecipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAr
      ? `أُغلقت المناقصة — عرضك قيد المراجعة: ${tenderTitle}`
      : `Tender Closed — Your Proposal Is Under Review: ${tenderTitle}`;

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#128269;",
      iconBg: "#EFF6FF",
      headline:    isAr ? "عرضك قيد المراجعة"                                                          : "Your Proposal Is Under Review",
      subheadline: isAr ? `أُغلقت المناقصة. ${requesterCompanyName} يقيّم الآن جميع العروض المقدمة.`  : `The tender has closed. ${requesterCompanyName} is now evaluating all submissions.`,
      recipientName: recipient.name,
      bodyText: isAr
        ? "لم تعد المناقصة أدناه تقبل تقديمات جديدة. عرضك حالياً قيد التقييم. قد يتواصل معك المشتري إذا كان لديه أسئلة أو يرغب في التفاوض."
        : "The tender below has been closed to new submissions. Your proposal is currently under evaluation. You may be contacted by the buyer if they have questions or wish to negotiate.",
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة"     : "Tender",    value: tenderTitle },
        { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "منشور بواسطة" : "Posted by", value: requesterCompanyName },
      ],
      ctaLabel:  isAr ? "عرض المناقصة" : "View Tender",
      ctaUrl: tenderUrl,
      ctaColor: BRAND_COLOR,
      reasonText: REASON_VENDOR(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// TENDER Q&A — new question (requester) + answer published (vendors)
// =============================================================================

export async function sendTenderQuestionNotification(params: {
  tenderTitle: string;
  tenderId: string;
  questionText: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, questionText, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAr
      ? `سؤال جديد على مناقصتك — ${tenderTitle}`
      : `New Question on Your Tender — ${tenderTitle}`;

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#10067;",
      iconBg: "#F0F9FF",
      headline:    isAr ? "سؤال جديد على مناقصتك"                              : "New Question on Your Tender",
      subheadline: isAr ? "قدّم مورد سؤالاً. سجّل الدخول لنشر إجابتك."         : "A vendor has submitted a question. Log in to post your answer.",
      recipientName: recipient.name,
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة" : "Tender", value: tenderTitle },
      ],
      messageBlock: { label: isAr ? "سؤال" : "Question", text: questionText, borderColor: "#6366f1" },
      ctaLabel:  isAr ? "الإجابة على السؤال" : "Answer Question",
      ctaUrl: tenderUrl,
      ctaColor: BRAND_COLOR,
      reasonText: REASON_REQUESTER(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

export async function sendTenderAnswerNotification(params: {
  tenderTitle: string;
  tenderId: string;
  questionText: string;
  answerText: string;
  vendorRecipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, questionText, answerText, vendorRecipients, appBaseUrl } = params;
  if (vendorRecipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  for (const recipient of vendorRecipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAr
      ? `تحديث المناقصة: تمت الإجابة على سؤال — ${tenderTitle}`
      : `Tender Update: A Question Has Been Answered — ${tenderTitle}`;

    const qLabel = isAr ? 'س' : 'Q';
    const aLabel = isAr ? 'ج' : 'A';

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#10003;",
      iconBg: "#F0FDF4",
      headline:    isAr ? "تم تحديث أسئلة وأجوبة المناقصة"          : "Tender Q&amp;A Updated",
      subheadline: isAr ? "أجاب المشتري على سؤال في هذه المناقصة."   : "The buyer has answered a question on this tender.",
      recipientName: recipient.name,
      details: [
        { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة" : "Tender", value: tenderTitle },
      ],
      messageBlock: {
        label: isAr ? "سؤال وجواب" : "Question & Answer",
        text: `<strong>${qLabel}:</strong> ${questionText}<br><br><strong>${aLabel}:</strong> ${answerText}`,
        borderColor: "#16a34a",
      },
      ctaLabel:  isAr ? "عرض المناقصة" : "View Tender",
      ctaUrl: tenderUrl,
      ctaColor: BRAND_COLOR,
      reasonText: REASON_VENDOR(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// COMPANY VERIFICATION (verified / rejected)
// =============================================================================

export async function sendCompanyVerificationNotification(params: {
  outcome: 'verified' | 'rejected';
  companyName: string;
  rejectionReason?: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { outcome, companyName, rejectionReason, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const dashboardUrl = `${baseUrl}/dashboard`;
  const isVerified = outcome === 'verified';

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isVerified
      ? (isAr ? `تم التحقق من شركتك — ${companyName}` : `Your Company Has Been Verified — ${companyName}`)
      : (isAr ? `تحديث التحقق — ${companyName}`        : `Verification Update — ${companyName}`);

    const details: DetailRow[] = [
      { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "الشركة" : "Company", value: companyName },
    ];
    if (rejectionReason) {
      details.push({ iconEmoji: "&#10007;", iconBg: "#FFF1EE", label: isAr ? "السبب" : "Reason", value: rejectionReason });
    }

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: isVerified ? "&#10003;" : "&#10007;",
      iconBg:    isVerified ? "#F0FDF4"  : "#FFF1EE",
      headline: isVerified
        ? (isAr ? "تم التحقق من شركتك" : "Your Company Has Been Verified")
        : (isAr ? "تحديث التحقق"        : "Verification Update"),
      subheadline: isVerified
        ? (isAr ? "تمت مراجعة ملف شركتك والموافقة عليه."                  : "Your company profile has been reviewed and approved.")
        : (isAr ? "لم نتمكن من التحقق من ملف شركتك في الوقت الحالي."      : "We were unable to verify your company profile at this time."),
      recipientName: recipient.name,
      bodyText: isVerified
        ? (isAr ? `خبر رائع! تم التحقق من <strong>${companyName}</strong> على منصة بِد. يمكنك الآن المشاركة في المناقصات وتقديم العروض والوصول إلى جميع مميزات المنصة.`
                : `Great news! <strong>${companyName}</strong> has been verified on Bid. You can now participate in tenders, submit proposals, and access all platform features.`)
        : (isAr ? `راجعنا ملف <strong>${companyName}</strong> ولم نتمكن من إتمام التحقق. يُرجى مراجعة السبب أدناه وتحديث معلومات شركتك.`
                : `We reviewed <strong>${companyName}</strong>'s profile and were unable to complete verification. Please review the reason below and update your company information.`),
      details,
      ctaLabel: isVerified
        ? (isAr ? "الذهاب إلى لوحة التحكم" : "Go to Dashboard")
        : (isAr ? "تحديث ملف الشركة"        : "Update Company Profile"),
      ctaUrl: dashboardUrl,
      ctaColor: isVerified ? "#16a34a" : BRAND_COLOR,
      reasonText: REASON_COMPANY(companyName, lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

// =============================================================================
// JOIN REQUESTS
// =============================================================================

export async function sendJoinRequestNotification(params: {
  vendorCompanyName: string;
  requesterCompanyName: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { vendorCompanyName, requesterCompanyName, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const dashboardUrl = `${baseUrl}/vendors`;

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAr
      ? `طلب انضمام مورد جديد — ${vendorCompanyName}`
      : `New Vendor Request — ${vendorCompanyName}`;

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#128203;",
      iconBg: "#EFF6FF",
      headline:    isAr ? "طلب انضمام مورد جديد"                                    : "New Vendor Join Request",
      subheadline: isAr ? `${vendorCompanyName} يريد الانضمام إلى قاعدة موردينك.`   : `${vendorCompanyName} wants to join your vendor base.`,
      recipientName: recipient.name,
      bodyText: isAr
        ? `قدّمت <strong>${vendorCompanyName}</strong> طلب انضمام إلى قاعدة موردينك. راجع ملفهم وقرر قبول الطلب أو رفضه.`
        : `<strong>${vendorCompanyName}</strong> has submitted a request to join your vendor base. Review their profile and decide whether to approve or reject the request.`,
      details: [
        { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "المورد"   : "Vendor",       value: vendorCompanyName },
        { iconEmoji: "&#128203;", iconBg: "#FFF1EE", label: isAr ? "شركتك"   : "Your Company", value: requesterCompanyName },
      ],
      ctaLabel:  isAr ? "مراجعة الطلب" : "Review Request",
      ctaUrl: dashboardUrl,
      ctaColor: BRAND_COLOR,
      reasonText: REASON_JOIN_REQUESTER(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

export async function sendJoinRequestDecisionNotification(params: {
  decision: 'approved' | 'rejected';
  vendorCompanyName: string;
  requesterCompanyName: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { decision, vendorCompanyName, requesterCompanyName, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const dashboardUrl = `${baseUrl}/dashboard`;
  const isApproved = decision === 'approved';

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isApproved
      ? (isAr ? `تمت إضافتك إلى قاعدة موردي ${requesterCompanyName}` : `You've Been Added to ${requesterCompanyName}'s Vendor Base`)
      : (isAr ? `تحديث طلب قاعدة الموردين — ${requesterCompanyName}` : `Vendor Base Request Update — ${requesterCompanyName}`);

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: isApproved ? "&#10003;" : "&#10007;",
      iconBg:    isApproved ? "#F0FDF4"  : "#FFF1EE",
      headline: isApproved
        ? (isAr ? "تمت الموافقة على طلب الانضمام"      : "Join Request Approved")
        : (isAr ? "لم تتم الموافقة على طلب الانضمام"   : "Join Request Not Approved"),
      subheadline: isApproved
        ? (isAr ? `أنت الآن جزء من قاعدة موردي ${requesterCompanyName}.`                      : `You are now part of ${requesterCompanyName}'s vendor base.`)
        : (isAr ? `لم تتم الموافقة على طلبك للانضمام إلى قاعدة موردي ${requesterCompanyName}.` : `Your request to join ${requesterCompanyName}'s vendor base was not approved.`),
      recipientName: recipient.name,
      bodyText: isApproved
        ? (isAr ? `بشرى سارة! تمت الموافقة على طلبك للانضمام إلى قاعدة موردي <strong>${requesterCompanyName}</strong>. أنت الآن مدرج في كتالوج الموردين لديهم وقد تتلقى دعوات مناقصات منهم.`
                : `Good news! Your request to join <strong>${requesterCompanyName}</strong>'s vendor base has been approved. You are now listed in their vendor catalog and may receive tender invitations from them.`)
        : (isAr ? `لم تتم الموافقة على طلبك للانضمام إلى قاعدة موردي <strong>${requesterCompanyName}</strong> في الوقت الحالي. يمكنك التواصل مع الشركة مباشرة أو إعادة المحاولة لاحقاً.`
                : `Your request to join <strong>${requesterCompanyName}</strong>'s vendor base was not approved at this time. You may reach out to the company directly or try again later.`),
      details: [
        { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "المورد"  : "Vendor",  value: vendorCompanyName },
        { iconEmoji: "&#127970;", iconBg: "#FFF1EE", label: isAr ? "الشركة"  : "Company", value: requesterCompanyName },
      ],
      ctaLabel:  isAr ? "عرض لوحة التحكم" : "View Dashboard",
      ctaUrl: dashboardUrl,
      ctaColor: isApproved ? "#16a34a" : BRAND_COLOR,
      reasonText: REASON_JOIN_VENDOR(lang),
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}
