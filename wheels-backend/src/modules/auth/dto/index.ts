// backend/src/modules/auth/dto/send-otp.dto.ts
import { IsString, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '03001234567', description: 'Pakistani mobile number' })
  @IsString()
  @Matches(/^(\+92|0)[3][0-9]{9}$/, {
    message: 'Must be a valid Pakistani mobile number (e.g., 03001234567)',
  })
  phone: string;
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/auth/dto/verify-otp.dto.ts
import { IsString, Length, IsOptional as IO2 } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '03001234567' })
  @IsString()
  @Matches(/^(\+92|0)[3][0-9]{9}$/)
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @ApiProperty({ example: 'Ahmed Raza', required: false })
  @IO2()
  @IsString()
  name?: string;
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/auth/dto/google-auth.dto.ts
export class GoogleAuthDto {
  @ApiProperty()
  @IsString()
  id_token: string;
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/auth/dto/refresh-token.dto.ts
export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refresh_token: string;
}
