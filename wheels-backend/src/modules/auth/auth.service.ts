// backend/src/modules/auth/auth.service.ts
import {
  Injectable, UnauthorizedException, BadRequestException,
  ConflictException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { OtpService } from './otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ── OTP Login ─────────────────────────────────────────────

  async sendOtp(dto: SendOtpDto): Promise<{ message: string; expires_in: number }> {
    const phone = this.normalizePhone(dto.phone);

    // Rate limit: max 5 OTPs per phone per hour
    const rateLimitKey = `otp:ratelimit:${phone}`;
    const attempts = (await this.cache.get<number>(rateLimitKey)) || 0;
    if (attempts >= 5) {
      throw new BadRequestException('Too many OTP requests. Try again in 1 hour.');
    }

    const otp = this.generateOtp();
    const otpKey = `otp:${phone}`;

    // Store OTP in Redis with 5-minute TTL
    await this.cache.set(otpKey, { otp, attempts: 0 }, 300);
    await this.cache.set(rateLimitKey, attempts + 1, 3600);

    // Send via SMS provider
    await this.otpService.sendSms(phone, `Your wheels.com.pk verification code: ${otp}. Valid for 5 minutes.`);

    this.logger.log(`OTP sent to ${phone.slice(0, 7)}****`);

    // In dev mode, log OTP to console (NEVER in production)
    if (this.config.get('NODE_ENV') === 'development') {
      this.logger.debug(`[DEV] OTP for ${phone}: ${otp}`);
    }

    return { message: 'OTP sent successfully', expires_in: 300 };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponse> {
    const phone = this.normalizePhone(dto.phone);
    const otpKey = `otp:${phone}`;

    const stored = await this.cache.get<{ otp: string; attempts: number }>(otpKey);

    if (!stored) {
      throw new BadRequestException('OTP expired or not requested. Please request a new OTP.');
    }

    // Max 3 wrong attempts before invalidating
    if (stored.attempts >= 3) {
      await this.cache.del(otpKey);
      throw new BadRequestException('Too many wrong attempts. Please request a new OTP.');
    }

    if (stored.otp !== dto.otp) {
      await this.cache.set(otpKey, { ...stored, attempts: stored.attempts + 1 }, 300);
      throw new UnauthorizedException(`Incorrect OTP. ${2 - stored.attempts} attempts remaining.`);
    }

    // OTP verified — delete it
    await this.cache.del(otpKey);

    // Find or create user
    let user = await this.userRepo.findOne({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      user = this.userRepo.create({
        phone,
        phone_verified: true,
        full_name: dto.name || `User ${phone.slice(-4)}`,
        role: 'buyer',
      });
      await this.userRepo.save(user);
      this.logger.log(`New user registered: ${phone.slice(0, 7)}****`);
    } else {
      user.phone_verified = true;
      user.last_active_at = new Date();
      await this.userRepo.save(user);
    }

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
      is_new_user: isNewUser,
    };
  }

  // ── Google OAuth ──────────────────────────────────────────

  async googleLogin(dto: GoogleAuthDto): Promise<AuthResponse> {
    // Verify Google ID token
    const googleUser = await this.verifyGoogleToken(dto.id_token);

    let user = await this.userRepo.findOne({
      where: [{ google_id: googleUser.sub }, { email: googleUser.email }],
    });

    if (!user) {
      user = this.userRepo.create({
        google_id: googleUser.sub,
        email: googleUser.email,
        full_name: googleUser.name,
        avatar_url: googleUser.picture,
        email_verified: googleUser.email_verified,
        role: 'buyer',
      });
      await this.userRepo.save(user);
    } else {
      // Link Google ID to existing account
      if (!user.google_id) {
        user.google_id = googleUser.sub;
        await this.userRepo.save(user);
      }
    }

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user), is_new_user: false };
  }

  // ── Token Refresh ─────────────────────────────────────────

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const accessToken = this.jwtService.sign(
        { sub: user.id, phone: user.phone, role: user.role },
        { expiresIn: '1h' },
      );

      return { access_token: accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private async generateTokens(user: User) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '1h' }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      }),
    ]);

    return { access_token, refresh_token };
  }

  private generateOtp(): string {
    // 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private normalizePhone(phone: string): string {
    // Normalize Pakistan numbers: 03001234567 → +923001234567
    let normalized = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (normalized.startsWith('0')) {
      normalized = '+92' + normalized.slice(1);
    }
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    // Validate Pakistani mobile number
    if (!/^\+92[3][0-9]{9}$/.test(normalized)) {
      throw new BadRequestException('Invalid Pakistani mobile number format');
    }
    return normalized;
  }

  private sanitizeUser(user: User) {
    const { cnic_number, ...safe } = user as any;
    return safe;
  }

  private async verifyGoogleToken(idToken: string) {
    // In production: use google-auth-library to verify
    // const { OAuth2Client } = require('google-auth-library');
    // const client = new OAuth2Client(this.config.get('GOOGLE_CLIENT_ID'));
    // const ticket = await client.verifyIdToken({ idToken, audience: this.config.get('GOOGLE_CLIENT_ID') });
    // return ticket.getPayload();

    // Placeholder for development:
    throw new BadRequestException('Google verification not configured');
  }
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: Partial<User>;
  is_new_user: boolean;
}
