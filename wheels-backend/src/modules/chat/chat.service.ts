// backend/src/modules/chat/chat.service.ts
import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Get or create chat between buyer and seller for a vehicle ──

  async getOrCreateChat(buyerId: string, sellerId: string, vehicleId: string) {
    if (buyerId === sellerId) {
      throw new ForbiddenException('You cannot chat with yourself');
    }

    // Check if chat already exists
    const existing = await this.dataSource.query(
      `SELECT c.*, 
        b.full_name as buyer_name, b.avatar_url as buyer_avatar,
        s.full_name as seller_name, s.avatar_url as seller_avatar
       FROM chats c
       JOIN users b ON b.id = c.buyer_id
       JOIN users s ON s.id = c.seller_id
       WHERE c.vehicle_id = $1 AND c.buyer_id = $2 AND c.seller_id = $3
       LIMIT 1`,
      [vehicleId, buyerId, sellerId],
    );

    if (existing.length) return existing[0];

    // Create new chat
    const [chat] = await this.dataSource.query(
      `INSERT INTO chats (vehicle_id, buyer_id, seller_id, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [vehicleId, buyerId, sellerId],
    );

    this.logger.log(`New chat created: ${chat.id} for vehicle ${vehicleId}`);
    return chat;
  }

  // ── Get user's chat list ───────────────────────────────────

  async getUserChats(userId: string, page = 1, limit = 30) {
    const offset = (page - 1) * limit;

    const chats = await this.dataSource.query(
      `SELECT 
          c.*,
          v.title as vehicle_title,
          v.price as vehicle_price,
          vi.thumbnail_url as vehicle_image,
          CASE WHEN c.buyer_id = $1 THEN seller.full_name ELSE buyer.full_name END as other_user_name,
          CASE WHEN c.buyer_id = $1 THEN seller.avatar_url ELSE buyer.avatar_url END as other_user_avatar,
          CASE WHEN c.buyer_id = $1 THEN seller.id ELSE buyer.id END as other_user_id,
          CASE WHEN c.buyer_id = $1 THEN c.buyer_unread ELSE c.seller_unread END as unread_count
       FROM chats c
       LEFT JOIN vehicles v ON v.id = c.vehicle_id
       LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_primary = true
       LEFT JOIN users buyer ON buyer.id = c.buyer_id
       LEFT JOIN users seller ON seller.id = c.seller_id
       WHERE (c.buyer_id = $1 AND c.is_archived_buyer = false)
          OR (c.seller_id = $1 AND c.is_archived_seller = false)
       ORDER BY c.last_message_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    return { data: chats, meta: { page, limit } };
  }

  // ── Get messages in a chat ────────────────────────────────

  async getMessages(chatId: string, userId: string, before?: string, limit = 50) {
    // Verify user is part of the chat
    const [chat] = await this.dataSource.query(
      'SELECT * FROM chats WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
      [chatId, userId],
    );
    if (!chat) throw new ForbiddenException('Not a member of this chat');

    const messages = await this.dataSource.query(
      `SELECT m.*, 
          u.full_name as sender_name, u.avatar_url as sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = $1
         AND m.is_deleted = false
         ${before ? 'AND m.created_at < $3' : ''}
       ORDER BY m.created_at DESC
       LIMIT $2`,
      before ? [chatId, limit, before] : [chatId, limit],
    );

    // Mark messages as read
    await this.markMessagesRead(chatId, userId);

    return messages.reverse(); // oldest first
  }

  // ── Create message (called from WebSocket gateway) ────────

  async createMessage(senderId: string, data: {
    chat_id: string;
    content?: string;
    message_type: string;
    media_url?: string;
    voice_duration?: number;
  }) {
    // Verify sender is in the chat
    const [chat] = await this.dataSource.query(
      'SELECT * FROM chats WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
      [data.chat_id, senderId],
    );
    if (!chat) throw new ForbiddenException('Not a member of this chat');

    // Insert message
    const [message] = await this.dataSource.query(
      `INSERT INTO messages (chat_id, sender_id, content, message_type, media_url, voice_duration, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [data.chat_id, senderId, data.content, data.message_type, data.media_url, data.voice_duration],
    );

    // Update chat last_message and unread counters
    const isbuyer = chat.buyer_id === senderId;
    await this.dataSource.query(
      `UPDATE chats SET 
         last_message_at = NOW(),
         last_message_preview = $1,
         ${isbuyer ? 'seller_unread = seller_unread + 1' : 'buyer_unread = buyer_unread + 1'}
       WHERE id = $2`,
      [data.content?.slice(0, 100) || `[${data.message_type}]`, data.chat_id],
    );

    return message;
  }

  // ── Mark messages read ────────────────────────────────────

  async markMessagesRead(chatId: string, userId: string, messageIds?: string[]): Promise<void> {
    if (messageIds?.length) {
      await this.dataSource.query(
        `UPDATE messages SET is_read = true, read_at = NOW()
         WHERE chat_id = $1 AND sender_id != $2 AND id = ANY($3)`,
        [chatId, userId, messageIds],
      );
    } else {
      await this.dataSource.query(
        `UPDATE messages SET is_read = true, read_at = NOW()
         WHERE chat_id = $1 AND sender_id != $2 AND is_read = false`,
        [chatId, userId],
      );
    }

    // Reset unread counter in chat
    const [chat] = await this.dataSource.query('SELECT * FROM chats WHERE id = $1', [chatId]);
    if (chat) {
      const field = chat.buyer_id === userId ? 'buyer_unread' : 'seller_unread';
      await this.dataSource.query(`UPDATE chats SET ${field} = 0 WHERE id = $1`, [chatId]);
    }
  }

  // ── Create offer ─────────────────────────────────────────

  async createOffer(buyerId: string, data: {
    chat_id: string;
    vehicle_id: string;
    offered_price: number;
    message?: string;
  }) {
    const [chat] = await this.dataSource.query(
      'SELECT * FROM chats WHERE id = $1 AND buyer_id = $2',
      [data.chat_id, buyerId],
    );
    if (!chat) throw new ForbiddenException('Only the buyer can make an offer');

    // Expire any pending offers for this vehicle from this buyer
    await this.dataSource.query(
      `UPDATE offers SET status = 'expired' 
       WHERE vehicle_id = $1 AND buyer_id = $2 AND status = 'pending'`,
      [data.vehicle_id, buyerId],
    );

    // Create offer
    const [offer] = await this.dataSource.query(
      `INSERT INTO offers (vehicle_id, chat_id, buyer_id, seller_id, offered_price, message, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '48 hours')
       RETURNING *`,
      [data.vehicle_id, data.chat_id, buyerId, chat.seller_id, data.offered_price, data.message],
    );

    // Create a message in chat for the offer
    await this.createMessage(buyerId, {
      chat_id: data.chat_id,
      message_type: 'offer',
      metadata: JSON.stringify({ offer_id: offer.id, amount: data.offered_price }),
    } as any);

    // Notify seller
    const [seller] = await this.dataSource.query(
      'SELECT push_token, preferred_language, full_name FROM users WHERE id = $1',
      [chat.seller_id],
    );
    const [vehicle] = await this.dataSource.query(
      'SELECT title FROM vehicles WHERE id = $1',
      [data.vehicle_id],
    );

    if (seller?.push_token) {
      await this.notificationsService.notifyOfferReceived(
        chat.seller_id, seller.push_token,
        data.offered_price, vehicle?.title || 'your vehicle',
        offer.id, data.chat_id,
        seller.preferred_language,
      );
    }

    return offer;
  }

  // ── Respond to offer ──────────────────────────────────────

  async respondToOffer(offerId: string, sellerId: string, response: 'accept' | 'reject' | 'counter', counterPrice?: number) {
    const [offer] = await this.dataSource.query(
      `SELECT o.*, v.title as vehicle_title FROM offers o
       JOIN vehicles v ON v.id = o.vehicle_id
       WHERE o.id = $1 AND o.seller_id = $2 AND o.status = 'pending'`,
      [offerId, sellerId],
    );
    if (!offer) throw new NotFoundException('Offer not found or already responded');

    const newStatus = response === 'accept' ? 'accepted'
      : response === 'reject' ? 'rejected' : 'countered';

    await this.dataSource.query(
      `UPDATE offers SET status = $1, counter_price = $2, responded_at = NOW() WHERE id = $3`,
      [newStatus, counterPrice || null, offerId],
    );

    // Notify buyer
    const [buyer] = await this.dataSource.query(
      'SELECT push_token, preferred_language FROM users WHERE id = $1',
      [offer.buyer_id],
    );

    if (buyer?.push_token && response === 'accept') {
      await this.notificationsService.notifyOfferAccepted(
        offer.buyer_id, buyer.push_token,
        offer.vehicle_title, offer.chat_id,
        buyer.preferred_language,
      );
    }

    return { success: true, status: newStatus };
  }

  // ── Archive chat ──────────────────────────────────────────

  async archiveChat(chatId: string, userId: string): Promise<void> {
    const [chat] = await this.dataSource.query('SELECT * FROM chats WHERE id = $1', [chatId]);
    if (!chat) throw new NotFoundException('Chat not found');

    const field = chat.buyer_id === userId ? 'is_archived_buyer' : 'is_archived_seller';
    await this.dataSource.query(`UPDATE chats SET ${field} = true WHERE id = $1`, [chatId]);
  }

  // ── Get IDs of user's chats (for WS room join) ────────────

  async getUserChatIds(userId: string): Promise<string[]> {
    const chats = await this.dataSource.query(
      'SELECT id FROM chats WHERE buyer_id = $1 OR seller_id = $1',
      [userId],
    );
    return chats.map((c: any) => c.id);
  }

  // ── Notify offline users ──────────────────────────────────

  async notifyOfflineUsers(chatId: string, senderId: string, message: any): Promise<void> {
    const [chat] = await this.dataSource.query('SELECT * FROM chats WHERE id = $1', [chatId]);
    if (!chat) return;

    const recipientId = chat.buyer_id === senderId ? chat.seller_id : chat.buyer_id;

    const [recipient] = await this.dataSource.query(
      'SELECT push_token, preferred_language, full_name FROM users WHERE id = $1',
      [recipientId],
    );
    const [sender] = await this.dataSource.query(
      'SELECT full_name FROM users WHERE id = $1',
      [senderId],
    );

    if (recipient?.push_token && message.message_type === 'text') {
      await this.notificationsService.notifyNewMessage(
        recipientId, senderId,
        sender?.full_name || 'Someone',
        message.content,
        chatId,
        recipient.push_token,
        recipient.preferred_language,
      );
    }
  }
}
