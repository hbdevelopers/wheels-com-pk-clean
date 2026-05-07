// backend/src/modules/ai/ai.controller.ts
import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/strategies/jwt.strategy';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('price-estimate')
  @UseGuards(OptionalJwtGuard)
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'AI price estimate for a vehicle' })
  estimatePrice(@Body() dto: { make: string; model: string; variant?: string; year: number; mileage: number; city: string; condition: string; features?: string[] }) {
    return this.aiService.estimatePrice(dto);
  }

  @Post('fraud-score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getFraudScore(@Body() dto: { vehicle_id: string }) {
    return this.aiService.detectFraud(dto.vehicle_id);
  }

  @Post('generate-title')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ medium: { limit: 20, ttl: 60000 } })
  generateTitle(@Body() dto: { make: string; model: string; variant?: string; year: number; color?: string; city: string; language?: string }) {
    return this.aiService.generateTitle(dto);
  }

  @Post('generate-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  generateDescription(@Body() dto: { make: string; model: string; variant?: string; year: number; mileage: number; color: string; features: string[]; condition: string; city: string; language: 'en' | 'ur' | 'roman_ur' }) {
    return this.aiService.generateDescription(dto);
  }

  @Post('chatbot')
  @UseGuards(OptionalJwtGuard)
  @Throttle({ medium: { limit: 30, ttl: 60000 } })
  chatbot(@Body() dto: { message: string; session_history?: Array<{ role: string; content: string }> }) {
    return this.aiService.chatbotMessage(dto.message, dto.session_history || []);
  }

  @Post('ocr-registration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ medium: { limit: 5, ttl: 60000 } })
  ocrRegistration(@Body() dto: { image_base64: string }) {
    return this.aiService.ocrRegistrationBook(dto.image_base64);
  }

  @Get('price-trends')
  priceTrends(@Query('make') make: string, @Query('model') model: string, @Query('year') year?: number) {
    return { make, model, year, message: 'Query price_trends table' };
  }
}
