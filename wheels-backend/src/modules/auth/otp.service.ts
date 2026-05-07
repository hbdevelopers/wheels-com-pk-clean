// backend/src/modules/auth/otp.service.ts
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly config: ConfigService) {}

  async sendSms(phone: string, message: string): Promise<void> {
    const provider = this.config.get('SMS_PROVIDER', 'twilio'); // twilio | africas_talking | jazz

    try {
      switch (provider) {
        case 'twilio':
          await this.sendViaTwilio(phone, message);
          break;
        case 'africas_talking':
          await this.sendViaAfricasTalking(phone, message);
          break;
        case 'jazz':
          await this.sendViaJazzSMS(phone, message);
          break;
        default:
          // Dev fallback: just log
          this.logger.warn(`[SMS MOCK] To: ${phone} | Message: ${message}`);
      }
    } catch (error) {
      this.logger.error(`SMS send failed to ${phone.slice(0, 7)}****: ${error.message}`);
      throw new ServiceUnavailableException('SMS service temporarily unavailable. Please try again.');
    }
  }

  private async sendViaTwilio(phone: string, message: string): Promise<void> {
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const from = this.config.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Dynamic import to avoid loading if not used
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    await client.messages.create({ body: message, from, to: phone });
    this.logger.log(`SMS sent via Twilio to ${phone.slice(0, 7)}****`);
  }

  private async sendViaAfricasTalking(phone: string, message: string): Promise<void> {
    const apiKey = this.config.get('AT_API_KEY');
    const username = this.config.get('AT_USERNAME');
    const senderId = this.config.get('AT_SENDER_ID', 'wheels');

    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({ apiKey, username });
    const sms = at.SMS;

    await sms.send({ to: [phone], message, from: senderId });
    this.logger.log(`SMS sent via Africa's Talking to ${phone.slice(0, 7)}****`);
  }

  private async sendViaJazzSMS(phone: string, message: string): Promise<void> {
    // Jazz SMS API (Pakistan-specific)
    const apiUrl = this.config.get('JAZZ_SMS_API_URL');
    const apiKey = this.config.get('JAZZ_SMS_API_KEY');
    const senderId = this.config.get('JAZZ_SENDER_ID', 'WheelsPK');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        from: senderId,
        text: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Jazz SMS API error: ${response.status}`);
    }

    this.logger.log(`SMS sent via Jazz to ${phone.slice(0, 7)}****`);
  }
}
