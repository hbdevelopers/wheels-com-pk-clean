// backend/src/modules/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
  ) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  // ── AI Price Estimator ────────────────────────────────────

  async estimatePrice(params: {
    make: string; model: string; variant?: string;
    year: number; mileage: number; city: string;
    condition: string; features?: string[];
  }): Promise<{ min: number; max: number; suggested: number; confidence: number; reasoning: string }> {

    const cacheKey = `price:${params.make}:${params.model}:${params.year}:${params.mileage}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    // Get recent comparable sales from DB
    const comparables = await this.vehicleRepo
      .createQueryBuilder('v')
      .select(['v.price', 'v.mileage', 'v.year', 'v.condition_type', 'v.city'])
      .where('LOWER(v.make) = LOWER(:make)', { make: params.make })
      .andWhere('LOWER(v.model) = LOWER(:model)', { model: params.model })
      .andWhere('v.year BETWEEN :minYear AND :maxYear', {
        minYear: params.year - 1, maxYear: params.year + 1,
      })
      .andWhere('v.status IN (:...s)', { s: ['active', 'sold', 'boosted'] })
      .andWhere('v.created_at > NOW() - INTERVAL \'90 days\'')
      .limit(20)
      .getMany();

    const prompt = `You are an expert Pakistani used car valuation AI for wheels.com.pk.

Vehicle Details:
- Make: ${params.make}
- Model: ${params.model}
- Variant: ${params.variant || 'Standard'}
- Year: ${params.year}
- Mileage: ${params.mileage} km
- City: ${params.city}
- Condition: ${params.condition}
- Features: ${params.features?.join(', ') || 'Standard'}

Recent comparable listings in Pakistan:
${comparables.map(c => `PKR ${c.price} | ${c.year} | ${c.mileage}km | ${c.city}`).join('\n') || 'No recent data'}

Analyze the Pakistani automotive market conditions and provide a price estimate.
Consider: local market demand, imported vs local assembly, fuel type demand, city-specific pricing.

Respond ONLY with this JSON (no markdown):
{
  "min": <number in PKR>,
  "max": <number in PKR>,
  "suggested": <number in PKR>,
  "confidence": <0-100>,
  "reasoning": "<2 sentences in English explaining the estimate>"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });

      const text = response.choices[0].message.content.trim();
      const result = JSON.parse(text.replace(/```json|```/g, '').trim());

      await this.cache.set(cacheKey, result, 3600); // cache 1 hour
      return result;
    } catch (error) {
      this.logger.error('Price estimation failed:', error);
      // Fallback: simple calculation based on comparables
      return this.fallbackPriceEstimate(params, comparables);
    }
  }

  // ── AI Fraud Detector ─────────────────────────────────────

  async detectFraud(vehicleId: string): Promise<{
    score: number; flags: string[]; verdict: string;
  }> {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId },
      relations: ['seller'],
    });

    if (!vehicle) return { score: 0, flags: [], verdict: 'unknown' };

    const flags: string[] = [];
    let score = 0;

    // Rule-based checks (fast, no API cost)
    const avgPrice = await this.getAvgMarketPrice(vehicle.make, vehicle.model, vehicle.year);

    if (avgPrice && vehicle.price < avgPrice * 0.5) {
      flags.push('Price is unusually low (>50% below market average)');
      score += 35;
    }

    if (!vehicle.seller?.phone_verified) {
      flags.push('Seller phone not verified');
      score += 15;
    }

    if (!vehicle.seller?.cnic_verified) {
      flags.push('Seller CNIC not verified');
      score += 10;
    }

    if (vehicle.mileage > 0 && vehicle.year >= 2022 && vehicle.mileage > 100000) {
      flags.push('Unusually high mileage for a newer vehicle');
      score += 20;
    }

    if (vehicle.seller && vehicle.seller.total_listings > 10 && vehicle.seller.avg_rating < 3) {
      flags.push('Seller has low rating with multiple listings');
      score += 15;
    }

    if (vehicle.description && vehicle.description.length < 30) {
      flags.push('Very short or missing description');
      score += 5;
    }

    const verdict = score < 20 ? 'low_risk' : score < 50 ? 'medium_risk' : 'high_risk';

    // Update the listing's fraud score
    await this.vehicleRepo.update(vehicleId, {
      fraud_risk_score: Math.min(100, score),
      ai_fraud_flags: flags,
    });

    return { score: Math.min(100, score), flags, verdict };
  }

  // ── AI Title Generator ────────────────────────────────────

  async generateTitle(params: {
    make: string; model: string; variant?: string;
    year: number; color?: string; city: string; language?: string;
  }): Promise<{ title_en: string; title_ur: string }> {

    const prompt = `Generate a compelling, SEO-friendly car listing title for a Pakistani automotive marketplace (wheels.com.pk).

Car: ${params.year} ${params.make} ${params.model} ${params.variant || ''}
Color: ${params.color || 'N/A'}
City: ${params.city}

Rules:
- English title: 60-80 chars, include year, make, model, and city
- Urdu title: Translate meaningfully, not literally
- Be specific and trustworthy, no hype words like "AMAZING" or "MUST SEE"

Respond ONLY with JSON:
{"title_en": "...", "title_ur": "..."}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    const text = response.choices[0].message.content.trim();
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  }

  // ── AI Description Writer ─────────────────────────────────

  async generateDescription(params: {
    make: string; model: string; variant?: string; year: number;
    mileage: number; color: string; features: string[];
    condition: string; city: string; language: 'en' | 'ur' | 'roman_ur';
  }): Promise<string> {

    const langInstructions = {
      en: 'Write in clear, professional English.',
      ur: 'Write entirely in Urdu script (اردو).',
      roman_ur: 'Write in Roman Urdu (Urdu words in English letters), like how Pakistanis text.',
    };

    const prompt = `Write a compelling, honest vehicle listing description for a Pakistani automotive marketplace.

${params.year} ${params.make} ${params.model} ${params.variant || ''}
Mileage: ${params.mileage} km | Color: ${params.color} | City: ${params.city}
Condition: ${params.condition}
Features: ${params.features.join(', ')}

${langInstructions[params.language]}
Length: 3-4 paragraphs. Include condition highlights, features, and honest assessment.
Do NOT use ALL CAPS or excessive punctuation.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 400,
    });

    return response.choices[0].message.content.trim();
  }

  // ── AI Chatbot ────────────────────────────────────────────

  async chatbotMessage(
    message: string,
    sessionHistory: Array<{ role: string; content: string }>,
  ): Promise<{ reply: string; suggested_searches?: string[] }> {

    const systemPrompt = `You are a helpful AI assistant for wheels.com.pk, Pakistan's premium automotive marketplace.

You help users:
- Find the right car based on budget and needs
- Understand car prices in Pakistan (PKR)
- Compare different models
- Understand financing options
- Know about car inspection importance
- Navigate the marketplace

Pakistan context:
- Popular cars: Toyota Corolla, Honda Civic, Suzuki Alto/Cultus, Hyundai Tucson, Kia Sportage
- Currency: PKR (Pakistani Rupee). 1 lac = 100,000. 1 crore = 10 million.
- Major cities: Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad
- You can respond in English or Urdu based on user's language

When suggesting cars, always end with actionable next steps like "Search for X on wheels.com.pk".
Keep responses concise (under 150 words).`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...sessionHistory.slice(-6).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = response.choices[0].message.content.trim();

    // Extract suggested searches from the reply
    const searchMatches = reply.match(/search for ([^.]+)/gi) || [];
    const suggested_searches = searchMatches.map(m => m.replace(/search for /i, '').trim()).slice(0, 3);

    return { reply, suggested_searches };
  }

  // ── OCR Registration Book ─────────────────────────────────

  async ocrRegistrationBook(imageBase64: string): Promise<{
    make?: string; model?: string; year?: number;
    chassis_number?: string; engine_number?: string;
    registered_city?: string; owner_name?: string;
  }> {

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
          {
            type: 'text',
            text: `This is a Pakistani vehicle registration book (RC book).
Extract the following fields if visible:
- Vehicle make/brand
- Vehicle model
- Year of manufacture
- Chassis/VIN number
- Engine number
- Registered city
- Owner name

Respond ONLY with JSON. Use null for fields not found.
{"make": null, "model": null, "year": null, "chassis_number": null, "engine_number": null, "registered_city": null, "owner_name": null}`,
          },
        ],
      }],
      max_tokens: 200,
    });

    const text = response.choices[0].message.content.trim();
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  }

  // ── Helpers ───────────────────────────────────────────────

  private async getAvgMarketPrice(make: string, model: string, year: number): Promise<number | null> {
    const result = await this.vehicleRepo
      .createQueryBuilder('v')
      .select('AVG(v.price)', 'avg')
      .where('LOWER(v.make) = LOWER(:make)', { make })
      .andWhere('LOWER(v.model) = LOWER(:model)', { model })
      .andWhere('v.year = :year', { year })
      .andWhere('v.status IN (:...s)', { s: ['active', 'sold', 'boosted'] })
      .getRawOne();

    return result?.avg ? parseFloat(result.avg) : null;
  }

  private fallbackPriceEstimate(params: any, comparables: any[]) {
    if (comparables.length === 0) {
      return { min: 0, max: 0, suggested: 0, confidence: 0, reasoning: 'Insufficient market data.' };
    }
    const prices = comparables.map(c => Number(c.price));
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const mileageFactor = 1 - (params.mileage / 200000) * 0.1;

    return {
      min: Math.round(avg * 0.85 * mileageFactor),
      max: Math.round(avg * 1.1 * mileageFactor),
      suggested: Math.round(avg * mileageFactor),
      confidence: Math.min(80, comparables.length * 5),
      reasoning: `Based on ${comparables.length} comparable listings. Adjusted for mileage.`,
    };
  }
}
