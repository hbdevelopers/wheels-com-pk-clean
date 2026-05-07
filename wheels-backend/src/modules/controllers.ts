// backend/src/modules/ai/ai.controller.ts
import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('price-estimate')
  @UseGuards(OptionalJwtGuard)
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Get AI price estimate for a vehicle' })
  estimatePrice(@Body() dto: {
    make: string; model: string; variant?: string;
    year: number; mileage: number; city: string;
    condition: string; features?: string[];
  }) {
    return this.aiService.estimatePrice(dto);
  }

  @Post('fraud-score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get AI fraud risk score for a listing' })
  getFraudScore(@Body() dto: { vehicle_id: string }) {
    return this.aiService.detectFraud(dto.vehicle_id);
  }

  @Post('generate-title')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ medium: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'AI-generate listing title' })
  generateTitle(@Body() dto: {
    make: string; model: string; variant?: string;
    year: number; color?: string; city: string; language?: string;
  }) {
    return this.aiService.generateTitle(dto);
  }

  @Post('generate-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'AI-generate listing description in English/Urdu/Roman Urdu' })
  generateDescription(@Body() dto: {
    make: string; model: string; variant?: string; year: number;
    mileage: number; color: string; features: string[];
    condition: string; city: string; language: 'en' | 'ur' | 'roman_ur';
  }) {
    return this.aiService.generateDescription(dto);
  }

  @Post('chatbot')
  @UseGuards(OptionalJwtGuard)
  @Throttle({ medium: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'AI chatbot — ask anything about buying cars in Pakistan' })
  chatbot(@Body() dto: {
    message: string;
    session_history?: Array<{ role: string; content: string }>;
  }) {
    return this.aiService.chatbotMessage(dto.message, dto.session_history || []);
  }

  @Post('ocr-registration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ medium: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'OCR scan of registration book — auto-extract vehicle details' })
  ocrRegistration(@Body() dto: { image_base64: string }) {
    return this.aiService.ocrRegistrationBook(dto.image_base64);
  }

  @Get('price-trends')
  @ApiOperation({ summary: 'Get price trend data for a make/model/year' })
  getPriceTrends(
    @Query('make') make: string,
    @Query('model') model: string,
    @Query('year') year?: number,
  ) {
    // Returns from price_trends table
    return { make, model, year, trends: [], message: 'Query price_trends table in production' };
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/payments/payments.controller.ts

import { Controller, Post, Body, Get, Req, Res, UseGuards, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JazzCashService } from './jazzcash.service';
import { EasypaisaService } from './easypaisa.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly jazzCash: JazzCashService,
    private readonly easyPaisa: EasypaisaService,
    private readonly dataSource: DataSource,
  ) {}

  @Post('boost/jazzcash')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay for listing boost via JazzCash' })
  async boostWithJazzCash(
    @CurrentUser('id') userId: string,
    @Body() dto: { vehicle_id: string; package: '3day' | '7day' | '30day'; return_url: string },
  ) {
    const packages = { '3day': 500, '7day': 999, '30day': 2999 };
    const amount = packages[dto.package];
    const orderId = uuidv4();

    // Save pending transaction
    await this.dataSource.query(
      `INSERT INTO transactions (user_id, reference_id, reference_type, amount, payment_method, payment_status, description)
       VALUES ($1, $2, 'boost', $3, 'jazzcash', 'pending', $4)`,
      [userId, dto.vehicle_id, amount, `${dto.package} boost for vehicle ${dto.vehicle_id}`],
    );

    return this.jazzCash.initiateWebPayment({
      amount,
      orderId,
      description: `wheels.com.pk - ${dto.package} listing boost`,
      customerPhone: '',
      returnUrl: dto.return_url,
      cancelUrl: `${dto.return_url}?cancelled=true`,
    });
  }

  @Post('boost/easypaisa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async boostWithEasyPaisa(
    @CurrentUser('id') userId: string,
    @Body() dto: { vehicle_id: string; package: '3day' | '7day' | '30day'; phone: string; return_url: string },
  ) {
    const packages = { '3day': 500, '7day': 999, '30day': 2999 };
    const amount = packages[dto.package];

    return this.easyPaisa.initiatePayment({
      amount,
      orderId: uuidv4(),
      customerPhone: dto.phone,
      description: `${dto.package} listing boost`,
      returnUrl: dto.return_url,
    });
  }

  @Post('subscription/jazzcash')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay for dealer subscription via JazzCash' })
  async subscribeWithJazzCash(
    @CurrentUser('id') userId: string,
    @Body() dto: { tier: 'basic' | 'professional' | 'enterprise'; return_url: string },
  ) {
    const prices = { basic: 2999, professional: 7999, enterprise: 19999 };
    const amount = prices[dto.tier];

    return this.jazzCash.initiateWebPayment({
      amount,
      orderId: uuidv4(),
      description: `wheels.com.pk ${dto.tier} dealer subscription`,
      customerPhone: '',
      returnUrl: dto.return_url,
      cancelUrl: dto.return_url,
    });
  }

  @Get('jazzcash/callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'JazzCash payment callback (GET + POST)' })
  async jazzCashCallback(@Query() params: Record<string, string>, @Res() res: Response) {
    const result = this.jazzCash.verifyCallback(params);

    if (result.verified && result.success) {
      // Update transaction, activate boost or subscription
      await this.dataSource.query(
        `UPDATE transactions SET payment_status = 'completed', gateway_transaction_id = $1
         WHERE gateway_transaction_id IS NULL AND amount = $2
         ORDER BY created_at DESC LIMIT 1`,
        [result.transactionId, result.amount],
      );
    }

    return res.redirect(`https://wheels.com.pk/payment/${result.success ? 'success' : 'failed'}?tx=${result.transactionId}`);
  }

  @Get('easypaisa/callback')
  @HttpCode(200)
  async easypaisaCallback(@Query() params: Record<string, string>, @Res() res: Response) {
    const verified = this.easyPaisa.verifyCallback(params);
    const success = verified && params.responseCode === '0000';
    return res.redirect(`https://wheels.com.pk/payment/${success ? 'success' : 'failed'}`);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getHistory(@CurrentUser('id') userId: string) {
    return this.dataSource.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId],
    );
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/common/health.controller.ts

import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    let dbStatus = 'connected';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db: dbStatus,
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/admin/admin.controller.ts

import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly dataSource: DataSource) {}

  // Dashboard stats
  @Get('stats')
  @Roles('admin')
  async getDashboardStats() {
    const [users, listings, revenue, pendingListings, reports] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL'),
      this.dataSource.query(`SELECT COUNT(*) FROM vehicles WHERE status IN ('active','boosted')`),
      this.dataSource.query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE payment_status='completed' AND created_at > NOW() - INTERVAL '30 days'`),
      this.dataSource.query(`SELECT COUNT(*) FROM vehicles WHERE status='pending'`),
      this.dataSource.query(`SELECT COUNT(*) FROM reports WHERE status='open'`),
    ]);
    return {
      total_users: +users[0].count,
      active_listings: +listings[0].count,
      revenue_30d: +revenue[0].total,
      pending_listings: +pendingListings[0].count,
      open_reports: +reports[0].count,
    };
  }

  // Listing moderation
  @Get('listings/pending')
  async getPendingListings(@Query('page') page = 1, @Query('limit') limit = 20) {
    const offset = (+page - 1) * +limit;
    return this.dataSource.query(
      `SELECT v.*, u.full_name as seller_name, u.phone as seller_phone
       FROM vehicles v JOIN users u ON u.id = v.seller_id
       WHERE v.status = 'pending' ORDER BY v.created_at ASC
       LIMIT $1 OFFSET $2`,
      [+limit, offset],
    );
  }

  @Put('listings/:id/approve')
  async approveListing(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    await this.dataSource.query(
      `UPDATE vehicles SET status='active', published_at=NOW(), expires_at=NOW()+INTERVAL '90 days' WHERE id=$1`,
      [id],
    );
    // Notify seller via push
    const [v] = await this.dataSource.query(`SELECT seller_id, title FROM vehicles WHERE id=$1`, [id]);
    const [u] = await this.dataSource.query(`SELECT push_token, preferred_language FROM users WHERE id=$1`, [v.seller_id]);
    this.logger?.log(`Listing ${id} approved by ${adminId}`);
    return { success: true };
  }

  @Put('listings/:id/reject')
  async rejectListing(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    await this.dataSource.query(
      `UPDATE vehicles SET status='rejected' WHERE id=$1`, [id],
    );
    return { success: true };
  }

  // User management
  @Get('users')
  async getUsers(
    @Query('page') page = 1,
    @Query('q') q?: string,
    @Query('role') role?: string,
  ) {
    let where = 'WHERE deleted_at IS NULL';
    const params: any[] = [];
    if (q) { where += ` AND (full_name ILIKE $${params.length+1} OR phone ILIKE $${params.length+1})`; params.push(`%${q}%`); }
    if (role) { where += ` AND role = $${params.length+1}`; params.push(role); }
    params.push(20, (+page-1)*20);
    return this.dataSource.query(
      `SELECT id, full_name, phone, email, role, city, is_blocked, cnic_verified, phone_verified, trust_score, created_at FROM users ${where} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params,
    );
  }

  @Put('users/:id/block')
  async blockUser(@Param('id') id: string, @Body() body: { blocked: boolean }) {
    await this.dataSource.query('UPDATE users SET is_blocked=$1 WHERE id=$2', [body.blocked, id]);
    return { success: true };
  }

  @Put('users/:id/approve-cnic')
  @Roles('admin')
  async approveCnic(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    await this.dataSource.query('UPDATE users SET cnic_verified=true WHERE id=$1', [id]);
    await this.dataSource.query(
      `INSERT INTO user_badges (user_id, badge_type) VALUES ($1, 'cnic_verified') ON CONFLICT DO NOTHING`,
      [id],
    );
    return { success: true };
  }

  // Reports
  @Get('reports')
  async getReports(@Query('status') status = 'open') {
    return this.dataSource.query(
      `SELECT r.*, 
         ru.full_name as reporter_name,
         rv.full_name as reported_user_name
       FROM reports r
       LEFT JOIN users ru ON ru.id = r.reporter_id
       LEFT JOIN users rv ON rv.id = r.reported_user_id
       WHERE r.status = $1 ORDER BY r.created_at DESC LIMIT 50`,
      [status],
    );
  }

  @Put('reports/:id/resolve')
  async resolveReport(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { action: 'dismiss' | 'remove_listing' | 'ban_user'; notes?: string },
  ) {
    await this.dataSource.query(
      `UPDATE reports SET status='resolved', admin_notes=$1, resolved_by=$2, resolved_at=NOW() WHERE id=$3`,
      [body.notes, adminId, id],
    );
    return { success: true };
  }

  // Revenue
  @Get('revenue')
  @Roles('admin')
  async getRevenue(@Query('period') period: '7d' | '30d' | '90d' = '30d') {
    const days = { '7d': 7, '30d': 30, '90d': 90 };
    return this.dataSource.query(
      `SELECT DATE_TRUNC('day', created_at) as date, 
              SUM(amount) as total,
              COUNT(*) as transactions,
              payment_method
       FROM transactions
       WHERE payment_status='completed' AND created_at > NOW() - INTERVAL '${days[period]} days'
       GROUP BY 1, payment_method
       ORDER BY 1 DESC`,
    );
  }

  // Send push campaign
  @Post('push-campaign')
  @Roles('admin')
  async sendPushCampaign(@Body() dto: {
    title: string; body: string; deep_link?: string;
    target: 'all' | 'sellers' | 'dealers' | 'buyers';
  }) {
    const roleMap = { sellers: 'seller', dealers: 'dealer', buyers: 'buyer', all: null };
    const role = roleMap[dto.target];
    const tokens = await this.dataSource.query(
      `SELECT push_token FROM users WHERE push_token IS NOT NULL AND is_active = true ${role ? `AND role='${role}'` : ''}`,
    );
    return {
      success: true,
      targeting: dto.target,
      token_count: tokens.length,
      message: 'Campaign queued. Use PushService.sendCampaign() to dispatch.',
    };
  }
}
