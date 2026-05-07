// backend/src/modules/uploads/r2.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client, PutObjectCommand, DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('R2_BUCKET_NAME', 'wheels-media');
    this.publicUrl = config.get('R2_PUBLIC_URL', ''); // e.g. https://cdn.wheels.com.pk

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.get('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'vehicles',
    options: { width?: number; quality?: number; generateThumbnail?: boolean } = {},
  ): Promise<{ url: string; thumbnailUrl?: string; key: string }> {

    const { width = 1200, quality = 85, generateThumbnail = true } = options;

    // Process and optimize image with Sharp
    let processedBuffer: Buffer;
    let thumbnailBuffer: Buffer | null = null;

    try {
      processedBuffer = await sharp(file.buffer)
        .resize(width, null, { withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      if (generateThumbnail) {
        thumbnailBuffer = await sharp(file.buffer)
          .resize(400, 280, { fit: 'cover' })
          .webp({ quality: 70 })
          .toBuffer();
      }
    } catch (err) {
      this.logger.error('Image processing failed:', err);
      processedBuffer = file.buffer; // fallback to original
    }

    const key = `${folder}/${uuidv4()}.webp`;
    const thumbnailKey = `${folder}/thumbs/${uuidv4()}.webp`;

    // Upload main image
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: processedBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000', // 1 year cache
    }));

    let thumbnailUrl: string | undefined;

    // Upload thumbnail
    if (thumbnailBuffer) {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
      }));
      thumbnailUrl = `${this.publicUrl}/${thumbnailKey}`;
    }

    return {
      url: `${this.publicUrl}/${key}`,
      thumbnailUrl,
      key,
    };
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
    } catch (err) {
      this.logger.warn(`Failed to delete R2 object ${key}:`, err);
    }
  }

  async getPresignedUploadUrl(
    folder: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<{ upload_url: string; key: string }> {
    const key = `${folder}/${uuidv4()}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const upload_url = await getSignedUrl(this.client, command, { expiresIn });
    return { upload_url, key };
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/uploads/uploads.service.ts

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

export class UploadsService {
  constructor(
    private readonly r2: R2Service,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
  ) {}

  async uploadVehicleImages(
    vehicleId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new BadRequestException('Vehicle not found');
    if (vehicle.seller_id !== userId) throw new ForbiddenException('Not your listing');
    if (files.length > 20) throw new BadRequestException('Maximum 20 images allowed');

    const uploadedImages = await Promise.all(
      files.map(async (file, index) => {
        const { url, thumbnailUrl, key } = await this.r2.uploadImage(
          file, `vehicles/${vehicleId}`,
        );

        // Save to vehicle_images table
        await this.vehicleRepo.query(
          `INSERT INTO vehicle_images (vehicle_id, url, thumbnail_url, cdn_key, order_index, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [vehicleId, url, thumbnailUrl, key, index, index === 0],
        );

        return { url, thumbnailUrl, order: index };
      }),
    );

    return { uploaded: uploadedImages.length, images: uploadedImages };
  }
}
