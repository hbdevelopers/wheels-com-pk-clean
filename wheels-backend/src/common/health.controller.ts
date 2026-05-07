// backend/src/common/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    let dbStatus = 'connected';
    try { await this.dataSource.query('SELECT 1'); } catch { dbStatus = 'disconnected'; }
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
import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Logger } from '@nestjs/common';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('stats')
  @Roles('admin')
  async getDashboardStats() {
    const [users, listings, revenue, pending, reports] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL'),
      this.dataSource.query(`SELECT COUNT(*) FROM vehicles WHERE status IN ('active','boosted')`),
      this.dataSource.query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE payment_status='completed' AND created_at>NOW()-INTERVAL '30 days'`),
      this.dataSource.query(`SELECT COUNT(*) FROM vehicles WHERE status='pending'`),
      this.dataSource.query(`SELECT COUNT(*) FROM reports WHERE status='open'`),
    ]);
    return { total_users: +users[0].count, active_listings: +listings[0].count, revenue_30d: +revenue[0].total, pending_listings: +pending[0].count, open_reports: +reports[0].count };
  }

  @Get('listings/pending')
  async getPendingListings(@Query('page') page = 1, @Query('limit') limit = 20) {
    const offset = (+page - 1) * +limit;
    return this.dataSource.query(
      `SELECT v.*, u.full_name as seller_name, u.phone as seller_phone FROM vehicles v JOIN users u ON u.id=v.seller_id WHERE v.status='pending' ORDER BY v.created_at ASC LIMIT $1 OFFSET $2`,
      [+limit, offset],
    );
  }

  @Put('listings/:id/approve')
  async approveListing(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    await this.dataSource.query(`UPDATE vehicles SET status='active', published_at=NOW(), expires_at=NOW()+INTERVAL '90 days' WHERE id=$1`, [id]);
    this.logger.log(`Listing ${id} approved by admin ${adminId}`);
    return { success: true };
  }

  @Put('listings/:id/reject')
  async rejectListing(@Param('id') id: string, @Body() body: { reason: string }) {
    await this.dataSource.query(`UPDATE vehicles SET status='rejected' WHERE id=$1`, [id]);
    return { success: true };
  }

  @Get('users')
  async getUsers(@Query('page') page = 1, @Query('q') q?: string, @Query('role') role?: string) {
    const params: any[] = [];
    let where = 'WHERE deleted_at IS NULL';
    if (q) { where += ` AND (full_name ILIKE $${params.length + 1} OR phone ILIKE $${params.length + 1})`; params.push(`%${q}%`); }
    if (role) { where += ` AND role=$${params.length + 1}`; params.push(role); }
    params.push(20, (+page - 1) * 20);
    return this.dataSource.query(
      `SELECT id, full_name, phone, email, role, city, is_blocked, cnic_verified, phone_verified, trust_score, created_at FROM users ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
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
  async approveCnic(@Param('id') id: string) {
    await this.dataSource.query('UPDATE users SET cnic_verified=true WHERE id=$1', [id]);
    await this.dataSource.query(`INSERT INTO user_badges (user_id, badge_type) VALUES ($1,'cnic_verified') ON CONFLICT DO NOTHING`, [id]);
    return { success: true };
  }

  @Get('reports')
  async getReports(@Query('status') status = 'open') {
    return this.dataSource.query(
      `SELECT r.*, ru.full_name as reporter_name FROM reports r LEFT JOIN users ru ON ru.id=r.reporter_id WHERE r.status=$1 ORDER BY r.created_at DESC LIMIT 50`,
      [status],
    );
  }

  @Put('reports/:id/resolve')
  async resolveReport(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() body: { action: string; notes?: string }) {
    await this.dataSource.query(`UPDATE reports SET status='resolved', admin_notes=$1, resolved_by=$2, resolved_at=NOW() WHERE id=$3`, [body.notes, adminId, id]);
    return { success: true };
  }

  @Get('revenue')
  @Roles('admin')
  async getRevenue(@Query('period') period: '7d' | '30d' | '90d' = '30d') {
    const days = { '7d': 7, '30d': 30, '90d': 90 };
    return this.dataSource.query(
      `SELECT DATE_TRUNC('day', created_at) as date, SUM(amount) as total, COUNT(*) as transactions, payment_method FROM transactions WHERE payment_status='completed' AND created_at>NOW()-INTERVAL '${days[period]} days' GROUP BY 1, payment_method ORDER BY 1 DESC`,
    );
  }

  @Post('push-campaign')
  @Roles('admin')
  async sendPushCampaign(@Body() dto: { title: string; body: string; deep_link?: string; target: 'all' | 'sellers' | 'dealers' | 'buyers' }) {
    const roleMap: Record<string, string | null> = { sellers: 'seller', dealers: 'dealer', buyers: 'buyer', all: null };
    const role = roleMap[dto.target];
    const tokens = await this.dataSource.query(
      `SELECT push_token FROM users WHERE push_token IS NOT NULL AND is_active=true${role ? ` AND role='${role}'` : ''}`,
    );
    return { success: true, targeting: dto.target, token_count: tokens.length };
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/notifications/notifications.controller.ts

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async getNotifications(@CurrentUser('id') userId: string, @Query('page') page = 1) {
    const offset = (+page - 1) * 20;
    const [data, [{ count }]] = await Promise.all([
      this.dataSource.query(
        'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20 OFFSET $2',
        [userId, offset],
      ),
      this.dataSource.query('SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false', [userId]),
    ]);
    return { data, meta: { page: +page, unread: +count } };
  }

  @Post('read-all')
  @HttpCode(200)
  async markAllRead(@CurrentUser('id') userId: string) {
    await this.dataSource.query(
      `UPDATE notifications SET is_read=true, read_at=NOW() WHERE user_id=$1 AND is_read=false`,
      [userId],
    );
    return { success: true };
  }

  @Put(':id/read')
  async markOneRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.dataSource.query(
      `UPDATE notifications SET is_read=true, read_at=NOW() WHERE id=$1 AND user_id=$2`,
      [id, userId],
    );
    return { success: true };
  }
}
