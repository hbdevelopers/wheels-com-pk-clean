// backend/src/modules/dealers/dealers.service.ts
import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class DealersService {
  private readonly logger = new Logger(DealersService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  // ── Get Dealer Storefront ─────────────────────────────────

  async getDealerBySlug(slug: string) {
    const cacheKey = `dealer:${slug}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // In production with TypeORM:
    // const dealer = await this.dealerRepo.findOne({
    //   where: { slug, is_active: true },
    //   relations: ['user'],
    // });

    // Stub response for now:
    const dealer = {
      id: 'stub-id',
      slug,
      business_name: 'AutoMax Karachi',
      city: 'Karachi',
      is_verified: true,
      subscription_tier: 'professional',
      avg_rating: 4.9,
      total_listings: 47,
      total_sold: 312,
    };

    if (!dealer) throw new NotFoundException('Dealer not found');

    await this.cache.set(cacheKey, dealer, 300);
    return dealer;
  }

  // ── Submit Finance Lead ───────────────────────────────────

  async submitFinancingLead(data: {
    userId: string;
    vehicleId?: string;
    carName: string;
    price: number;
    name: string;
    phone: string;
    city: string;
    downPayment: number;
    tenureMonths: number;
    monthlyIncome?: number;
  }) {
    this.logger.log(`Finance lead: ${data.phone} for ${data.carName}`);

    // Save to leads table
    // await this.leadRepo.save({ ... });

    // Notify finance partners
    const partners = await this.getFinancePartners(data.city);
    for (const partner of partners) {
      await this.emailService.sendLeadToProvider(partner.email, {
        name: data.name,
        phone: data.phone,
        city: data.city,
        carName: data.carName,
        amount: data.price - data.downPayment,
        type: 'Financing',
      });
    }

    return {
      success: true,
      message: 'Your financing request has been submitted. A representative will call you within 2 hours.',
      estimated_monthly: this.calculateEMI(data.price - data.downPayment, data.tenureMonths),
      partners_contacted: partners.length,
    };
  }

  // ── Submit Insurance Lead ─────────────────────────────────

  async submitInsuranceLead(data: {
    userId: string;
    vehicleId: string;
    make: string;
    model: string;
    year: number;
    price: number;
    name: string;
    phone: string;
    city: string;
  }) {
    this.logger.log(`Insurance lead: ${data.phone} for ${data.make} ${data.model}`);

    const estimatedPremium = this.estimateInsurancePremium(data.price, data.year);

    return {
      success: true,
      message: 'Insurance quotes will be sent to your number within 30 minutes.',
      estimated_annual_premium_min: estimatedPremium.min,
      estimated_annual_premium_max: estimatedPremium.max,
      providers: ['Adamjee Insurance', 'EFU General', 'TPL Insurance', 'Jubilee General'],
    };
  }

  // ── Submit Mechanic Booking ───────────────────────────────

  async bookMechanic(data: {
    userId: string;
    vehicleId?: string;
    issueDescription: string;
    preferredDate: string;
    city: string;
    address: string;
    name: string;
    phone: string;
  }) {
    return {
      success: true,
      booking_id: `MEC-${Date.now()}`,
      message: 'Mechanic booking confirmed. You will be contacted to confirm the appointment.',
      estimated_arrival: '2-4 hours after confirmation',
    };
  }

  // ── Dealer Subscription Packages ─────────────────────────

  getSubscriptionPackages() {
    return [
      {
        tier: 'free',
        name: 'Free',
        name_ur: 'مفت',
        price_monthly: 0,
        price_annual: 0,
        features: {
          listings: 5,
          featured_listings: 0,
          photo_limit: 10,
          ai_descriptions: 0,
          boost_credits: 0,
          whatsapp_routing: false,
          crm_access: false,
          analytics: false,
          priority_support: false,
        },
      },
      {
        tier: 'basic',
        name: 'Basic',
        name_ur: 'بنیادی',
        price_monthly: 2999,
        price_annual: 29990,
        features: {
          listings: 25,
          featured_listings: 2,
          photo_limit: 20,
          ai_descriptions: 10,
          boost_credits: 3,
          whatsapp_routing: true,
          crm_access: false,
          analytics: 'basic',
          priority_support: false,
        },
      },
      {
        tier: 'professional',
        name: 'Professional',
        name_ur: 'پیشہ ورانہ',
        price_monthly: 7999,
        price_annual: 79990,
        popular: true,
        features: {
          listings: 100,
          featured_listings: 10,
          photo_limit: 20,
          ai_descriptions: 'unlimited',
          boost_credits: 15,
          whatsapp_routing: true,
          crm_access: true,
          analytics: 'full',
          priority_support: true,
          verified_badge: true,
        },
      },
      {
        tier: 'enterprise',
        name: 'Enterprise',
        name_ur: 'ادارہ جاتی',
        price_monthly: 19999,
        price_annual: 199990,
        features: {
          listings: 'unlimited',
          featured_listings: 'unlimited',
          photo_limit: 30,
          ai_descriptions: 'unlimited',
          boost_credits: 50,
          whatsapp_routing: true,
          crm_access: true,
          analytics: 'full',
          priority_support: '24/7',
          verified_badge: true,
          dedicated_manager: true,
          api_access: true,
          custom_storefront: true,
        },
      },
    ];
  }

  // ── Helpers ───────────────────────────────────────────────

  private calculateEMI(principal: number, months: number, annualRate = 22): number {
    const r = annualRate / 100 / 12;
    const emi = principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
    return Math.round(emi);
  }

  private estimateInsurancePremium(vehicleValue: number, year: number) {
    const age = new Date().getFullYear() - year;
    const depreciation = Math.max(0.4, 1 - age * 0.1);
    const insuredValue = vehicleValue * depreciation;
    return {
      min: Math.round(insuredValue * 0.025),
      max: Math.round(insuredValue * 0.04),
    };
  }

  private async getFinancePartners(city: string) {
    // In production: query finance_partners table filtered by city
    return [
      { name: 'Meezan Bank', email: 'auto@meezanbank.com' },
      { name: 'Bank Alfalah', email: 'autofinance@bankalfalah.com' },
      { name: 'HBL Car Finance', email: 'carloan@hbl.com' },
    ];
  }
}
