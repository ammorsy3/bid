const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const FROM_EMAIL = "info@bidapp.sa";
const MESSAGE_STREAM = "system";

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

function buildNewOfferEmailHtml(params: {
  tenderTitle: string;
  vendorCompanyName: string;
  submittedAt: string;
  tenderUrl: string;
  recipientName?: string;
}): string {
  const { tenderTitle, vendorCompanyName, submittedAt, tenderUrl, recipientName } = params;

  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Proposal Received</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#E25E45,#FF8A6B);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Bid</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">Procurement Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 20px;color:#18181b;font-size:16px;line-height:1.5;">
                ${recipientName ? `Hi ${recipientName},` : 'Hi,'}
              </p>
              <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
                A new proposal has been submitted to your tender. Here are the details:
              </p>

              <!-- Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Tender</span>
                          <p style="margin:4px 0 0;color:#18181b;font-size:15px;font-weight:600;">${tenderTitle}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0 6px;border-top:1px solid #e4e4e7;">
                          <span style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Vendor</span>
                          <p style="margin:4px 0 0;color:#18181b;font-size:15px;font-weight:500;">${vendorCompanyName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0 6px;border-top:1px solid #e4e4e7;">
                          <span style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Submitted</span>
                          <p style="margin:4px 0 0;color:#18181b;font-size:15px;font-weight:500;">${submittedAt}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0 16px;">
                    <a href="${tenderUrl}" style="display:inline-block;background-color:#E25E45;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.2px;">
                      View Tender &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.5;">
                This is an automated notification from Bid. You received this because you are an admin of the company that owns this tender.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendNewOfferNotification(params: {
  tenderTitle: string;
  tenderId: string;
  vendorCompanyName: string;
  submittedAt: Date;
  recipients: { email: string; name?: string }[];
  appBaseUrl?: string;
}): Promise<void> {
  const { tenderTitle, tenderId, vendorCompanyName, submittedAt, recipients, appBaseUrl } = params;

  if (recipients.length === 0) {
    console.log("[Email] No recipients for new offer notification — skipping");
    return;
  }

  const baseUrl = appBaseUrl || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "bidapp.sa"}`;
  const tenderUrl = `${baseUrl}/tenders/${tenderId}`;
  const formattedDate = submittedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `New Proposal Received — ${tenderTitle}`;

  for (const recipient of recipients) {
    const html = buildNewOfferEmailHtml({
      tenderTitle,
      vendorCompanyName,
      submittedAt: formattedDate,
      tenderUrl,
      recipientName: recipient.name,
    });

    sendEmail(recipient.email, subject, html).catch(err => {
      console.error(`[Email] Failed to send to ${recipient.email}:`, err);
    });
  }
}
