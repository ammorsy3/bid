const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const FROM_EMAIL = "info@bidapp.sa";
const MESSAGE_STREAM = "system";
const PRIVACY_POLICY_URL = "https://bidapp.sa/privacy";
const HELP_CENTER_URL = "https://bidapp.sa/help";
const COMPANY_LEGAL = "Bid International Ltd.";

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
<body style="margin:0;padding:0;background-color:#f0f0f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f0f3;padding:48px 20px 32px;">
    <tr>
      <td align="center">

        <!-- Logo / Brand -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#E25E45;width:36px;height:36px;border-radius:10px;text-align:center;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:18px;font-weight:800;line-height:36px;">B</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:#18181b;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Bid</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06),0 0 1px rgba(0,0,0,0.1);">

          <!-- Icon + Title Header -->
          <tr>
            <td style="padding:40px 44px 0;" align="center">
              <!-- Folder / document icon circle -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#FFF1EE;width:64px;height:64px;border-radius:50%;text-align:center;vertical-align:middle;">
                    <span style="font-size:28px;line-height:64px;">&#128203;</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:20px 0 0;color:#18181b;font-size:20px;font-weight:700;letter-spacing:-0.3px;">New Proposal Received</h1>
              <p style="margin:8px 0 0;color:#71717a;font-size:14px;line-height:1.5;">A vendor has submitted a proposal to your tender</p>
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
              <p style="margin:0 0 20px;color:#18181b;font-size:15px;line-height:1.6;">
                ${recipientName ? `Hi ${recipientName},` : 'Hi,'}
              </p>
              <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
                Great news — a new proposal has been submitted to one of your active tenders. Review the details below and head to your dashboard to evaluate it.
              </p>

              <!-- Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <!-- Tender -->
                      <tr>
                        <td style="padding:18px 22px;vertical-align:top;" width="40">
                          <div style="width:32px;height:32px;background-color:#FFF1EE;border-radius:8px;text-align:center;line-height:32px;">
                            <span style="font-size:15px;">&#128196;</span>
                          </div>
                        </td>
                        <td style="padding:18px 22px 18px 0;">
                          <span style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Tender</span>
                          <p style="margin:3px 0 0;color:#18181b;font-size:15px;font-weight:600;line-height:1.4;">${tenderTitle}</p>
                        </td>
                      </tr>
                      <!-- Vendor -->
                      <tr>
                        <td colspan="2" style="padding:0 22px;"><div style="height:1px;background-color:#e4e4e7;"></div></td>
                      </tr>
                      <tr>
                        <td style="padding:18px 22px;vertical-align:top;" width="40">
                          <div style="width:32px;height:32px;background-color:#EFF6FF;border-radius:8px;text-align:center;line-height:32px;">
                            <span style="font-size:15px;">&#127970;</span>
                          </div>
                        </td>
                        <td style="padding:18px 22px 18px 0;">
                          <span style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Vendor</span>
                          <p style="margin:3px 0 0;color:#18181b;font-size:15px;font-weight:500;line-height:1.4;">${vendorCompanyName}</p>
                        </td>
                      </tr>
                      <!-- Submitted -->
                      <tr>
                        <td colspan="2" style="padding:0 22px;"><div style="height:1px;background-color:#e4e4e7;"></div></td>
                      </tr>
                      <tr>
                        <td style="padding:18px 22px;vertical-align:top;" width="40">
                          <div style="width:32px;height:32px;background-color:#F0FDF4;border-radius:8px;text-align:center;line-height:32px;">
                            <span style="font-size:15px;">&#128337;</span>
                          </div>
                        </td>
                        <td style="padding:18px 22px 18px 0;">
                          <span style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Submitted</span>
                          <p style="margin:3px 0 0;color:#18181b;font-size:15px;font-weight:500;line-height:1.4;">${submittedAt}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 8px;">
                    <a href="${tenderUrl}" style="display:inline-block;background-color:#E25E45;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;box-shadow:0 1px 3px rgba(226,94,69,0.3);">
                      View Tender &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reason line -->
          <tr>
            <td style="padding:24px 44px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:8px;">
                <tr>
                  <td style="padding:14px 18px;" align="center">
                    <span style="font-size:13px;">&#128274;</span>
                    <span style="color:#a1a1aa;font-size:12px;line-height:1.5;margin-left:6px;">You received this email because you are an owner or admin of the company that posted this tender on Bid.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer Links -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="margin-top:28px;">
          <tr>
            <td align="center" style="padding:0 0 12px;">
              <a href="${HELP_CENTER_URL}" style="color:#71717a;font-size:12px;text-decoration:none;font-weight:500;">Help Center</a>
              <span style="color:#d4d4d8;margin:0 10px;">&#183;</span>
              <a href="${PRIVACY_POLICY_URL}" style="color:#71717a;font-size:12px;text-decoration:none;font-weight:500;">Privacy Policy</a>
              <span style="color:#d4d4d8;margin:0 10px;">&#183;</span>
              <a href="mailto:${FROM_EMAIL}" style="color:#71717a;font-size:12px;text-decoration:none;font-weight:500;">Contact Us</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:4px 0 0;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.5;">&copy; 2025–2026 ${COMPANY_LEGAL} All rights reserved.</p>
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
