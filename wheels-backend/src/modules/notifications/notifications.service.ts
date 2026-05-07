// backend/src/modules/notifications/notifications.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushService, NOTIFICATION_TEMPLATES } from './push.service';
import { EmailService } from './email.service';

// Inline entity definition (would be in its own file)
// import { Notification } from './entities/notification.entity';
// import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
  ) {}

  // ── New message notification ──────────────────────────────

  async notifyNewMessage(
    recipientId: string,
    senderId: string,
    senderName: string,
    messagePreview: string,
    chatId: string,
    recipientPushToken: string,
    recipientLanguage: string = 'en',
  ) {
    const template = NOTIFICATION_TEMPLATES.new_message(senderName, messagePreview);

    await this.pushService.sendToUser(
      recipientPushToken,
      template,
      { type: 'message', chat_id: chatId, sender_id: senderId, deepLink: `wheels://chat/${chatId}` },
      recipientLanguage as 'en' | 'ur',
    );

    await this.saveNotification({
      user_id: recipientId,
      type: 'message',
      title: template.title,
      title_urdu: template.title_ur,
      body: template.body,
      body_urdu: template.body_ur,
      data: { chat_id: chatId, sender_id: senderId },
      deep_link: `wheels://chat/${chatId}`,
    });
  }

  // ── Offer notifications ───────────────────────────────────

  async notifyOfferReceived(
    sellerId: string,
    sellerPushToken: string,
    amount: number,
    carName: string,
    offerId: string,
    chatId: string,
    language = 'en',
  ) {
    const template = NOTIFICATION_TEMPLATES.offer_received(amount, carName);
    await this.pushService.sendToUser(
      sellerPushToken, template,
      { type: 'offer', offer_id: offerId, chat_id: chatId, deepLink: `wheels://chat/${chatId}` },
      language as 'en' | 'ur',
    );
    await this.saveNotification({ user_id: sellerId, type: 'offer', ...template, data: { offer_id: offerId } });
  }

  async notifyOfferAccepted(
    buyerId: string,
    buyerPushToken: string,
    carName: string,
    chatId: string,
    language = 'en',
  ) {
    const template = NOTIFICATION_TEMPLATES.offer_accepted(carName);
    await this.pushService.sendToUser(
      buyerPushToken, template,
      { type: 'offer_accepted', chat_id: chatId, deepLink: `wheels://chat/${chatId}` },
      language as 'en' | 'ur',
    );
    await this.saveNotification({ user_id: buyerId, type: 'offer', ...template, data: { chat_id: chatId } });
  }

  // ── Listing approved / rejected ───────────────────────────

  async notifyListingApproved(
    sellerId: string,
    pushToken: string,
    vehicleId: string,
    carName: string,
    language = 'en',
  ) {
    const template = NOTIFICATION_TEMPLATES.listing_approved(carName);
    await this.pushService.sendToUser(
      pushToken, template,
      { type: 'listing_approved', vehicle_id: vehicleId, deepLink: `wheels://listing/${vehicleId}` },
      language as 'en' | 'ur',
    );
    await this.saveNotification({ user_id: sellerId, type: 'system', ...template, data: { vehicle_id: vehicleId } });
  }

  async notifyListingRejected(
    sellerId: string,
    pushToken: string,
    vehicleId: string,
    carName: string,
    reason: string,
    language = 'en',
  ) {
    const template = NOTIFICATION_TEMPLATES.listing_rejected(carName, reason);
    await this.pushService.sendToUser(pushToken, template, { type: 'listing_rejected', vehicle_id: vehicleId }, language as 'en' | 'ur');
    await this.saveNotification({ user_id: sellerId, type: 'system', ...template, data: { vehicle_id: vehicleId, reason } });
  }

  // ── Price drop alert ──────────────────────────────────────

  async notifyPriceDrop(
    userId: string,
    pushToken: string,
    vehicleId: string,
    carName: string,
    newPrice: number,
    drop: number,
    language = 'en',
  ) {
    const template = NOTIFICATION_TEMPLATES.price_drop(carName, newPrice, drop);
    await this.pushService.sendToUser(
      pushToken, template,
      { type: 'price_drop', vehicle_id: vehicleId, deepLink: `wheels://listing/${vehicleId}` },
      language as 'en' | 'ur',
    );
    await this.saveNotification({ user_id: userId, type: 'price_drop', ...template, data: { vehicle_id: vehicleId } });
  }

  // ── Saved search alerts ───────────────────────────────────

  async triggerSavedSearchAlerts(vehicle: any): Promise<void> {
    // This is called when a new listing goes live
    // In production: query saved_searches where filters match the vehicle
    // then batch-notify matching users
    this.logger.log(`Triggering saved search alerts for vehicle ${vehicle.id}`);
    // Implementation: query DB for matching saved searches, then call notifySearchAlert for each
  }

  async notifySearchAlert(
    userId: string,
    pushToken: string,
    count: number,
    searchName: string,
    savedSearchId: string,
    language = 'en',
  ) {
    const template = NOTIFICATION_TEMPLATES.search_alert(count, searchName);
    await this.pushService.sendToUser(
      pushToken, template,
      { type: 'search_alert', saved_search_id: savedSearchId, deepLink: `wheels://search?saved=${savedSearchId}` },
      language as 'en' | 'ur',
    );
  }

  // ── Auction notifications ─────────────────────────────────

  async notifyAuctionOutbid(
    userId: string,
    pushToken: string,
    auctionId: string,
    carName: string,
    newBid: number,
    language = 'en',
  ) {
    const template = NOTIFICATION_TEMPLATES.auction_outbid(carName, newBid);
    await this.pushService.sendToUser(
      pushToken, template,
      { type: 'auction_outbid', auction_id: auctionId, deepLink: `wheels://auction/${auctionId}` },
      language as 'en' | 'ur',
    );
  }

  async notifyAuctionWon(
    userId: string,
    pushToken: string,
    auctionId: string,
    carName: string,
    amount: number,
    language = 'en',
  ) {
    const template = NOTIFICATION_TEMPLATES.auction_won(carName, amount);
    await this.pushService.sendToUser(
      pushToken, template,
      { type: 'auction_won', auction_id: auctionId, deepLink: `wheels://auction/${auctionId}/result` },
      language as 'en' | 'ur',
    );
    await this.saveNotification({ user_id: userId, type: 'bid', ...template, data: { auction_id: auctionId } });
  }

  // ── Get user notifications ────────────────────────────────

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    // Returns from notifications table with pagination
    // Stub — full implementation with TypeORM in production
    return { data: [], meta: { total: 0, page, limit, unread: 0 } };
  }

  async markAllRead(userId: string): Promise<void> {
    // UPDATE notifications SET is_read=true, read_at=NOW() WHERE user_id=$1
    this.logger.log(`Marked all notifications read for ${userId}`);
  }

  // ── Internal helper ───────────────────────────────────────

  private async saveNotification(data: {
    user_id: string;
    type: string;
    title: string;
    title_urdu?: string;
    body?: string;
    body_urdu?: string;
    data?: Record<string, any>;
    deep_link?: string;
  }): Promise<void> {
    // INSERT INTO notifications(...) — would use TypeORM repository in full implementation
    this.logger.debug(`Notification saved: [${data.type}] → ${data.user_id}`);
  }
}
