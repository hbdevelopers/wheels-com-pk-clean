// backend/src/modules/forum/forum.controller.ts
import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { IsString, IsOptional, Length, IsArray } from 'class-validator';

class CreatePostDto {
  @IsString() @Length(10, 300) title: string;
  @IsString() @Length(20, 5000) body: string;
  @IsString() category: string;
  @IsOptional() @IsArray() tags?: string[];
}

class CreateReplyDto {
  @IsString() @Length(2, 2000) body: string;
}

@ApiTags('Forum')
@Controller('forum')
export class ForumController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // ── Posts ─────────────────────────────────────────────────
  @Get('posts')
  @UseGuards(OptionalJwtGuard)
  async getPosts(
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('sort') sort = 'latest',
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const offset = (+page - 1) * +limit;
    let where = `WHERE fp.deleted_at IS NULL`;
    const params: any[] = [];

    if (category && category !== 'all') {
      where += ` AND fp.category = $${params.length + 1}`;
      params.push(category);
    }
    if (q) {
      where += ` AND (fp.title ILIKE $${params.length + 1} OR fp.body ILIKE $${params.length + 1})`;
      params.push(`%${q}%`);
    }

    const orderBy = sort === 'popular'
      ? 'fp.likes_count DESC, fp.view_count DESC'
      : sort === 'hot'
      ? `(fp.replies_count * 2 + fp.likes_count) / POWER(EXTRACT(EPOCH FROM (NOW() - fp.created_at)) / 3600 + 2, 1.5) DESC`
      : 'fp.is_pinned DESC, fp.created_at DESC';

    params.push(+limit, offset);

    const [posts, [{ total }]] = await Promise.all([
      this.db.query(
        `SELECT fp.*,
           u.full_name as author_name, u.avatar_url as author_avatar,
           u.city as author_city, u.cnic_verified as author_verified
         FROM forum_posts fp
         JOIN users u ON u.id = fp.author_id
         ${where}
         ORDER BY ${orderBy}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      this.db.query(`SELECT COUNT(*) as total FROM forum_posts fp ${where}`, params.slice(0, -2)),
    ]);

    return { data: posts, meta: { total: +total, page: +page, limit: +limit } };
  }

  @Get('posts/:id')
  @UseGuards(OptionalJwtGuard)
  async getPost(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId?: string) {
    const [post] = await this.db.query(
      `SELECT fp.*, u.full_name as author_name, u.avatar_url as author_avatar,
         u.city as author_city, u.cnic_verified as author_verified,
         CASE WHEN fl.user_id IS NOT NULL THEN true ELSE false END as liked_by_me
       FROM forum_posts fp
       JOIN users u ON u.id = fp.author_id
       LEFT JOIN forum_likes fl ON fl.post_id = fp.id AND fl.user_id = $2
       WHERE fp.id = $1 AND fp.deleted_at IS NULL`,
      [id, userId || '00000000-0000-0000-0000-000000000000'],
    );
    if (!post) throw new Error('Post not found');

    // Increment view count
    await this.db.query('UPDATE forum_posts SET view_count = view_count + 1 WHERE id = $1', [id]);

    const replies = await this.db.query(
      `SELECT fr.*, u.full_name as author_name, u.avatar_url as author_avatar, u.cnic_verified as author_verified
       FROM forum_replies fr
       JOIN users u ON u.id = fr.author_id
       WHERE fr.post_id = $1 AND fr.deleted_at IS NULL
       ORDER BY fr.created_at ASC`,
      [id],
    );

    return { ...post, replies };
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPost(@CurrentUser('id') userId: string, @Body() dto: CreatePostDto) {
    const [post] = await this.db.query(
      `INSERT INTO forum_posts (id, author_id, title, body, category, tags)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uuidv4(), userId, dto.title, dto.body, dto.category, JSON.stringify(dto.tags || [])],
    );
    return post;
  }

  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async toggleLike(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    const [existing] = await this.db.query(
      'SELECT 1 FROM forum_likes WHERE post_id = $1 AND user_id = $2', [id, userId],
    );
    if (existing) {
      await this.db.query('DELETE FROM forum_likes WHERE post_id=$1 AND user_id=$2', [id, userId]);
      await this.db.query('UPDATE forum_posts SET likes_count = likes_count - 1 WHERE id=$1', [id]);
      return { liked: false };
    }
    await this.db.query('INSERT INTO forum_likes (post_id, user_id) VALUES ($1,$2)', [id, userId]);
    await this.db.query('UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id=$1', [id]);
    return { liked: true };
  }

  @Post('posts/:id/replies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createReply(
    @Param('id', ParseUUIDPipe) postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReplyDto,
  ) {
    const [reply] = await this.db.query(
      'INSERT INTO forum_replies (id, post_id, author_id, body) VALUES ($1,$2,$3,$4) RETURNING *',
      [uuidv4(), postId, userId, dto.body],
    );
    await this.db.query('UPDATE forum_posts SET replies_count = replies_count + 1 WHERE id=$1', [postId]);
    return reply;
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    const [post] = await this.db.query('SELECT author_id FROM forum_posts WHERE id=$1', [id]);
    if (!post) throw new Error('Post not found');
    if (post.author_id !== userId && !['admin', 'moderator'].includes(role)) throw new Error('Forbidden');
    await this.db.query('UPDATE forum_posts SET deleted_at=NOW() WHERE id=$1', [id]);
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/vehicles/vehicles-extra.controller.ts
// Saved listings, Reports, Reels/Videos

@ApiTags('Saved & Reports')
@Controller('users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get('saved')
  async getSaved(@CurrentUser('id') userId: string, @Query('page') page = 1) {
    const offset = (+page - 1) * 20;
    const items = await this.db.query(
      `SELECT v.*, vi.thumbnail_url as image, sl.created_at as saved_at
       FROM saved_listings sl
       JOIN vehicles v ON v.id = sl.vehicle_id
       LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_primary = true
       WHERE sl.user_id = $1 AND v.deleted_at IS NULL
       ORDER BY sl.created_at DESC
       LIMIT 20 OFFSET $2`,
      [userId, offset],
    );
    return { data: items, page: +page };
  }

  @Post('saved/:vehicleId')
  @HttpCode(HttpStatus.OK)
  async toggleSaved(@CurrentUser('id') userId: string, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    const [existing] = await this.db.query(
      'SELECT 1 FROM saved_listings WHERE user_id=$1 AND vehicle_id=$2', [userId, vehicleId],
    );
    if (existing) {
      await this.db.query('DELETE FROM saved_listings WHERE user_id=$1 AND vehicle_id=$2', [userId, vehicleId]);
      await this.db.query('UPDATE vehicles SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id=$1', [vehicleId]);
      return { saved: false };
    }
    await this.db.query('INSERT INTO saved_listings (user_id, vehicle_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, vehicleId]);
    await this.db.query('UPDATE vehicles SET favorite_count = favorite_count + 1 WHERE id=$1', [vehicleId]);
    return { saved: true };
  }
}

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a listing or user' })
  async createReport(
    @CurrentUser('id') userId: string,
    @Body() dto: {
      reported_vehicle_id?: string;
      reported_user_id?: string;
      report_type: 'fraud' | 'spam' | 'misleading' | 'inappropriate' | 'other';
      description: string;
    },
  ) {
    const [report] = await this.db.query(
      `INSERT INTO reports (id, reporter_id, reported_vehicle_id, reported_user_id, report_type, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [uuidv4(), userId, dto.reported_vehicle_id || null, dto.reported_user_id || null, dto.report_type, dto.description],
    );

    // If enough fraud reports, auto-flag the listing
    if (dto.reported_vehicle_id) {
      const [{ count }] = await this.db.query(
        `SELECT COUNT(*) FROM reports WHERE reported_vehicle_id=$1 AND report_type='fraud' AND created_at > NOW() - INTERVAL '7 days'`,
        [dto.reported_vehicle_id],
      );
      if (parseInt(count) >= 3) {
        await this.db.query(
          'UPDATE vehicles SET fraud_risk_score = LEAST(100, fraud_risk_score + 20) WHERE id=$1',
          [dto.reported_vehicle_id],
        );
      }
    }

    return { success: true, report_id: report.id, message: 'Report submitted. Our team will review within 24 hours.' };
  }
}

// ─────────────────────────────────────────────────────────────
// Referral controller

@ApiTags('Referrals')
@Controller('referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralsController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    const [user] = await this.db.query('SELECT referral_code FROM users WHERE id=$1', [userId]);
    const [{ count }] = await this.db.query(
      'SELECT COUNT(*) FROM referrals WHERE referrer_id=$1', [userId],
    );
    const [{ paid }] = await this.db.query(
      `SELECT COUNT(*) as paid FROM referrals WHERE referrer_id=$1 AND reward_paid=true`, [userId],
    );
    return {
      referral_code: user?.referral_code,
      referral_url: `https://wheels.com.pk/join?ref=${user?.referral_code}`,
      total_referrals: parseInt(count),
      paid_rewards: parseInt(paid),
      pending_rewards: parseInt(count) - parseInt(paid),
      reward_per_referral: 'PKR 200 listing credit',
      share_message: `Join wheels.com.pk — Pakistan's smartest car marketplace! Use my code ${user?.referral_code} to get started. https://wheels.com.pk/join?ref=${user?.referral_code}`,
    };
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  async applyReferral(@CurrentUser('id') userId: string, @Body() dto: { referral_code: string }) {
    const [referrer] = await this.db.query(
      'SELECT id FROM users WHERE referral_code=$1 AND id != $2', [dto.referral_code, userId],
    );
    if (!referrer) return { success: false, message: 'Invalid referral code' };

    const [existing] = await this.db.query('SELECT 1 FROM referrals WHERE referred_id=$1', [userId]);
    if (existing) return { success: false, message: 'Referral already applied' };

    await this.db.query(
      'INSERT INTO referrals (id, referrer_id, referred_id, reward_amount) VALUES ($1,$2,$3,200)',
      [uuidv4(), referrer.id, userId],
    );
    await this.db.query('UPDATE users SET referred_by=$1 WHERE id=$2', [referrer.id, userId]);

    return { success: true, message: 'Referral applied! Your referrer will receive a PKR 200 credit.' };
  }
}

// ─────────────────────────────────────────────────────────────
// Reels / Videos controller

@ApiTags('Reels')
@Controller('reels')
export class ReelsController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  async getReels(@Query('page') page = 1, @Query('limit') limit = 10) {
    const offset = (+page - 1) * +limit;
    const reels = await this.db.query(
      `SELECT vv.*, v.title, v.make, v.model, v.year, v.price, v.city,
         u.full_name as seller_name, u.avatar_url as seller_avatar,
         vi.thumbnail_url as vehicle_thumbnail
       FROM vehicle_videos vv
       JOIN vehicles v ON v.id = vv.vehicle_id
       JOIN users u ON u.id = v.seller_id
       LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_primary = true
       WHERE v.status IN ('active','boosted') AND vv.url IS NOT NULL
       ORDER BY vv.created_at DESC
       LIMIT $1 OFFSET $2`,
      [+limit, offset],
    );
    return { data: reels, meta: { page: +page, limit: +limit } };
  }
}
