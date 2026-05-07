// backend/src/modules/vehicles/vehicles.service.ts
import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { SearchVehiclesDto } from './dto/search-vehicles.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Create Listing ────────────────────────────────────────

  async create(sellerId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehicleRepo.create({
      ...dto,
      seller_id: sellerId,
      status: 'pending', // requires moderation before going live
      price_history: [{ price: dto.price, changed_at: new Date() }],
    });

    const saved = await this.vehicleRepo.save(vehicle);
    this.logger.log(`Listing created: ${saved.id} by ${sellerId}`);

    // Trigger saved search alerts for matching users
    await this.notificationsService.triggerSavedSearchAlerts(saved);

    return saved;
  }

  // ── Search & Filter ───────────────────────────────────────

  async search(dto: SearchVehiclesDto, currentUserId?: string) {
    const cacheKey = `search:${JSON.stringify(dto)}`;

    // Try cache first for anonymous searches
    if (!currentUserId) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const qb = this.vehicleRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.seller', 'seller')
      .select([
        'v.id', 'v.title', 'v.make', 'v.model', 'v.variant', 'v.year',
        'v.price', 'v.mileage', 'v.city', 'v.fuel_type', 'v.transmission',
        'v.color', 'v.inspection_badge', 'v.is_featured', 'v.is_boosted',
        'v.fraud_risk_score', 'v.view_count', 'v.created_at', 'v.status',
        'v.vehicle_type', 'v.assembly', 'v.body_type',
        'seller.id', 'seller.full_name', 'seller.avg_rating', 'seller.cnic_verified',
      ])
      .where('v.status IN (:...statuses)', { statuses: ['active', 'boosted'] })
      .andWhere('v.deleted_at IS NULL');

    // ── Apply Filters ──────────────────────────────────────
    this.applyFilters(qb, dto);

    // ── Sorting ────────────────────────────────────────────
    const sortMap = {
      newest: { field: 'v.created_at', order: 'DESC' as const },
      oldest: { field: 'v.created_at', order: 'ASC' as const },
      price_asc: { field: 'v.price', order: 'ASC' as const },
      price_desc: { field: 'v.price', order: 'DESC' as const },
      mileage_asc: { field: 'v.mileage', order: 'ASC' as const },
      popular: { field: 'v.view_count', order: 'DESC' as const },
    };

    const sort = sortMap[dto.sort] || sortMap.newest;

    // Boost featured/boosted listings to top
    qb.orderBy('v.is_featured', 'DESC')
      .addOrderBy('v.is_boosted', 'DESC')
      .addOrderBy(sort.field, sort.order);

    // ── Pagination ─────────────────────────────────────────
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(50, dto.limit || 20);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    // Fetch primary images
    const vehicleIds = data.map(v => v.id);
    const images = vehicleIds.length
      ? await this.vehicleRepo.query(
          `SELECT vehicle_id, url, thumbnail_url FROM vehicle_images
           WHERE vehicle_id = ANY($1) AND is_primary = true`,
          [vehicleIds],
        )
      : [];

    const imageMap = Object.fromEntries(images.map((img: any) => [img.vehicle_id, img]));

    const result = {
      data: data.map(v => ({
        ...v,
        primary_image: imageMap[v.id] || null,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
      },
    };

    // Cache anonymous search results for 2 minutes
    if (!currentUserId) {
      await this.cache.set(cacheKey, result, 120);
    }

    return result;
  }

  private applyFilters(qb: SelectQueryBuilder<Vehicle>, dto: SearchVehiclesDto) {
    if (dto.q) {
      qb.andWhere(
        `to_tsvector('english', v.title || ' ' || v.make || ' ' || v.model || ' ' || COALESCE(v.variant, ''))
         @@ plainto_tsquery('english', :q)`,
        { q: dto.q },
      );
    }
    if (dto.vehicle_type) qb.andWhere('v.vehicle_type = :vehicle_type', { vehicle_type: dto.vehicle_type });
    if (dto.make) qb.andWhere('LOWER(v.make) = LOWER(:make)', { make: dto.make });
    if (dto.model) qb.andWhere('LOWER(v.model) = LOWER(:model)', { model: dto.model });
    if (dto.city) qb.andWhere('LOWER(v.city) = LOWER(:city)', { city: dto.city });
    if (dto.min_price) qb.andWhere('v.price >= :min_price', { min_price: dto.min_price });
    if (dto.max_price) qb.andWhere('v.price <= :max_price', { max_price: dto.max_price });
    if (dto.min_year) qb.andWhere('v.year >= :min_year', { min_year: dto.min_year });
    if (dto.max_year) qb.andWhere('v.year <= :max_year', { max_year: dto.max_year });
    if (dto.min_mileage !== undefined) qb.andWhere('v.mileage >= :min_mileage', { min_mileage: dto.min_mileage });
    if (dto.max_mileage !== undefined) qb.andWhere('v.mileage <= :max_mileage', { max_mileage: dto.max_mileage });
    if (dto.fuel_type) qb.andWhere('v.fuel_type = :fuel_type', { fuel_type: dto.fuel_type });
    if (dto.transmission) qb.andWhere('v.transmission = :transmission', { transmission: dto.transmission });
    if (dto.body_type) qb.andWhere('v.body_type = :body_type', { body_type: dto.body_type });
    if (dto.assembly) qb.andWhere('v.assembly = :assembly', { assembly: dto.assembly });
    if (dto.condition) qb.andWhere('v.condition_type = :condition', { condition: dto.condition });
    if (dto.inspected_only) qb.andWhere('v.inspection_badge = true');
    if (dto.dealer_only) qb.andWhere('v.dealer_id IS NOT NULL');
    if (dto.registered_city) qb.andWhere('LOWER(v.registered_city) = LOWER(:registered_city)', { registered_city: dto.registered_city });
  }

  // ── Get Single Listing ────────────────────────────────────

  async findOne(id: string, viewerId?: string): Promise<Vehicle & { images: any[]; similar: any[] }> {
    const cacheKey = `vehicle:${id}`;
    const cached = await this.cache.get<any>(cacheKey);

    const vehicle = cached || await this.vehicleRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.seller', 'seller')
      .where('v.id = :id', { id })
      .andWhere('v.deleted_at IS NULL')
      .getOne();

    if (!vehicle) throw new NotFoundException('Listing not found');

    // Track view (async, don't await)
    if (viewerId !== vehicle.seller_id) {
      this.incrementViewCount(id).catch(() => {});
    }

    // Fetch images
    const images = await this.vehicleRepo.query(
      'SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY order_index ASC',
      [id],
    );

    // Fetch similar listings
    const similar = await this.vehicleRepo
      .createQueryBuilder('v')
      .where('v.make = :make', { make: vehicle.make })
      .andWhere('v.id != :id', { id })
      .andWhere('v.status IN (:...s)', { s: ['active', 'boosted'] })
      .andWhere('v.price BETWEEN :min AND :max', {
        min: vehicle.price * 0.7,
        max: vehicle.price * 1.3,
      })
      .orderBy('v.is_featured', 'DESC')
      .limit(6)
      .getMany();

    // Cache for 5 minutes
    if (!cached) await this.cache.set(cacheKey, vehicle, 300);

    return { ...vehicle, images, similar };
  }

  // ── Update Listing ────────────────────────────────────────

  async update(id: string, userId: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Listing not found');
    if (vehicle.seller_id !== userId) throw new ForbiddenException('Not your listing');

    // Track price history
    if (dto.price && dto.price !== vehicle.price) {
      const history = vehicle.price_history || [];
      history.push({ price: vehicle.price, changed_at: new Date() });
      dto['price_history'] = history;
    }

    await this.vehicleRepo.update(id, dto);
    await this.cache.del(`vehicle:${id}`);

    return this.vehicleRepo.findOne({ where: { id } });
  }

  // ── Mark as Sold ──────────────────────────────────────────

  async markSold(id: string, userId: string): Promise<void> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException();
    if (vehicle.seller_id !== userId) throw new ForbiddenException();

    await this.vehicleRepo.update(id, { status: 'sold', sold_at: new Date() });
    await this.cache.del(`vehicle:${id}`);
  }

  // ── Delete ────────────────────────────────────────────────

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException();
    if (vehicle.seller_id !== userId && !['admin', 'moderator'].includes(userRole)) {
      throw new ForbiddenException();
    }
    await this.vehicleRepo.softDelete(id);
    await this.cache.del(`vehicle:${id}`);
  }

  // ── Featured Listings ─────────────────────────────────────

  async getFeatured(limit = 10) {
    const cacheKey = `featured:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.vehicleRepo
      .createQueryBuilder('v')
      .where('v.is_featured = true')
      .andWhere('v.status = :s', { s: 'active' })
      .andWhere('v.boost_expires_at > NOW() OR v.is_featured = true')
      .orderBy('RANDOM()')
      .limit(limit)
      .getMany();

    await this.cache.set(cacheKey, data, 60);
    return data;
  }

  // ── Seller's Listings ─────────────────────────────────────

  async getSellerListings(sellerId: string, status?: string) {
    const qb = this.vehicleRepo.createQueryBuilder('v')
      .where('v.seller_id = :sellerId', { sellerId })
      .andWhere('v.deleted_at IS NULL')
      .orderBy('v.created_at', 'DESC');

    if (status) qb.andWhere('v.status = :status', { status });

    return qb.getMany();
  }

  // ── Helpers ───────────────────────────────────────────────

  private async incrementViewCount(id: string): Promise<void> {
    await this.vehicleRepo.increment({ id }, 'view_count', 1);
  }

  async getAutocomplete(q: string): Promise<string[]> {
    if (!q || q.length < 2) return [];

    const results = await this.vehicleRepo.query(
      `SELECT DISTINCT CONCAT(make, ' ', model) as suggestion
       FROM vehicles
       WHERE make ILIKE $1 OR model ILIKE $1 OR title ILIKE $1
       AND status IN ('active', 'boosted')
       LIMIT 8`,
      [`${q}%`],
    );

    return results.map((r: any) => r.suggestion);
  }
}
