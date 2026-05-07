// backend/src/modules/users/users.service.ts
import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { User } from './entities/user.entity';
import { UploadsService } from '../uploads/uploads.service';
import { R2Service } from '../uploads/r2.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ── Get public profile ────────────────────────────────────

  async getPublicProfile(userId: string, viewerId?: string) {
    const cacheKey = `profile:${userId}`;
    const cached = await this.cache.get(cacheKey);

    const user = cached || await this.userRepo.findOne({
      where: { id: userId, is_active: true },
      select: [
        'id', 'full_name', 'username', 'avatar_url', 'bio', 'role',
        'city', 'cnic_verified', 'phone_verified', 'trust_score',
        'avg_rating', 'total_reviews', 'total_listings', 'total_sold',
        'followers_count', 'following_count', 'created_at',
      ],
    });

    if (!user) throw new NotFoundException('User not found');

    // Get user's active listings count
    const [{ count: activeListings }] = await this.dataSource.query(
      `SELECT COUNT(*) FROM vehicles WHERE seller_id = $1 AND status IN ('active', 'boosted')`,
      [userId],
    );

    // Is viewer following this user?
    let isFollowing = false;
    if (viewerId && viewerId !== userId) {
      const [follow] = await this.dataSource.query(
        'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2',
        [viewerId, userId],
      );
      isFollowing = !!follow;
    }

    // Get badges
    const badges = await this.dataSource.query(
      'SELECT badge_type, awarded_at FROM user_badges WHERE user_id = $1',
      [userId],
    );

    const profile = { ...user, activeListings: +activeListings, isFollowing, badges };
    await this.cache.set(cacheKey, profile, 300);
    return profile;
  }

  // ── Update own profile ────────────────────────────────────

  async updateProfile(userId: string, dto: {
    full_name?: string;
    username?: string;
    bio?: string;
    city?: string;
    preferred_language?: string;
    push_token?: string;
  }) {
    if (dto.username) {
      const existing = await this.userRepo.findOne({ where: { username: dto.username } });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Username already taken');
      }
    }

    await this.userRepo.update(userId, dto);
    await this.cache.del(`profile:${userId}`);

    return this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'full_name', 'username', 'bio', 'city', 'avatar_url', 'preferred_language'],
    });
  }

  // ── Upload avatar ─────────────────────────────────────────

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const r2 = new R2Service(null as any); // injected properly in production
    const { url } = await r2.uploadImage(file, 'avatars', { width: 400, generateThumbnail: false });
    await this.userRepo.update(userId, { avatar_url: url });
    await this.cache.del(`profile:${userId}`);
    return { avatar_url: url };
  }

  // ── Follow / Unfollow ─────────────────────────────────────

  async followUser(followerId: string, targetId: string): Promise<{ following: boolean }> {
    if (followerId === targetId) throw new BadRequestException('Cannot follow yourself');

    const target = await this.userRepo.findOne({ where: { id: targetId } });
    if (!target) throw new NotFoundException('User not found');

    const [existing] = await this.dataSource.query(
      'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, targetId],
    );

    if (existing) {
      // Unfollow
      await this.dataSource.query(
        'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, targetId],
      );
      await this.userRepo.decrement({ id: followerId }, 'following_count', 1);
      await this.userRepo.decrement({ id: targetId }, 'followers_count', 1);
      return { following: false };
    } else {
      // Follow
      await this.dataSource.query(
        'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [followerId, targetId],
      );
      await this.userRepo.increment({ id: followerId }, 'following_count', 1);
      await this.userRepo.increment({ id: targetId }, 'followers_count', 1);
      return { following: true };
    }
  }

  // ── Leave review ──────────────────────────────────────────

  async leaveReview(reviewerId: string, reviewedId: string, dto: {
    rating: number; comment?: string; listing_id?: string;
  }) {
    if (reviewerId === reviewedId) throw new BadRequestException('Cannot review yourself');

    const [existing] = await this.dataSource.query(
      'SELECT 1 FROM user_reviews WHERE reviewer_id = $1 AND reviewed_id = $2 AND listing_id = $3',
      [reviewerId, reviewedId, dto.listing_id || null],
    );
    if (existing) throw new BadRequestException('You have already reviewed this transaction');

    await this.dataSource.query(
      `INSERT INTO user_reviews (reviewer_id, reviewed_id, listing_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [reviewerId, reviewedId, dto.listing_id || null, dto.rating, dto.comment],
    );

    // Recalculate avg rating
    const [{ avg, count }] = await this.dataSource.query(
      'SELECT AVG(rating)::numeric(3,2) as avg, COUNT(*) as count FROM user_reviews WHERE reviewed_id = $1',
      [reviewedId],
    );

    await this.userRepo.update(reviewedId, {
      avg_rating: parseFloat(avg),
      total_reviews: parseInt(count),
    });

    await this.cache.del(`profile:${reviewedId}`);
    return { success: true };
  }

  // ── Get user reviews ──────────────────────────────────────

  async getUserReviews(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const reviews = await this.dataSource.query(
      `SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
       FROM user_reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewed_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return reviews;
  }

  // ── Submit CNIC for verification ──────────────────────────

  async submitCnic(userId: string, cnicData: {
    cnic_number: string;
    front_image_base64: string;
    back_image_base64: string;
  }) {
    const cleaned = cnicData.cnic_number.replace(/-/g, '');
    if (!/^\d{13}$/.test(cleaned)) {
      throw new BadRequestException('Invalid CNIC format. Must be 13 digits.');
    }

    // Check for duplicate CNIC
    const [existing] = await this.dataSource.query(
      'SELECT id FROM users WHERE cnic_number = $1 AND id != $2',
      [cleaned, userId],
    );
    if (existing) throw new BadRequestException('CNIC already registered to another account');

    // Save CNIC number (encrypted in production via DB column encryption or application-level AES)
    await this.userRepo.update(userId, { cnic_number: cleaned });

    // In production: submit to NADRA API or manual review queue
    // For now: log for admin review
    this.logger.log(`CNIC verification submitted for user ${userId}`);

    // Award badge after manual approval (admin flow):
    // await this.awardBadge(userId, 'cnic_verified');

    return {
      success: true,
      message: 'CNIC submitted for verification. Usually approved within 24 hours.',
      status: 'pending_review',
    };
  }

  // ── Admin: approve CNIC ───────────────────────────────────

  async approveCnic(userId: string, adminId: string): Promise<void> {
    await this.userRepo.update(userId, { cnic_verified: true });
    await this.dataSource.query(
      `INSERT INTO user_badges (user_id, badge_type) VALUES ($1, 'cnic_verified')
       ON CONFLICT (user_id, badge_type) DO NOTHING`,
      [userId],
    );

    // Recalculate trust score
    await this.recalculateTrustScore(userId);
    await this.cache.del(`profile:${userId}`);
    this.logger.log(`CNIC approved for user ${userId} by admin ${adminId}`);
  }

  // ── Trust score recalculation ─────────────────────────────

  async recalculateTrustScore(userId: string): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return 0;

    let score = 30; // base score
    if (user.phone_verified) score += 20;
    if (user.email_verified) score += 10;
    if (user.cnic_verified) score += 25;
    if (user.avg_rating >= 4.5 && user.total_reviews >= 5) score += 10;
    if (user.total_sold >= 3) score += 5;

    score = Math.min(100, score);
    await this.userRepo.update(userId, { trust_score: score });
    return score;
  }

  // ── Saved searches ────────────────────────────────────────

  async getSavedSearches(userId: string) {
    return this.dataSource.query(
      'SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
  }

  async createSavedSearch(userId: string, dto: { name?: string; filters: Record<string, any>; alert_frequency?: string }) {
    const [search] = await this.dataSource.query(
      `INSERT INTO saved_searches (user_id, name, filters, alert_frequency)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, dto.name, JSON.stringify(dto.filters), dto.alert_frequency || 'daily'],
    );
    return search;
  }

  async deleteSavedSearch(searchId: string, userId: string): Promise<void> {
    const result = await this.dataSource.query(
      'DELETE FROM saved_searches WHERE id = $1 AND user_id = $2',
      [searchId, userId],
    );
    if (!result[1]) throw new NotFoundException('Saved search not found');
  }

  // ── Referral stats ────────────────────────────────────────

  async getReferralStats(userId: string) {
    const [user] = await this.userRepo.findByIds([userId]);
    const [{ count }] = await this.dataSource.query(
      'SELECT COUNT(*) FROM referrals WHERE referrer_id = $1',
      [userId],
    );
    return {
      referral_code: user?.referral_code,
      referral_url: `https://wheels.com.pk/join?ref=${user?.referral_code}`,
      total_referrals: parseInt(count),
      reward_per_referral: 'PKR 200 listing credit',
    };
  }
}
