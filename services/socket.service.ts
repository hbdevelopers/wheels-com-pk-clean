// mobile/services/socket.service.ts
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const WS_URL = Constants.expoConfig?.extra?.wsUrl || 'wss://api.wheels.com.pk';

class SocketService {
  private chatSocket: Socket | null = null;
  private auctionSocket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // ── Chat Socket ──────────────────────────────────────────

  async connectChat(): Promise<Socket> {
    if (this.chatSocket?.connected) return this.chatSocket;

    const token = await SecureStore.getItemAsync('access_token');
    if (!token) throw new Error('Not authenticated');

    this.chatSocket = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.chatSocket.on('connect', () => {
      console.log('[Socket] Chat connected');
      this.reconnectAttempts = 0;
    });

    this.chatSocket.on('disconnect', (reason) => {
      console.log('[Socket] Chat disconnected:', reason);
    });

    this.chatSocket.on('connect_error', (err) => {
      console.error('[Socket] Chat connect error:', err.message);
    });

    return this.chatSocket;
  }

  disconnectChat() {
    this.chatSocket?.disconnect();
    this.chatSocket = null;
  }

  // ── Chat Actions ─────────────────────────────────────────

  sendMessage(chatId: string, content: string, type = 'text', mediaUrl?: string, voiceDuration?: number) {
    this.chatSocket?.emit('send_message', {
      chat_id: chatId,
      content,
      message_type: type,
      media_url: mediaUrl,
      voice_duration: voiceDuration,
    });
  }

  sendTypingStart(chatId: string) {
    this.chatSocket?.emit('typing_start', { chat_id: chatId });
  }

  sendTypingStop(chatId: string) {
    this.chatSocket?.emit('typing_stop', { chat_id: chatId });
  }

  markRead(chatId: string, messageIds: string[]) {
    this.chatSocket?.emit('mark_read', { chat_id: chatId, message_ids: messageIds });
  }

  makeOffer(chatId: string, vehicleId: string, price: number, message?: string) {
    this.chatSocket?.emit('make_offer', {
      chat_id: chatId,
      vehicle_id: vehicleId,
      offered_price: price,
      message,
    });
  }

  onNewMessage(handler: (msg: any) => void) {
    this.chatSocket?.on('new_message', handler);
    return () => this.chatSocket?.off('new_message', handler);
  }

  onNewOffer(handler: (offer: any) => void) {
    this.chatSocket?.on('new_offer', handler);
    return () => this.chatSocket?.off('new_offer', handler);
  }

  onTyping(handler: (data: any) => void) {
    this.chatSocket?.on('user_typing', handler);
    return () => this.chatSocket?.off('user_typing', handler);
  }

  onMessagesRead(handler: (data: any) => void) {
    this.chatSocket?.on('messages_read', handler);
    return () => this.chatSocket?.off('messages_read', handler);
  }

  checkOnline(userId: string, callback: (isOnline: boolean) => void) {
    this.chatSocket?.emit('check_online', { user_id: userId }, (resp: any) => {
      callback(resp?.is_online ?? false);
    });
  }

  // ── Auction Socket ───────────────────────────────────────

  async connectAuction(): Promise<Socket> {
    if (this.auctionSocket?.connected) return this.auctionSocket;

    const token = await SecureStore.getItemAsync('access_token');
    if (!token) throw new Error('Not authenticated');

    this.auctionSocket = io(`${WS_URL}/auctions`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.auctionSocket.on('connect', () => console.log('[Socket] Auction connected'));
    this.auctionSocket.on('disconnect', () => console.log('[Socket] Auction disconnected'));

    return this.auctionSocket;
  }

  watchAuction(auctionId: string) {
    this.auctionSocket?.emit('watch_auction', { auction_id: auctionId });
  }

  leaveAuction(auctionId: string) {
    this.auctionSocket?.emit('leave_auction', { auction_id: auctionId });
  }

  placeBid(auctionId: string, amount: number, isAutoBid = false, maxAutoBid?: number) {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      this.auctionSocket?.emit(
        'place_bid',
        { auction_id: auctionId, amount, is_auto_bid: isAutoBid, max_auto_bid: maxAutoBid },
        resolve,
      );
    });
  }

  getTimer(auctionId: string, callback: (data: any) => void) {
    this.auctionSocket?.emit('get_timer', { auction_id: auctionId }, callback);
  }

  onNewBid(handler: (bid: any) => void) {
    this.auctionSocket?.on('new_bid', handler);
    return () => this.auctionSocket?.off('new_bid', handler);
  }

  onAuctionEnded(handler: (data: any) => void) {
    this.auctionSocket?.on('auction_ended', handler);
    return () => this.auctionSocket?.off('auction_ended', handler);
  }

  onWatcherCount(handler: (data: any) => void) {
    this.auctionSocket?.on('watcher_count', handler);
    return () => this.auctionSocket?.off('watcher_count', handler);
  }

  onAuctionState(handler: (state: any) => void) {
    this.auctionSocket?.on('auction_state', handler);
    return () => this.auctionSocket?.off('auction_state', handler);
  }

  disconnectAuction() {
    this.auctionSocket?.disconnect();
    this.auctionSocket = null;
  }

  // ── Cleanup ──────────────────────────────────────────────

  disconnectAll() {
    this.disconnectChat();
    this.disconnectAuction();
  }
}

export const socketService = new SocketService();
export default socketService;
