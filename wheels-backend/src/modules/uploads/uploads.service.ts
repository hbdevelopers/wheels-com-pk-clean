// backend/src/modules/uploads/uploads.service.ts
import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { R2Service } from './r2.service';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  constructor(private readonly r2: R2Service, @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>) {}

  async uploadVehicleImages(vehicleId: string, userId: string, files: Express.Multer.File[]) {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new BadRequestException('Vehicle not found');
    if (vehicle.seller_id !== userId) throw new ForbiddenException('Not your listing');
    if (files.length > 20) throw new BadRequestException('Maximum 20 images allowed');
    const [{ count: existing }] = await this.vehicleRepo.query('SELECT COUNT(*) FROM vehicle_images WHERE vehicle_id = $1', [vehicleId]);
    const uploaded = await Promise.all(files.map(async (file, index) => {
      const { url, thumbnailUrl, key } = await this.r2.uploadImage(file, `vehicles/${vehicleId}`);
      await this.vehicleRepo.query(
        'INSERT INTO vehicle_images (vehicle_id, url, thumbnail_url, cdn_key, order_index, is_primary) VALUES ($1,$2,$3,$4,$5,$6)',
        [vehicleId, url, thumbnailUrl, key, parseInt(existing) + index, parseInt(existing) + index === 0],
      );
      return { url, thumbnailUrl, order: parseInt(existing) + index };
    }));
    return { uploaded: uploaded.length, images: uploaded };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const { url } = await this.r2.uploadImage(file, `avatars/${userId}`, { width: 400, generateThumbnail: false });
    await this.vehicleRepo.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [url, userId]);
    return { avatar_url: url };
  }

  async deleteVehicleImage(imageId: string, userId: string) {
    const [image] = await this.vehicleRepo.query('SELECT vi.*, v.seller_id FROM vehicle_images vi JOIN vehicles v ON v.id = vi.vehicle_id WHERE vi.id = $1', [imageId]);
    if (!image) throw new BadRequestException('Image not found');
    if (image.seller_id !== userId) throw new ForbiddenException('Not your image');
    if (image.cdn_key) await this.r2.deleteFile(image.cdn_key);
    await this.vehicleRepo.query('DELETE FROM vehicle_images WHERE id = $1', [imageId]);
    if (image.is_primary) await this.vehicleRepo.query('UPDATE vehicle_images SET is_primary = true WHERE vehicle_id = $1 ORDER BY order_index ASC LIMIT 1', [image.vehicle_id]);
  }

  async reorderImages(vehicleId: string, userId: string, imageIds: string[]) {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new BadRequestException('Vehicle not found');
    if (vehicle.seller_id !== userId) throw new ForbiddenException('Not your listing');
    await Promise.all(imageIds.map((id, index) => this.vehicleRepo.query('UPDATE vehicle_images SET order_index=$1, is_primary=$2 WHERE id=$3 AND vehicle_id=$4', [index, index === 0, id, vehicleId])));
  }
}
