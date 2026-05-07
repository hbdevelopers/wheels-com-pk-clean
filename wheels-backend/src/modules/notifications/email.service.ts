// backend/src/modules/notifications/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.get('RESEND_API_KEY'));
    this.from = config.get('EMAIL_FROM', 'wheels.com.pk <noreply@wheels.com.pk>');
  }

  // ── Welcome Email ─────────────────────────────────────────

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.send(to, 'Welcome to wheels.com.pk 🚗', this.welcomeTemplate(name));
  }

  // ── Listing Live ──────────────────────────────────────────

  async sendListingApproved(to: string, name: string, carName: string, listingUrl: string): Promise<void> {
    await this.send(
      to,
      `✅ Your listing is live — ${carName}`,
      this.listingApprovedTemplate(name, carName, listingUrl),
    );
  }

  // ── Lead notification (Financing / Insurance) ─────────────

  async sendLeadToProvider(
    providerEmail: string,
    leadData: { name: string; phone: string; city: string; carName: string; amount: number; type: string },
  ): Promise<void> {
    await this.send(
      providerEmail,
      `🔥 New ${leadData.type} Lead — ${leadData.carName}`,
      this.leadTemplate(leadData),
    );
  }

  // ── Generic send ─────────────────────────────────────────

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
      if (error) throw new Error(error.message);
      this.logger.log(`Email sent: "${subject}" → ${to}`);
    } catch (err) {
      this.logger.error(`Email failed to ${to}: ${err.message}`);
    }
  }

  // ── HTML Templates ────────────────────────────────────────

  private welcomeTemplate(name: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#111114;border-radius:16px;overflow:hidden;border:1px solid #1E1E24;">
    <div style="background:linear-gradient(135deg,#0d2010,#111114);padding:32px 32px 24px;text-align:center;">
      <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;">
        wheels<span style="color:#00E676">.com.pk</span>
      </div>
      <div style="font-size:13px;color:#606068;margin-top:4px;">Pakistan's Smartest Auto Marketplace</div>
    </div>
    <div style="padding:32px;">
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        Welcome aboard, ${name}! 🎉
      </h1>
      <p style="color:#B0B0B8;font-size:14px;line-height:1.7;margin:0 0 24px;">
        You've joined Pakistan's most advanced automotive marketplace. 
        Find your dream car, sell your vehicle, or explore live auctions — all in one place.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;">
        ${['🔍 Search 12,000+ listings', '🤖 AI price estimation', '✅ Verified sellers only', '🔨 Live car auctions'].map(f => `
        <div style="background:#18181C;border:1px solid #1E1E24;border-radius:10px;padding:12px;font-size:12px;color:#B0B0B8;">${f}</div>`).join('')}
      </div>
      <a href="https://wheels.com.pk" style="display:block;background:#00E676;color:#000;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:800;font-size:14px;text-align:center;">
        Explore wheels.com.pk →
      </a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #1E1E24;text-align:center;font-size:11px;color:#606068;">
      wheels.com.pk · Pakistan · <a href="https://wheels.com.pk/unsubscribe" style="color:#606068">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
  }

  private listingApprovedTemplate(name: string, carName: string, listingUrl: string): string {
    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#111114;border-radius:16px;overflow:hidden;border:1px solid #1E1E24;">
    <div style="background:linear-gradient(135deg,#0d2010,#111114);padding:32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">🚗</div>
      <div style="font-size:20px;font-weight:800;color:#00E676;">Your listing is live!</div>
    </div>
    <div style="padding:32px;">
      <p style="color:#B0B0B8;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Hi ${name}, your listing for <strong style="color:#fff">${carName}</strong> has been approved and is now visible to thousands of buyers across Pakistan.
      </p>
      <div style="background:#18181C;border:1px solid #00E67633;border-radius:12px;padding:16px;margin-bottom:24px;">
        <div style="font-size:12px;color:#B0B0B8;margin-bottom:4px;">Pro tips to sell faster:</div>
        <ul style="margin:8px 0;padding-left:20px;color:#B0B0B8;font-size:13px;line-height:1.8;">
          <li>Respond to inquiries within 1 hour for 3x more contacts</li>
          <li>Consider boosting your listing for 10x more views</li>
          <li>Get an inspection badge to build buyer trust</li>
        </ul>
      </div>
      <a href="${listingUrl}" style="display:block;background:#00E676;color:#000;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:800;font-size:14px;text-align:center;">
        View Your Listing →
      </a>
    </div>
  </div>
</body>
</html>`;
  }

  private leadTemplate(lead: any): string {
    return `<!DOCTYPE html>
<html>
<body style="background:#f5f5f5;font-family:sans-serif;padding:20px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e0e0e0;">
    <h2 style="color:#00C85A;margin:0 0 16px;">🔥 New ${lead.type} Lead</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0">Name</td><td style="padding:8px 0;font-weight:600">${lead.name}</td></tr>
      <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0">Phone</td><td style="padding:8px 0;font-weight:600">${lead.phone}</td></tr>
      <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0">City</td><td style="padding:8px 0;font-weight:600">${lead.city}</td></tr>
      <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0">Car</td><td style="padding:8px 0;font-weight:600">${lead.carName}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Amount</td><td style="padding:8px 0;font-weight:600;color:#00C85A">PKR ${(lead.amount/100000).toFixed(1)} Lac</td></tr>
    </table>
    <p style="font-size:12px;color:#999;margin-top:16px;">Lead from wheels.com.pk · ${new Date().toLocaleString('en-PK')}</p>
  </div>
</body>
</html>`;
  }
}
