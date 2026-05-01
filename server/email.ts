const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const FROM_EMAIL = "info@bidapp.sa";
const MESSAGE_STREAM = "outbound";
const PRIVACY_POLICY_URL = "https://bidapp.sa/privacy";
const HELP_CENTER_URL = "https://bidapp.sa/help";
const COMPANY_LEGAL = "Bid International Ltd.";
const BRAND_COLOR = "#E25E45";

function getPostmarkToken(): string | null {
  return process.env.POSTMARK_API_TOKEN || null;
}

function getPostmarkAuthToken(): string | null {
  return process.env.POSTMARK_AUTH_TOKEN || process.env.POSTMARK_API_TOKEN || null;
}

async function sendAuthEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
  const token = getPostmarkAuthToken();
  if (!token) {
    console.error("[Email] No Postmark token set — skipping auth email send. POSTMARK_AUTH_TOKEN:", !!process.env.POSTMARK_AUTH_TOKEN, "POSTMARK_API_TOKEN:", !!process.env.POSTMARK_API_TOKEN);
    return false;
  }

  const payload = {
    From: FROM_EMAIL,
    To: to,
    Subject: subject,
    HtmlBody: htmlBody,
    MessageStream: "auth",
  };

  try {
    console.log(`[Email] Sending auth email to ${to}, subject: "${subject}", token: ${token.slice(0, 8)}...`);
    const response = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Email] Postmark auth returned ${response.status}: ${errorBody}`);
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.ErrorCode === 406) {
          throw new Error("This email address has been marked as inactive by our email provider. Please use a different email or contact support.");
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("inactive")) throw e;
      }
      return false;
    }

    const result = await response.json();
    console.log(`[Email] Auth email sent to ${to}: "${subject}" — MessageID: ${result.MessageID}`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send auth email:", err);
    return false;
  }
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
  if (appBaseUrl) return appBaseUrl;
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const primary = domains.split(",")[0];
    if (primary) return `https://${primary}`;
  }
  return "https://bidapp.sa";
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
  proposalCount: number;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, vendorCompanyName, submittedAt, proposalCount, recipients, appBaseUrl } = params;

  if (recipients.length === 0) {
    console.log("[Email] No recipients for new offer notification — skipping");
    return;
  }

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;
  const isMilestone = proposalCount > 1;

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const formattedDate = submittedAt.toLocaleDateString(isAr ? "ar-SA" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const subject = isMilestone
      ? (isAr
          ? `لديك ${proposalCount} عروض على مناقصتك — ${tenderTitle}`
          : `You've received ${proposalCount} proposals — ${tenderTitle}`)
      : (isAr
          ? `عرض جديد تم استلامه — ${tenderTitle}`
          : `New Proposal Received — ${tenderTitle}`);

    const headline = isMilestone
      ? (isAr ? `وصلت إلى ${proposalCount} عروض` : `${proposalCount} Proposals Received`)
      : (isAr ? "تم استلام عرض جديد" : "New Proposal Received");

    const subheadline = isMilestone
      ? (isAr ? `مناقصتك تستقطب الاهتمام.` : `Your tender is gaining traction.`)
      : (isAr ? "قدّم مورد عرضاً لمناقصتك." : "A vendor has submitted a proposal to your tender.");

    const bodyText = isMilestone
      ? (isAr
          ? `مناقصتك تسير بشكل رائع — لقد وصلت إلى ${proposalCount} عروض مقدمة. توجه إلى لوحة التحكم لمراجعتها وتقييمها.`
          : `Your tender is doing great — you've now reached ${proposalCount} submitted proposals. Head to your dashboard to review and evaluate them.`)
      : (isAr
          ? "خبر رائع — تم تقديم عرض جديد لإحدى مناقصاتك النشطة. راجع التفاصيل أدناه وانتقل إلى لوحة التحكم لتقييمه."
          : "Great news — a new proposal has been submitted to one of your active tenders. Review the details below and head to your dashboard to evaluate it.");

    const details = isMilestone
      ? [
          { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة"          : "Tender",            value: tenderTitle },
          { iconEmoji: "&#128202;", iconBg: "#EFF6FF", label: isAr ? "إجمالي العروض"     : "Total Proposals",   value: String(proposalCount) },
          { iconEmoji: "&#127970;", iconBg: "#F0FDF4", label: isAr ? "آخر عرض من"        : "Latest Proposal By", value: vendorCompanyName },
          { iconEmoji: "&#128337;", iconBg: "#F5F3FF", label: isAr ? "تاريخ التقديم"     : "Submitted",         value: formattedDate },
        ]
      : [
          { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة"        : "Tender",    value: tenderTitle },
          { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "المورد"          : "Vendor",    value: vendorCompanyName },
          { iconEmoji: "&#128337;", iconBg: "#F0FDF4", label: isAr ? "تاريخ التقديم"   : "Submitted", value: formattedDate },
        ];

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#128203;",
      iconBg: "#FFF1EE",
      headline,
      subheadline,
      recipientName: recipient.name,
      bodyText,
      details,
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
  message?: string;
  recipients: { email: string; name?: string; language?: Lang }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, requesterCompanyName, message, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;

  for (const recipient of recipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAr
      ? `تهانينا — لقد فزت بالعقد: ${tenderTitle}`
      : `Congratulations — You've Been Awarded: ${tenderTitle}`;

    const details: { iconEmoji: string; iconBg: string; label: string; value: string }[] = [
      { iconEmoji: "&#128196;", iconBg: "#FFF1EE", label: isAr ? "المناقصة"      : "Tender",     value: tenderTitle },
      { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "ممنوح بواسطة"  : "Awarded by", value: requesterCompanyName },
    ];

    if (message) {
      details.push({ iconEmoji: "&#128172;", iconBg: "#F0FDF4", label: isAr ? "رسالة من المشتري" : "Message from Buyer", value: message });
    }

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
      details,
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
// ADMIN NOTIFICATIONS
// =============================================================================

export async function sendNewVerificationSubmissionNotification(params: {
  companyName: string;
  companyCity?: string | null;
  crNumber: string;
  recipients: { email: string; name?: string }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { companyName, companyCity, crNumber, recipients, appBaseUrl } = params;
  if (recipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const adminUrl = `${baseUrl}/admin/vendors`;

  const subject = `New Verification Submission — ${companyName}`;

  const details: DetailRow[] = [
    { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: "Company", value: companyName },
    { iconEmoji: "&#128196;", iconBg: "#F0FDF4", label: "CR Number", value: crNumber },
  ];
  if (companyCity) {
    details.push({ iconEmoji: "&#128205;", iconBg: "#FFF7ED", label: "City", value: companyCity });
  }

  for (const recipient of recipients) {
    const html = buildEmailHtml({
      language: 'en',
      iconEmoji: "&#128276;",
      iconBg: "#FFF7ED",
      headline: "New Company Verification Request",
      subheadline: `${companyName} has submitted documents for verification.`,
      recipientName: recipient.name,
      bodyText: `A new company has uploaded verification documents and is waiting for review. Please review their submission in the admin panel.`,
      details,
      ctaLabel: "Review in Admin Panel",
      ctaUrl: adminUrl,
      ctaColor: BRAND_COLOR,
      reasonText: `You are receiving this because you are a platform admin on Bid.`,
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send admin notification to ${recipient.email}:`, err));
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

// =============================================================================
// EMAIL VERIFICATION OTP
// =============================================================================

export async function sendVerificationOTP(params: {
  email: string;
  otp: string;
  recipientName?: string;
  language?: Lang;
}): Promise<boolean> {
  const { email, otp, recipientName, language = 'en' } = params;
  const isAr = language === 'ar';

  const subject = isAr ? `${otp} — رمز التحقق من بِد` : `${otp} — Your Bid verification code`;

  const html = buildEmailHtml({
    iconEmoji: "&#128274;",
    iconBg: "#EFF6FF",
    headline: isAr ? "تحقق من بريدك الإلكتروني" : "Verify your email",
    subheadline: isAr ? "أدخل الرمز أدناه لتأكيد عنوان بريدك الإلكتروني" : "Enter the code below to confirm your email address",
    recipientName,
    bodyText: isAr
      ? `رمز التحقق الخاص بك هو:<div style="margin:24px 0;text-align:center;"><span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#18181b;background:#f4f4f5;padding:16px 32px;border-radius:12px;display:inline-block;">${otp}</span></div><p style="color:#71717a;font-size:13px;">هذا الرمز صالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا البريد.</p>`
      : `Your verification code is:<div style="margin:24px 0;text-align:center;"><span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#18181b;background:#f4f4f5;padding:16px 32px;border-radius:12px;display:inline-block;">${otp}</span></div><p style="color:#71717a;font-size:13px;">This code is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>`,
    ctaLabel: isAr ? "فتح بِد" : "Open Bid",
    ctaUrl: getBaseUrl(),
    reasonText: isAr
      ? "لقد تلقيت هذا البريد لأنك أنشأت حساباً على منصة بِد."
      : "You received this email because you created an account on Bid.",
    language,
  });

  const sent = await sendAuthEmail(email, subject, html);
  if (!sent) {
    throw new Error("Failed to send OTP email");
  }
  return true;
}

// =============================================================================
// PASSWORD RESET EMAIL
// =============================================================================

export async function sendPasswordResetEmail(params: {
  email: string;
  resetToken: string;
  recipientName?: string;
  appBaseUrl?: string;
  language?: Lang;
}): Promise<boolean> {
  const { email, resetToken, recipientName, appBaseUrl, language = 'en' } = params;
  const isAr = language === 'ar';
  const baseUrl = getBaseUrl(appBaseUrl);
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  const subject = isAr ? "إعادة تعيين كلمة مرور بِد" : "Reset your Bid password";

  const html = buildEmailHtml({
    iconEmoji: "&#128272;",
    iconBg: "#FFF7ED",
    headline: isAr ? "إعادة تعيين كلمة المرور" : "Reset your password",
    subheadline: isAr
      ? "انقر على الزر أدناه لتعيين كلمة مرور جديدة"
      : "Click the button below to set a new password",
    recipientName,
    bodyText: isAr
      ? `طلبت إعادة تعيين كلمة مرور حسابك على منصة بِد. انقر على الزر أدناه لمتابعة العملية. <p style="color:#71717a;font-size:13px;margin-top:16px;">هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد بأمان.</p>`
      : `You requested a password reset for your Bid account. Click the button below to continue. <p style="color:#71717a;font-size:13px;margin-top:16px;">This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>`,
    ctaLabel: isAr ? "إعادة تعيين كلمة المرور" : "Reset Password",
    ctaUrl: resetUrl,
    ctaColor: "#E25E45",
    reasonText: isAr
      ? "لقد تلقيت هذا البريد لأنه تم طلب إعادة تعيين كلمة المرور لحسابك."
      : "You received this email because a password reset was requested for your account.",
    language,
  });

  const sent = await sendAuthEmail(email, subject, html);
  if (!sent) {
    throw new Error("Failed to send password reset email");
  }
  return true;
}

// =============================================================================
// TEAM INVITATION EMAIL
// =============================================================================

export async function sendTeamInviteEmail(params: {
  email: string;
  inviterName: string;
  companyName: string;
  role: string;
  inviteToken: string;
  appBaseUrl?: string;
  language?: Lang;
}): Promise<boolean> {
  const { email, inviterName, companyName, role, inviteToken, appBaseUrl, language = 'en' } = params;
  const isAr = language === 'ar';
  const baseUrl = getBaseUrl(appBaseUrl);

  const roleLabel = isAr
    ? ({ admin: 'مسؤول', member: 'عضو', viewer: 'مشاهد' } as Record<string, string>)[role] || role
    : role.charAt(0).toUpperCase() + role.slice(1);

  const subject = isAr
    ? `${inviterName} دعاك للانضمام إلى ${companyName} على بِد`
    : `${inviterName} invited you to join ${companyName} on Bid`;

  const signupUrl = `${baseUrl}/team-invite/${inviteToken}`;

  const html = buildEmailHtml({
    iconEmoji: "&#129309;",
    iconBg: "#F0FDF4",
    headline: isAr ? "لقد تمت دعوتك!" : "You've been invited!",
    subheadline: isAr
      ? `${inviterName} يريد منك الانضمام إلى فريقهم على بِد`
      : `${inviterName} wants you to join their team on Bid`,
    bodyText: isAr
      ? `لقد تمت دعوتك للانضمام إلى <strong>${companyName}</strong> بصفتك <strong>${roleLabel}</strong>. انقر على الزر أدناه لإنشاء حسابك والانضمام إلى الفريق.`
      : `You've been invited to join <strong>${companyName}</strong> as a <strong>${roleLabel}</strong>. Click the button below to create your account and join the team.`,
    details: [
      { iconEmoji: "&#127970;", iconBg: "#EFF6FF", label: isAr ? "الشركة" : "Company", value: companyName },
      { iconEmoji: "&#128100;", iconBg: "#F0FDF4", label: isAr ? "الدور" : "Role", value: roleLabel },
      { iconEmoji: "&#128228;", iconBg: "#FFF7ED", label: isAr ? "دعوة من" : "Invited by", value: inviterName },
    ],
    ctaLabel: isAr ? "قبول الدعوة" : "Accept Invitation",
    ctaUrl: signupUrl,
    ctaColor: "#16a34a",
    reasonText: isAr
      ? `لقد تلقيت هذا البريد لأن ${inviterName} دعاك للانضمام إلى ${companyName} على منصة بِد.`
      : `You received this email because ${inviterName} invited you to join ${companyName} on Bid.`,
    language,
  });

  const sent = await sendEmail(email, subject, html);
  if (!sent) {
    throw new Error("Failed to send team invitation email");
  }
  return true;
}

// =============================================================================
// MEMBERSHIP REQUESTS — user → workspace
// =============================================================================

export async function sendMembershipRequestNotification(params: {
  companyId: string;
  companyName: string;
  requesterName: string;
  requesterEmail: string;
  message: string | null;
  requestId: string;
  appBaseUrl?: string;
}): Promise<void> {
  const { companyName, requesterName, requesterEmail, message, appBaseUrl } = params;

  // Look up the company's owners/admins via storage (lazy import to avoid circular)
  const { storage } = await import("./storage");
  const members = await storage.getCompanyMembers(params.companyId);
  const adminRecipients = members
    .filter((m: any) => m.roleInCompany === 'owner' || m.roleInCompany === 'admin')
    .map((m: any) => ({ email: m.user.email, name: m.user.name, language: (m.user.language as Lang) || 'en' }));
  if (adminRecipients.length === 0) return;

  const baseUrl = getBaseUrl(appBaseUrl);
  const dashboardUrl = `${baseUrl}/settings?tab=company#membership-requests`;

  for (const recipient of adminRecipients) {
    const lang: Lang = recipient.language || 'en';
    const isAr = lang === 'ar';

    const subject = isAr
      ? `طلب انضمام جديد إلى ${companyName}`
      : `New join request for ${companyName}`;

    const html = buildEmailHtml({
      language: lang,
      iconEmoji: "&#128101;",
      iconBg: "#EFF6FF",
      headline:    isAr ? "طلب انضمام جديد"                             : "New join request",
      subheadline: isAr ? `${requesterName} يريد الانضمام إلى ${companyName}.` : `${requesterName} wants to join ${companyName}.`,
      recipientName: recipient.name,
      bodyText: isAr
        ? `قدّم <strong>${requesterName}</strong> (${requesterEmail}) طلباً للانضمام إلى مساحة العمل الخاصة بك. يمكنك قبوله أو رفضه من إعدادات الشركة.`
        : `<strong>${requesterName}</strong> (${requesterEmail}) requested to join your workspace. You can approve or deny the request from company settings.`,
      details: [
        { iconEmoji: "&#128100;", iconBg: "#EFF6FF", label: isAr ? "المستخدم" : "User",     value: `${requesterName} (${requesterEmail})` },
        { iconEmoji: "&#127970;", iconBg: "#FFF1EE", label: isAr ? "الشركة"   : "Workspace", value: companyName },
      ],
      messageBlock: message ? {
        label: isAr ? "رسالة من المستخدم" : "Message from user",
        text: message,
        borderColor: BRAND_COLOR,
      } : undefined,
      ctaLabel: isAr ? "مراجعة الطلب" : "Review request",
      ctaUrl: dashboardUrl,
      ctaColor: BRAND_COLOR,
      reasonText: isAr
        ? `لقد تلقيت هذا البريد لأنك مسؤول في ${companyName} على منصة بِد.`
        : `You received this email because you are an admin of ${companyName} on Bid.`,
    });
    sendEmail(recipient.email, subject, html).catch(err => console.error(`[Email] Failed to send to ${recipient.email}:`, err));
  }
}

export async function sendMembershipDecisionNotification(params: {
  requesterEmail: string;
  requesterName: string;
  companyName: string;
  decision: 'approved' | 'denied';
  reason: string | null;
  appBaseUrl?: string;
  language?: Lang;
}): Promise<void> {
  const { requesterEmail, requesterName, companyName, decision, reason, appBaseUrl, language = 'en' } = params;
  const isAr = language === 'ar';
  const isApproved = decision === 'approved';
  const baseUrl = getBaseUrl(appBaseUrl);

  const subject = isApproved
    ? (isAr ? `تمت الموافقة على طلب انضمامك إلى ${companyName}` : `You're in — welcome to ${companyName}`)
    : (isAr ? `تحديث طلب الانضمام إلى ${companyName}` : `Join request update — ${companyName}`);

  const html = buildEmailHtml({
    language,
    iconEmoji: isApproved ? "&#10003;" : "&#10007;",
    iconBg:    isApproved ? "#F0FDF4"  : "#FFF1EE",
    headline: isApproved
      ? (isAr ? "تمت الموافقة على الانضمام" : "Join request approved")
      : (isAr ? "لم تتم الموافقة"           : "Join request not approved"),
    subheadline: isApproved
      ? (isAr ? `أنت الآن عضو في ${companyName}.`                : `You're now a member of ${companyName}.`)
      : (isAr ? `لم تتم الموافقة على طلبك للانضمام إلى ${companyName}.` : `Your request to join ${companyName} was not approved.`),
    recipientName: requesterName,
    bodyText: isApproved
      ? (isAr ? `يمكنك الآن الوصول إلى مساحة عمل <strong>${companyName}</strong>. سجّل الدخول لاستكشاف المنصة.`
              : `You now have access to <strong>${companyName}</strong>'s workspace. Sign in to explore.`)
      : (isAr ? `لم تتم الموافقة على طلبك للانضمام إلى <strong>${companyName}</strong> في الوقت الحالي.`
              : `Your request to join <strong>${companyName}</strong> was not approved at this time.`),
    messageBlock: !isApproved && reason ? {
      label: isAr ? "السبب" : "Reason",
      text: reason,
      borderColor: BRAND_COLOR,
    } : undefined,
    ctaLabel: isApproved ? (isAr ? "افتح المنصة" : "Open Bid") : (isAr ? "العودة إلى بِد" : "Back to Bid"),
    ctaUrl: `${baseUrl}/dashboard`,
    ctaColor: isApproved ? "#16a34a" : BRAND_COLOR,
    reasonText: isAr
      ? `لقد تلقيت هذا البريد لأنك قدّمت طلب انضمام إلى ${companyName} على منصة بِد.`
      : `You received this email because you requested to join ${companyName} on Bid.`,
  });

  sendEmail(requesterEmail, subject, html).catch(err => console.error(`[Email] Failed to send to ${requesterEmail}:`, err));
}
