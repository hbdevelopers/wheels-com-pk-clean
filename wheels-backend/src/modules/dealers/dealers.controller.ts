// backend/src/modules/dealers/dealers.controller.ts
import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DealersService } from './dealers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@ApiTags('Dealers')
@Controller('dealers')
export class DealersController {
  constructor(
    private readonly dealersService: DealersService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Public: dealer storefront by slug ─────────────────────
  @Get(':slug/storefront')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get dealer public storefront' })
  async getStorefront(
    @Param('slug') slug: string,
    @Query('page') page = 1,
  ) {
    const dealer = await this.dealersService.getDealerBySlug(slug);

    // Get dealer's active listings
    const listings = await this.dataSource.query(
      `SELECT v.*, vi.thumbnail_url as image
       FROM vehicles v
       LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_primary = true
       WHERE v.dealer_id = $1 AND v.status IN ('active','boosted')
       ORDER BY v.is_featured DESC, v.created_at DESC
       LIMIT 20 OFFSET $2`,
      [dealer.id, (+page - 1) * 20],
    );

    return { dealer, listings, page: +page };
  }

  // ── List all verified dealers ──────────────────────────────
  @Get()
  async listDealers(
    @Query('city') city?: string,
    @Query('tier') tier?: string,
  ) {
    let query = `SELECT d.*, u.phone
       FROM dealers d JOIN users u ON u.id = d.user_id
       WHERE d.is_verified = true`;
    const params: any[] = [];
    if (city) { query += ` AND LOWER(d.city) = LOWER($${params.length + 1})`; params.push(city); }
    if (tier) { query += ` AND d.subscription_tier = $${params.length + 1}`; params.push(tier); }
    query += ' ORDER BY d.is_featured DESC, d.avg_rating DESC LIMIT 50';
    return this.dataSource.query(query, params);
  }

  // ── Subscription packages ─────────────────────────────────
  @Get('packages')
  @ApiOperation({ summary: 'Get dealer subscription packages with prices' })
  getPackages() {
    return this.dealersService.getSubscriptionPackages();
  }

  // ── Apply to become a dealer ──────────────────────────────
  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to register as a dealer' })
  async applyAsDealer(
    @CurrentUser('id') userId: string,
    @Body() dto: {
      business_name: string;
      city: string;
      address: string;
      phone: string;
      whatsapp?: string;
      ntn_number?: string;
      description?: string;
    },
  ) {
    // Check not already a dealer
    const existing = await this.dataSource.query(
      'SELECT 1 FROM dealers WHERE user_id = $1', [userId],
    );
    if (existing.length) {
      return { message: 'Dealer application already submitted' };
    }

    const slug = dto.business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + userId.slice(0, 6);

    await this.dataSource.query(
      `INSERT INTO dealers (user_id, business_name, slug, city, address, phone, whatsapp, ntn_number, description, subscription_tier)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'free')`,
      [userId, dto.business_name, slug, dto.city, dto.address, dto.phone, dto.whatsapp || dto.phone, dto.ntn_number, dto.description],
    );

    await this.dataSource.query(`UPDATE users SET role = 'dealer' WHERE id = $1`, [userId]);

    return { success: true, slug, message: 'Application submitted. Verification within 24-48 hours.' };
  }

  // ── Finance lead ──────────────────────────────────────────
  @Post('leads/financing')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit financing request' })
  submitFinancingLead(
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.dealersService.submitFinancingLead({ ...dto, userId });
  }

  // ── Insurance lead ────────────────────────────────────────
  @Post('leads/insurance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit insurance quote request' })
  submitInsuranceLead(
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.dealersService.submitInsuranceLead({ ...dto, userId });
  }

  // ── Mechanic booking ──────────────────────────────────────
  @Post('mechanic-booking')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Book a mechanic visit' })
  bookMechanic(
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.dealersService.bookMechanic({ ...dto, userId });
  }
}
