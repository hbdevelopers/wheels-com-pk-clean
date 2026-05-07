// backend/src/modules/notifications/push.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// ── Notification Templates ───────────────────────────────────
export const NOTIFICATION_TEMPLATES = {
  new_message: (senderName: string, preview: string) => ({
    title: `💬 ${senderName}`,
    title_ur: `💬 ${senderName}`,
    body: preview.slice(0, 80),
    body_ur: preview.slice(0, 80),
  }),
  offer_received: (amount: number, carName: string) => ({
    title: '💰 New Offer Received',
    title_ur: '💰 نئی پیشکش موصول ہوئی',
    body: `PKR ${(amount / 100000).toFixed(1)} Lac offer on your ${carName}`,
    body_ur: `آپ کی ${carName} پر پیشکش`,
  }),
  offer_accepted: (carName: string) => ({
    title: '✅ Offer Accepted!',
    title_ur: '✅ پیشکش قبول ہو گئی!',
    body: `Your offer on ${carName} was accepted. Chat now to finalize.`,
    body_ur: `${carName} پر آپ کی پیشکش قبول ہو گئی۔`,
  }),
  price_drop: (carName: string, newPrice: number, drop: number) => ({
    title: `📉 Price Drop Alert`,
    title_ur: `📉 قیمت کم ہو گئی`,
    body: `${carName} dropped by PKR ${(drop / 100000).toFixed(1)} Lac → Now ${(newPrice / 100000).toFixed(1)} Lac`,
    body_ur: `${carName} کی قیمت کم ہو گئی`,
  }),
  search_alert: (count: number, query: string) => ({
    title: `🔔 ${count} New Listings`,
    title_ur: `🔔 ${count} نئی گاڑیاں`,
    body: `New cars matching "${query}" are available`,
    body_ur: `آپ کی تلاش سے ملتی نئی گاڑیاں دستیاب ہیں`,
  }),
  listing_approved: (carName: string) => ({
    title: '🚗 Listing Live!',
    title_ur: '🚗 اشتہار شائع ہو گیا!',
    body: `Your ${carName} is now live on wheels.com.pk`,
    body_ur: `آپ کی ${carName} wheels.com.pk پر شائع ہو گئی`,
  }),
  listing_rejected: (carName: string, reason: string) => ({
    title: '❌ Listing Rejected',
    title_ur: '❌ اشتہار مسترد',
    body: `${carName}: ${reason}`,
    body_ur: `${carName}: ${reason}`,
  }),
  auction_outbid: (carName: string, newBid: number) => ({
    title: '⚡ You've been outbid!',
    title_ur: '⚡ آپ کی بولی پیچھے رہ گئی!',
    body: `New bid: PKR ${(newBid / 100000).toFixed(1)} Lac on ${carName}. Bid now!`,
    body_ur: `${carName} پر نئی بولی لگ گئی`,
  }),
  auction_won: (carName: string, amount: number) => ({
    title: '🏆 You won the auction!',
    title_ur: '🏆 آپ نے نیلامی جیت لی!',
    body: `Congratulations! You won ${carName} for PKR ${(amount / 100000).toFixed(1)} Lac`,
    body_ur: `مبارک ہو! آپ نے ${carName} جیت لی`,
  }),
  inspection_scheduled: (date: string, location: string) => ({
    title: '🔧 Inspection Scheduled',
    title_ur: '🔧 معائنہ طے ہو گیا',
    body: `Your vehicle inspection is scheduled for ${date} at ${location}`,
    body_ur: `آپ کے گاڑی کا معائنہ ${date} کو ہوگا`,
  }),
  verification_approved: () => ({
    title: '✅ Account Verified!',
    title_ur: '✅ اکاؤنٹ تصدیق شدہ!',
    body: 'Your CNIC has been verified. You now have a verified badge.',
    body_ur: 'آپ کا شناختی کارڈ تصدیق ہو گیا۔ آپ کو تصدیقی نشان مل گیا۔',
  }),
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;

  constructor(
    private readonly config: ConfigService,
  ) {
    this.expo = new Expo({
      accessToken: config.get('EXPO_ACCESS_TOKEN'),
      useFcmV1: true,
    });
  }

  // ── Send to single user ───────────────────────────────────

  async sendToUser(
    pushToken: string,
    template: { title: string; body: string; title_ur?: string; body_ur?: string },
    data: Record<string, any> = {},
    language: 'en' | 'ur' = 'en',
  ): Promise<void> {
    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      this.logger.warn(`Invalid push token: ${pushToken}`);
      return;
    }

    const title = language === 'ur' && template.title_ur ? template.title_ur : template.title;
    const body = language === 'ur' && template.body_ur ? template.body_ur : template.body;

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: { ...data, timestamp: Date.now() },
      badge: 1,
      priority: 'high',
      channelId: data.channel || 'default',
    };

    try {
      const chunks = this.expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        await this.handleTickets(tickets);
      }
    } catch (err) {
      this.logger.error(`Push send failed to ${pushToken.slice(0, 20)}...: ${err.message}`);
    }
  }

  // ── Send to multiple users (bulk) ─────────────────────────

  async sendBulk(
    notifications: Array<{
      pushToken: string;
      title: string;
      body: string;
      data?: Record<string, any>;
    }>,
  ): Promise<void> {
    const validMessages: ExpoPushMessage[] = notifications
      .filter(n => n.pushToken && Expo.isExpoPushToken(n.pushToken))
      .map(n => ({
        to: n.pushToken,
        sound: 'default' as const,
        title: n.title,
        body: n.body,
        data: { ...n.data, timestamp: Date.now() },
        priority: 'normal' as const,
      }));

    if (!validMessages.length) return;

    const chunks = this.expo.chunkPushNotifications(validMessages);
    let totalSent = 0;

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        totalSent += tickets.filter(t => t.status === 'ok').length;
        await this.handleTickets(tickets);
      } catch (err) {
        this.logger.error(`Bulk push chunk failed: ${err.message}`);
      }
    }

    this.logger.log(`Bulk push: ${totalSent}/${validMessages.length} sent`);
  }

  // ── Campaign blast (admin) ─────────────────────────────────

  async sendCampaign(campaign: {
    title: string;
    body: string;
    deepLink?: string;
    targetFilters?: {
      cities?: string[];
      roles?: string[];
      lastActiveDays?: number;
      minListings?: number;
    };
  }, pushTokens: string[]): Promise<{ sent: number; failed: number }> {
    const messages: ExpoPushMessage[] = pushTokens
      .filter(t => Expo.isExpoPushToken(t))
      .map(token => ({
        to: token,
        sound: 'default' as const,
        title: campaign.title,
        body: campaign.body,
        data: { deepLink: campaign.deepLink, type: 'campaign' },
        priority: 'normal' as const,
      }));

    let sent = 0, failed = 0;
    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        sent += tickets.filter(t => t.status === 'ok').length;
        failed += tickets.filter(t => t.status === 'error').length;
      } catch (err) {
        failed += chunk.length;
        this.logger.error(`Campaign chunk error: ${err.message}`);
      }
    }

    this.logger.log(`Campaign sent: ${sent} ok, ${failed} failed`);
    return { sent, failed };
  }

  // ── Handle delivery receipts ──────────────────────────────

  private async handleTickets(tickets: ExpoPushTicket[]): Promise<void> {
    const receiptIds: string[] = [];
    for (const ticket of tickets) {
      if (ticket.status === 'ok' && ticket.id) {
        receiptIds.push(ticket.id);
      } else if (ticket.status === 'error') {
        this.logger.warn(`Push ticket error: ${ticket.message} (${ticket.details?.error})`);
        // If DeviceNotRegistered, remove the token from DB
        if (ticket.details?.error === 'DeviceNotRegistered') {
          // TODO: mark push token as invalid in users table
        }
      }
    }

    // Check receipts asynchronously (Expo recommends this)
    if (receiptIds.length) {
      setTimeout(() => this.checkReceipts(receiptIds), 30_000);
    }
  }

  private async checkReceipts(receiptIds: string[]): Promise<void> {
    try {
      const chunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
      for (const chunk of chunks) {
        const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
        for (const [id, receipt] of Object.entries(receipts)) {
          if (receipt.status === 'error') {
            this.logger.warn(`Push receipt error [${id}]: ${receipt.message}`);
          }
        }
      }
    } catch (err) {
      this.logger.error('Receipt check failed:', err.message);
    }
  }
}
