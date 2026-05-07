// backend/src/modules/auctions/auctions.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

// Entities would be imported from their files
// Simplified inline for this module:

@WebSocketGateway({
  namespace: '/auctions',
  cors: { origin: '*' },
})
@Injectable()
export class AuctionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AuctionsGateway.name);
  private auctionWatchers = new Map<string, Set<string>>(); // auctionId → Set<userId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.startAuctionEndChecker();
  }

  // ── Connection ─────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.emit('connected', { userId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove from all auction watcher lists
    this.auctionWatchers.forEach((watchers, auctionId) => {
      if (watchers.has(client.data.userId)) {
        watchers.delete(client.data.userId);
        this.server.to(`auction:${auctionId}`).emit('watcher_count', {
          auction_id: auctionId,
          count: watchers.size,
        });
      }
    });
  }

  // ── Watch Auction ──────────────────────────────────────────

  @SubscribeMessage('watch_auction')
  async handleWatchAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auction_id: string },
  ) {
    const { auction_id } = data;
    const userId = client.data.userId;

    client.join(`auction:${auction_id}`);

    if (!this.auctionWatchers.has(auction_id)) {
      this.auctionWatchers.set(auction_id, new Set());
    }
    this.auctionWatchers.get(auction_id).add(userId);

    // Send current auction state
    const state = await this.getAuctionState(auction_id);
    client.emit('auction_state', state);

    // Broadcast updated watcher count
    this.server.to(`auction:${auction_id}`).emit('watcher_count', {
      auction_id,
      count: this.auctionWatchers.get(auction_id).size,
    });

    return { joined: true };
  }

  // ── Place Bid ─────────────────────────────────────────────

  @SubscribeMessage('place_bid')
  async handleBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auction_id: string; amount: number; is_auto_bid?: boolean; max_auto_bid?: number },
  ) {
    const bidderId = client.data.userId;
    if (!bidderId) return { error: 'Unauthorized' };

    try {
      // Use a database transaction to prevent race conditions
      const result = await this.dataSource.transaction(async (manager) => {
        // Lock auction row for update
        const auction = await manager.query(
          `SELECT * FROM auctions WHERE id = $1 AND status = 'live' FOR UPDATE`,
          [data.auction_id],
        );

        if (!auction.length) {
          throw new Error('Auction not found or not active');
        }

        const auc = auction[0];

        // Validate bid amount
        const minBid = parseFloat(auc.current_price || auc.start_price) + parseFloat(auc.bid_increment);
        if (data.amount < minBid) {
          throw new Error(`Minimum bid is PKR ${minBid.toLocaleString()}`);
        }

        // Check if bidder is the seller
        if (auc.seller_id === bidderId) {
          throw new Error('You cannot bid on your own auction');
        }

        // Mark previous winning bid as not winning
        await manager.query(
          `UPDATE bids SET is_winning = false WHERE auction_id = $1`,
          [data.auction_id],
        );

        // Insert new bid
        const [newBid] = await manager.query(
          `INSERT INTO bids (auction_id, bidder_id, amount, is_auto_bid, max_auto_bid, is_winning)
           VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
          [data.auction_id, bidderId, data.amount, data.is_auto_bid || false, data.max_auto_bid || null],
        );

        // Update auction current price and bid count
        await manager.query(
          `UPDATE auctions SET current_price = $1, total_bids = total_bids + 1, updated_at = NOW()
           WHERE id = $2`,
          [data.amount, data.auction_id],
        );

        return newBid;
      });

      // Broadcast bid to all watchers
      const bidEvent = {
        auction_id: data.auction_id,
        bid_id: result.id,
        amount: data.amount,
        bidder_id: bidderId,
        bidder_initials: await this.getBidderInitials(bidderId),
        timestamp: new Date().toISOString(),
        total_bids: await this.getAuctionBidCount(data.auction_id),
      };

      this.server.to(`auction:${data.auction_id}`).emit('new_bid', bidEvent);

      // Cache updated state
      await this.cache.del(`auction:state:${data.auction_id}`);

      this.logger.log(`Bid placed: PKR ${data.amount} on auction ${data.auction_id}`);
      return { success: true, bid: bidEvent };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ── Leave Auction ──────────────────────────────────────────

  @SubscribeMessage('leave_auction')
  handleLeaveAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auction_id: string },
  ) {
    client.leave(`auction:${data.auction_id}`);
    const watchers = this.auctionWatchers.get(data.auction_id);
    if (watchers) {
      watchers.delete(client.data.userId);
    }
  }

  // ── Countdown Timer Sync ──────────────────────────────────

  @SubscribeMessage('get_timer')
  async handleGetTimer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auction_id: string },
  ) {
    const auction = await this.dataSource.query(
      `SELECT ends_at, status FROM auctions WHERE id = $1`,
      [data.auction_id],
    );

    if (!auction.length) return { error: 'Auction not found' };

    const endsAt = new Date(auction[0].ends_at);
    const remainingMs = Math.max(0, endsAt.getTime() - Date.now());

    return {
      auction_id: data.auction_id,
      ends_at: auction[0].ends_at,
      remaining_ms: remainingMs,
      remaining_seconds: Math.floor(remainingMs / 1000),
      status: auction[0].status,
    };
  }

  // ── Auto-end checker (runs every 10 seconds) ──────────────

  private startAuctionEndChecker() {
    setInterval(async () => {
      try {
        const expiredAuctions = await this.dataSource.query(
          `UPDATE auctions SET status = 'ended', updated_at = NOW()
           WHERE status = 'live' AND ends_at <= NOW()
           RETURNING id, winner_id, winning_bid`,
        );

        for (const auction of expiredAuctions) {
          // Find highest bidder
          const [winner] = await this.dataSource.query(
            `SELECT b.bidder_id, b.amount, u.full_name
             FROM bids b JOIN users u ON b.bidder_id = u.id
             WHERE b.auction_id = $1 AND b.is_winning = true
             LIMIT 1`,
            [auction.id],
          );

          if (winner) {
            await this.dataSource.query(
              `UPDATE auctions SET winner_id = $1, winning_bid = $2 WHERE id = $3`,
              [winner.bidder_id, winner.amount, auction.id],
            );
          }

          // Broadcast auction ended
          this.server.to(`auction:${auction.id}`).emit('auction_ended', {
            auction_id: auction.id,
            winner: winner ? {
              id: winner.bidder_id,
              name: winner.full_name.split(' ')[0] + ' ****',
              amount: winner.amount,
            } : null,
          });

          this.logger.log(`Auction ${auction.id} ended. Winner: ${winner?.bidder_id || 'none'}`);
        }
      } catch (err) {
        this.logger.error('Auction end checker error:', err);
      }
    }, 10_000);
  }

  // ── Helpers ───────────────────────────────────────────────

  private async getAuctionState(auctionId: string) {
    const cacheKey = `auction:state:${auctionId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [auction] = await this.dataSource.query(
      `SELECT a.*, 
        (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids,
        (SELECT json_build_object('amount', b.amount, 'bidder_id', b.bidder_id)
         FROM bids b WHERE b.auction_id = a.id ORDER BY b.amount DESC LIMIT 1) as top_bid
       FROM auctions a WHERE a.id = $1`,
      [auctionId],
    );

    if (auction) {
      await this.cache.set(cacheKey, auction, 5);
    }
    return auction;
  }

  private async getBidderInitials(userId: string): Promise<string> {
    const [user] = await this.dataSource.query(
      'SELECT full_name FROM users WHERE id = $1',
      [userId],
    );
    return user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U?';
  }

  private async getAuctionBidCount(auctionId: string): Promise<number> {
    const [result] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM bids WHERE auction_id = $1',
      [auctionId],
    );
    return parseInt(result.count);
  }

  // Called from HTTP controller to start an auction
  broadcastAuctionStart(auctionId: string, auctionData: any) {
    this.server.emit('auction_started', { auction_id: auctionId, ...auctionData });
  }
}
