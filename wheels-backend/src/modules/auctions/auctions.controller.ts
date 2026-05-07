// backend/src/modules/auctions/auctions.controller.ts
import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuctionsGateway } from './auctions.gateway';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(
    private readonly auctionsGateway: AuctionsGateway,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List auctions by status' })
  async getAuctions(
    @Query('status') status: 'upcoming' | 'live' | 'ended' = 'live',
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const offset = (+page - 1) * +limit;
    const auctions = await this.dataSource.query(
      `SELECT a.*,
         v.title, v.make, v.model, v.year, v.city,
         vi.thumbnail_url as vehicle_image,
         u.full_name as seller_name,
         (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids
       FROM auctions a
       JOIN vehicles v ON v.id = a.vehicle_id
       LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_primary = true
       JOIN users u ON u.id = a.seller_id
       WHERE a.status = $1
       ORDER BY a.ends_at ASC
       LIMIT $2 OFFSET $3`,
      [status, +limit, offset],
    );
    return { data: auctions, meta: { page: +page, limit: +limit } };
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  async getAuction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId?: string,
  ) {
    const [auction] = await this.dataSource.query(
      `SELECT a.*,
         v.title, v.make, v.model, v.variant, v.year, v.city,
         v.mileage, v.fuel_type, v.transmission, v.description,
         vi.thumbnail_url as vehicle_image,
         u.full_name as seller_name, u.phone_verified as seller_phone_verified
       FROM auctions a
       JOIN vehicles v ON v.id = a.vehicle_id
       LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_primary = true
       JOIN users u ON u.id = a.seller_id
       WHERE a.id = $1`,
      [id],
    );
    if (!auction) throw new Error('Auction not found');

    // Get all images
    const images = await this.dataSource.query(
      'SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY order_index',
      [auction.vehicle_id],
    );

    // Get bid history (last 20)
    const bids = await this.dataSource.query(
      `SELECT b.amount, b.created_at, b.is_winning,
         CONCAT(LEFT(u.full_name, 1), REPEAT('*', LENGTH(u.full_name) - 2), RIGHT(u.full_name, 1)) as bidder_name,
         CASE WHEN b.bidder_id = $2 THEN true ELSE false END as is_mine
       FROM bids b
       JOIN users u ON u.id = b.bidder_id
       WHERE b.auction_id = $1
       ORDER BY b.amount DESC LIMIT 20`,
      [id, userId || '00000000-0000-0000-0000-000000000000'],
    );

    const myBid = userId ? await this.dataSource.query(
      'SELECT MAX(amount) as max FROM bids WHERE auction_id = $1 AND bidder_id = $2',
      [id, userId],
    ) : null;

    return { ...auction, images, bids, my_highest_bid: myBid?.[0]?.max || null };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new auction for a vehicle' })
  async createAuction(
    @CurrentUser('id') sellerId: string,
    @Body() dto: {
      vehicle_id: string;
      start_price: number;
      reserve_price?: number;
      bid_increment?: number;
      starts_at: string;
      ends_at: string;
    },
  ) {
    const [auction] = await this.dataSource.query(
      `INSERT INTO auctions (id, vehicle_id, seller_id, status, start_price, reserve_price,
         current_price, bid_increment, starts_at, ends_at)
       VALUES ($1,$2,$3,'upcoming',$4,$5,$4,$6,$7,$8)
       RETURNING *`,
      [
        uuidv4(), dto.vehicle_id, sellerId, dto.start_price,
        dto.reserve_price || null, dto.bid_increment || 100000,
        dto.starts_at, dto.ends_at,
      ],
    );

    // Update vehicle status
    await this.dataSource.query(
      'UPDATE vehicles SET auction_id = $1 WHERE id = $2 AND seller_id = $3',
      [auction.id, dto.vehicle_id, sellerId],
    );

    return auction;
  }

  @Put(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async startAuction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    if (!['admin', 'moderator'].includes(role)) throw new Error('Admin only');
    await this.dataSource.query(
      `UPDATE auctions SET status = 'live', updated_at = NOW() WHERE id = $1`, [id],
    );
    const [auction] = await this.dataSource.query('SELECT * FROM auctions WHERE id = $1', [id]);
    this.auctionsGateway.broadcastAuctionStart(id, auction);
    return { success: true };
  }
}
