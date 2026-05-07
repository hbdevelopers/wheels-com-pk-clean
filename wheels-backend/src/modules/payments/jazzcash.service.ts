// backend/src/modules/payments/jazzcash.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface JazzCashPaymentRequest {
  amount: number;           // in PKR (full amount, not paisa)
  orderId: string;          // unique order/transaction ID
  description: string;
  customerPhone: string;    // 03001234567
  customerEmail?: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface JazzCashResponse {
  success: boolean;
  redirectUrl?: string;     // for web redirect flow
  transactionId?: string;
  message: string;
  rawResponse?: any;
}

@Injectable()
export class JazzCashService {
  private readonly logger = new Logger(JazzCashService.name);
  private readonly merchantId: string;
  private readonly password: string;
  private readonly integrityKey: string;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.merchantId = config.get('JAZZCASH_MERCHANT_ID');
    this.password = config.get('JAZZCASH_PASSWORD');
    this.integrityKey = config.get('JAZZCASH_INTEGRITY_SALT');
    this.isProduction = config.get('JAZZCASH_ENV') === 'production';
  }

  private get baseUrl(): string {
    return this.isProduction
      ? 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform'
      : 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform';
  }

  private get mobileApiUrl(): string {
    return this.isProduction
      ? 'https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction'
      : 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction';
  }

  // ── Generate Secure Hash ──────────────────────────────────

  private generateSecureHash(params: Record<string, string>): string {
    // Sort keys alphabetically and concatenate values with '&'
    const sortedKeys = Object.keys(params).sort();
    const hashString = this.integrityKey + '&' +
      sortedKeys.map(k => params[k]).filter(Boolean).join('&');

    return crypto
      .createHmac('sha256', this.integrityKey)
      .update(hashString)
      .digest('hex');
  }

  // ── Web Redirect Payment (for web users) ─────────────────

  async initiateWebPayment(req: JazzCashPaymentRequest): Promise<JazzCashResponse> {
    const now = new Date();
    const txnDateTime = this.formatDateTime(now);
    const expiryDateTime = this.formatDateTime(new Date(now.getTime() + 30 * 60 * 1000)); // 30 min

    const amountPaisa = Math.round(req.amount * 100).toString(); // Convert to paisa

    const params: Record<string, string> = {
      pp_Version: '1.1',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: this.merchantId,
      pp_SubMerchantID: '',
      pp_Password: this.password,
      pp_BankID: 'TBANK',
      pp_ProductID: 'RETL',
      pp_TxnRefNo: `T${req.orderId.replace(/-/g, '').slice(0, 20)}`,
      pp_Amount: amountPaisa,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: `wheels-${req.orderId.slice(0, 12)}`,
      pp_Description: req.description.slice(0, 100),
      pp_TxnExpiryDateTime: expiryDateTime,
      pp_ReturnURL: req.returnUrl,
      pp_SecureHash: '',
      ppmpf_1: req.customerPhone,
      ppmpf_2: '',
      ppmpf_3: '',
      ppmpf_4: '',
      ppmpf_5: '',
    };

    // Generate hash (exclude pp_SecureHash itself)
    const { pp_SecureHash: _, ...hashParams } = params;
    params.pp_SecureHash = this.generateSecureHash(hashParams);

    this.logger.log(`JazzCash payment initiated: ${req.orderId} PKR ${req.amount}`);

    return {
      success: true,
      redirectUrl: `${this.baseUrl}?${new URLSearchParams(params).toString()}`,
      transactionId: params.pp_TxnRefNo,
      message: 'Redirect user to JazzCash payment page',
    };
  }

  // ── Mobile Wallet Direct Charge ───────────────────────────
  // For when user provides JazzCash MPIN in-app

  async chargeMobileWallet(params: {
    amount: number;
    orderId: string;
    customerPhone: string;   // JazzCash number
    mpin: string;            // User's JazzCash MPIN (encrypt in transit)
    description: string;
  }): Promise<JazzCashResponse> {
    const txnDateTime = this.formatDateTime(new Date());
    const amountPaisa = Math.round(params.amount * 100).toString();

    const requestBody = {
      pp_Version: '2.0',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: this.merchantId,
      pp_SubMerchantID: '',
      pp_Password: this.password,
      pp_MpinEnabled: '0',
      pp_MPIN: params.mpin,
      pp_TxnRefNo: `T${params.orderId.replace(/-/g, '').slice(0, 20)}`,
      pp_Amount: amountPaisa,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: `wheels-${params.orderId.slice(0, 12)}`,
      pp_Description: params.description,
      pp_TxnExpiryDateTime: this.formatDateTime(new Date(Date.now() + 30 * 60 * 1000)),
      pp_ReturnURL: '',
      pp_MobileNumber: params.customerPhone.replace(/^0/, '+92'),
      pp_CNIC: '',
      pp_SecureHash: '',
    };

    const { pp_SecureHash: _, ...hashParams } = requestBody;
    requestBody.pp_SecureHash = this.generateSecureHash(hashParams as any);

    try {
      const response = await fetch(this.mobileApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.pp_ResponseCode === '000') {
        return {
          success: true,
          transactionId: data.pp_TxnRefNo,
          message: 'Payment successful',
          rawResponse: data,
        };
      }

      return {
        success: false,
        message: this.getJazzCashErrorMessage(data.pp_ResponseCode),
        rawResponse: data,
      };
    } catch (error) {
      this.logger.error('JazzCash API call failed:', error);
      throw new BadRequestException('Payment service temporarily unavailable');
    }
  }

  // ── Verify Callback ───────────────────────────────────────
  // Called when JazzCash redirects back after payment

  verifyCallback(callbackParams: Record<string, string>): {
    verified: boolean; success: boolean; transactionId: string; amount: number;
  } {
    const { pp_SecureHash, pp_ResponseCode, pp_TxnRefNo, pp_Amount, ...rest } = callbackParams;

    // Recalculate hash
    const expectedHash = this.generateSecureHash(rest);

    if (expectedHash !== pp_SecureHash) {
      this.logger.warn(`JazzCash hash mismatch for tx ${pp_TxnRefNo}`);
      return { verified: false, success: false, transactionId: pp_TxnRefNo, amount: 0 };
    }

    return {
      verified: true,
      success: pp_ResponseCode === '000',
      transactionId: pp_TxnRefNo,
      amount: parseInt(pp_Amount || '0') / 100, // paisa to PKR
    };
  }

  // ── Helpers ───────────────────────────────────────────────

  private formatDateTime(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }

  private getJazzCashErrorMessage(code: string): string {
    const errors: Record<string, string> = {
      '001': 'Transaction declined',
      '007': 'Invalid merchant credentials',
      '009': 'Insufficient balance',
      '157': 'Invalid MPIN',
      '168': 'Transaction limit exceeded',
      '121': 'Invalid mobile number',
      '199': 'System error, please try again',
    };
    return errors[code] || `Payment failed (code: ${code})`;
  }
}
