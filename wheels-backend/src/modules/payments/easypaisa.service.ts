// backend/src/modules/payments/easypaisa.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EasypaisaService {
  private readonly logger = new Logger(EasypaisaService.name);
  private readonly storeId: string;
  private readonly hashKey: string;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.storeId = config.get('EASYPAISA_STORE_ID');
    this.hashKey = config.get('EASYPAISA_HASH_KEY');
    this.isProduction = config.get('EASYPAISA_ENV') === 'production';
  }

  private get apiUrl(): string {
    return this.isProduction
      ? 'https://easypay.easypaisa.com.pk/tpg/v2/initiate-ma-transaction'
      : 'https://easypaystg.easypaisa.com.pk/tpg/v2/initiate-ma-transaction';
  }

  private generateHash(data: Record<string, string>): string {
    const sortedKeys = Object.keys(data).sort();
    const str = sortedKeys.map(k => `${k}=${data[k]}`).join('&');
    return crypto.createHmac('sha256', this.hashKey).update(str).digest('hex').toUpperCase();
  }

  async initiatePayment(params: {
    amount: number;
    orderId: string;
    customerPhone: string;
    description: string;
    returnUrl: string;
  }): Promise<{ success: boolean; paymentUrl?: string; token?: string; message: string }> {
    const orderRefNum = `WHLPK${params.orderId.replace(/-/g, '').slice(0, 15)}`;
    const amountStr = params.amount.toFixed(2);

    const requestData: Record<string, string> = {
      storeId: this.storeId,
      amount: amountStr,
      postBackURL: params.returnUrl,
      orderRefNum,
      expiryDate: this.getExpiryDate(),
      autoRedirect: '0',
      paymentMethod: 'MA_PAYMENT', // Mobile Account
      emailAddr: '',
      mobileNum: params.customerPhone.replace(/^0/, ''),
      tokenExpiry: '',
      merchantPaymentMethod: '',
    };

    requestData.hash = this.generateHash(requestData);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'credentials': Buffer.from(`${this.storeId}:${this.hashKey}`).toString('base64'),
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.responseCode === '0000') {
        return {
          success: true,
          paymentUrl: data.paymentUrl,
          token: data.token,
          message: 'Easypaisa payment initiated',
        };
      }

      return { success: false, message: data.responseDesc || 'Payment initiation failed' };
    } catch (error) {
      this.logger.error('Easypaisa API error:', error);
      throw new BadRequestException('Payment service temporarily unavailable');
    }
  }

  verifyCallback(params: Record<string, string>): boolean {
    const { hash, ...rest } = params;
    const expectedHash = this.generateHash(rest);
    return expectedHash === hash;
  }

  private getExpiryDate(): string {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}
