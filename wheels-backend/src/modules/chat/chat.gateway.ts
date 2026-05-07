// backend/src/modules/chat/chat.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  // userId → Set<socketId> (one user can have multiple devices)
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  // ── Connection ─────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.userRole = payload.role;

      // Track user's sockets
      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      this.connectedUsers.get(payload.sub).add(client.id);

      // Join personal room for direct notifications
      client.join(`user:${payload.sub}`);

      // Join all user's chat rooms
      const userChats = await this.chatService.getUserChatIds(payload.sub);
      userChats.forEach(chatId => client.join(`chat:${chatId}`));

      this.logger.log(`User ${payload.sub} connected (${client.id})`);

      // Notify user their online status
      client.emit('connected', { userId: payload.sub });
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.connectedUsers.has(userId)) {
      const sockets = this.connectedUsers.get(userId);
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
        // Broadcast user went offline to their chat partners
        this.server.emit(`user:${userId}:offline`);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Send Message ───────────────────────────────────────────

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      chat_id: string;
      content: string;
      message_type: 'text' | 'image' | 'voice' | 'offer';
      media_url?: string;
      voice_duration?: number;
    },
  ) {
    const senderId = client.data.userId;
    if (!senderId) return { error: 'Unauthorized' };

    try {
      const message = await this.chatService.createMessage(senderId, data);

      // Broadcast to all users in the chat room
      this.server.to(`chat:${data.chat_id}`).emit('new_message', {
        ...message,
        sender_id: senderId,
      });

      // Send push notification to offline users
      await this.chatService.notifyOfflineUsers(data.chat_id, senderId, message);

      return { success: true, message_id: message.id };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── Typing Indicator ───────────────────────────────────────

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chat_id: string },
  ) {
    client.to(`chat:${data.chat_id}`).emit('user_typing', {
      user_id: client.data.userId,
      chat_id: data.chat_id,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chat_id: string },
  ) {
    client.to(`chat:${data.chat_id}`).emit('user_stopped_typing', {
      user_id: client.data.userId,
      chat_id: data.chat_id,
    });
  }

  // ── Read Receipts ──────────────────────────────────────────

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chat_id: string; message_ids: string[] },
  ) {
    const userId = client.data.userId;
    await this.chatService.markMessagesRead(data.chat_id, userId, data.message_ids);

    client.to(`chat:${data.chat_id}`).emit('messages_read', {
      chat_id: data.chat_id,
      user_id: userId,
      message_ids: data.message_ids,
    });
  }

  // ── Offer via Chat ─────────────────────────────────────────

  @SubscribeMessage('make_offer')
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      chat_id: string;
      vehicle_id: string;
      offered_price: number;
      message?: string;
    },
  ) {
    const buyerId = client.data.userId;

    try {
      const offer = await this.chatService.createOffer(buyerId, data);

      this.server.to(`chat:${data.chat_id}`).emit('new_offer', offer);
      return { success: true, offer_id: offer.id };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── Online Status Check ────────────────────────────────────

  @SubscribeMessage('check_online')
  handleCheckOnline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { user_id: string },
  ) {
    const isOnline = this.connectedUsers.has(data.user_id);
    return { user_id: data.user_id, is_online: isOnline };
  }

  // ── Public Helper ──────────────────────────────────────────

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
