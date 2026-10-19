import { db } from '../db/index.ts';
import { sentEmails } from '../db/schema.ts';

export interface SendDeliveryEmailParams {
  orderId: number;
  orderCode: string;
  recipientEmail: string;
  minecraftUsername: string;
  productName: string;
  amount: number;
  currency: string;
  discordLink: string;
  supportEmail: string;
}

export async function sendDeliveryConfirmationEmail(params: SendDeliveryEmailParams) {
  const subject = `[BeastMC Support] Order #${params.orderCode} Delivered - Enjoy your ${params.productName}!`;

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; color: #ffffff; letter-spacing: 1px; font-weight: 800; text-transform: uppercase; }
    .badge { display: inline-block; background-color: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-top: 10px; }
    .content { padding: 30px; }
    .greeting { font-size: 18px; font-weight: 600; color: #f8fafc; margin-bottom: 16px; }
    .info-card { background-color: #1f2937; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .info-label { color: #94a3b8; }
    .info-val { font-weight: 700; color: #f8fafc; }
    .btn { display: inline-block; background-color: #10b981; color: #ffffff; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; margin-top: 10px; }
    .discord-box { background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center; }
    .footer { text-align: center; font-size: 12px; color: #64748b; padding: 20px; border-top: 1px solid #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BeastMC Network</h1>
      <div class="badge">Official Order Delivery Confirmation</div>
    </div>
    <div class="content">
      <div class="greeting">Hey ${escapeHtml(params.minecraftUsername)},</div>
      <p style="color: #cbd5e1; line-height: 1.6;">
        Great news! Your BeastMC Network store purchase has been verified and successfully delivered to your Minecraft account.
      </p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Order ID:</span>
          <span class="info-val" style="color: #34d399;">#${escapeHtml(params.orderCode)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Delivered Product:</span>
          <span class="info-val">${escapeHtml(params.productName)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Minecraft Username:</span>
          <span class="info-val">${escapeHtml(params.minecraftUsername)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Delivery Status:</span>
          <span class="info-val" style="color: #10b981;">DELIVERED (Fulfilled)</span>
        </div>
        <div class="info-row" style="margin-bottom: 0;">
          <span class="info-label">Total Amount Paid:</span>
          <span class="info-val">$${(params.amount / 100).toFixed(2)} ${escapeHtml(params.currency)}</span>
        </div>
      </div>

      <p style="color: #cbd5e1; line-height: 1.6;">
        To access your perks or items in-game, connect to the server at <strong>play.beastmc.net</strong>. If you are currently online, please reconnect or type <code>/claim</code> to refresh your rank and entitlements.
      </p>

      <div class="discord-box">
        <div style="font-weight: 700; color: #c7d2fe; margin-bottom: 6px;">Need Assistance or Claim Issues?</div>
        <div style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">Join the BeastMC Discord community for 24/7 priority player support.</div>
        <a href="${escapeHtml(params.discordLink)}" target="_blank" style="background-color: #5865F2; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">
          Open BeastMC Discord Support
        </a>
      </div>
    </div>
    <div class="footer">
      Sent with care by BeastMC Support &bull; Email: ${escapeHtml(params.supportEmail)} &bull; ${new Date().getFullYear()} BeastMC Network LLC
    </div>
  </div>
</body>
</html>
  `;

  // Store sent email in the database for tracking and audit
  const [record] = await db.insert(sentEmails).values({
    orderId: params.orderId,
    recipientEmail: params.recipientEmail,
    minecraftUsername: params.minecraftUsername,
    subject,
    productName: params.productName,
    bodyHtml,
    discordLink: params.discordLink,
    status: 'sent',
  }).returning();

  return {
    success: true,
    emailId: record.id,
    subject,
    recipient: params.recipientEmail,
  };
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
