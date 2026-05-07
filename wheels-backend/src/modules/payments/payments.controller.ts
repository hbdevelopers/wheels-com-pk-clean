// backend/src/modules/payments/payments.controller.ts
import {
  Controller, Post, Get, Body, Query, Res,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JazzCashService } from './jazzcash.service';
import { EasypaisaService } from './easypaisa.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly jazzCash: JazzCashService,
    private readonly easyPaisa: EasypaisaService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Post('boost/jazzcash')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate JazzCash payment for listing boost' })
  async boostWithJazzCash(
    @CurrentUser('id') userId: string,
    @Body() dto: { vehicle_id: string; package: '3day' | '7day' | '30day'; return_url: string },
  ) {
    const packages = { '3day': 500, '7day': 999, '30day': 2999 };
    const amount = packages[dto.package];
    const orderId = uuidv4();
    await this.dataSource.query(
      `INSERT INTO transactions (user_id, reference_id, reference_type, amount, payment_method, payment_status, description)
       VALUES ($1,$2,'boost',$3,'jazzcash','pending',$4)`,
      [userId, dto.vehicle_id, amount, `${dto.package} boost`],
    );
    return this.jazzCash.initiateWebPayment({ amount, orderId, description: `Listing boost — ${dto.package}`, customerPhone: '', returnUrl: dto.return_url, cancelUrl: dto.return_url });
  }

  @Post('boost/easypaisa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async boostWithEasyPaisa(
    @CurrentUser('id') userId: string,
    @Body() dto: { vehicle_id: string; package: '3day' | '7day' | '30day'; phone: string; return_url: string },
  ) {
    const packages = { '3day': 500, '7day': 999, '30day': 2999 };
    return this.easyPaisa.initiatePayment({ amount: packages[dto.package], orderId: uuidv4(), customerPhone: dto.phone, description: `${dto.package} listing boost`, returnUrl: dto.return_url });
  }

  @Post('subscription/jazzcash')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async subscribeWithJazzCash(
    @CurrentUser('id') userId: string,
    @Body() dto: { tier: 'basic' | 'professional' | 'enterprise'; return_url: string },
  ) {
    const prices = { basic: 2999, professional: 7999, enterprise: 19999 };
    return this.jazzCash.initiateWebPayment({ amount: prices[dto.tier], orderId: uuidv4(), description: `wheels.com.pk ${dto.tier} dealer subscription`, customerPhone: '', returnUrl: dto.return_url, cancelUrl: dto.return_url });
  }

  @Get('jazzcash/callback')
  @HttpCode(200)
  async jazzCashCallback(@Query() params: Record<string, string>, @Res() res: Response) {
    const result = this.jazzCash.verifyCallback(params);
    if (result.verified && result.success) {
      await this.dataSource.query(
        `UPDATE transactions SET payment_status='completed', gateway_transaction_id=$1 WHERE payment_status='pending' AND amount=$2 ORDER BY created_at DESC LIMIT 1`,
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
      'SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [userId],
    );
  }
}
