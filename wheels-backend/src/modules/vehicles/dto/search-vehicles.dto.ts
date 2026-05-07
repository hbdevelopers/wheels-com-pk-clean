// backend/src/modules/vehicles/dto/search-vehicles.dto.ts
import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchVehiclesDto {
  @ApiPropertyOptional({ description: 'Free text search' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['car', 'bike', 'auto_part', 'number_plate', 'truck', 'van'] })
  @IsOptional() @IsEnum(['car', 'bike', 'auto_part', 'number_plate', 'truck', 'van'])
  vehicle_type?: string;

  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional() @IsString()
  make?: string;

  @ApiPropertyOptional({ example: 'Corolla' })
  @IsOptional() @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'Lahore' })
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Lahore' })
  @IsOptional() @IsString()
  registered_city?: string;

  @ApiPropertyOptional({ example: 1000000 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  min_price?: number;

  @ApiPropertyOptional({ example: 20000000 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  max_price?: number;

  @ApiPropertyOptional({ example: 2018 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1990) @Max(2025)
  min_year?: number;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1990) @Max(2025)
  max_year?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  min_mileage?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  max_mileage?: number;

  @ApiPropertyOptional({ enum: ['petrol', 'diesel', 'hybrid', 'electric', 'cng', 'lpg'] })
  @IsOptional() @IsEnum(['petrol', 'diesel', 'hybrid', 'electric', 'cng', 'lpg'])
  fuel_type?: string;

  @ApiPropertyOptional({ enum: ['manual', 'automatic', 'semi_automatic', 'cvt'] })
  @IsOptional() @IsEnum(['manual', 'automatic', 'semi_automatic', 'cvt'])
  transmission?: string;

  @ApiPropertyOptional({ enum: ['sedan', 'suv', 'hatchback', 'coupe', 'pickup', 'van', 'minivan', 'crossover', 'convertible', 'wagon'] })
  @IsOptional() @IsString()
  body_type?: string;

  @ApiPropertyOptional({ enum: ['local', 'imported'] })
  @IsOptional() @IsEnum(['local', 'imported'])
  assembly?: string;

  @ApiPropertyOptional({ enum: ['new', 'used', 'certified_used'] })
  @IsOptional() @IsEnum(['new', 'used', 'certified_used'])
  condition?: string;

  @ApiPropertyOptional({ description: 'Only show inspected listings' })
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  inspected_only?: boolean;

  @ApiPropertyOptional({ description: 'Only show dealer listings' })
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  dealer_only?: boolean;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'price_asc', 'price_desc', 'mileage_asc', 'popular'], default: 'newest' })
  @IsOptional() @IsEnum(['newest', 'oldest', 'price_asc', 'price_desc', 'mileage_asc', 'popular'])
  sort?: string = 'newest';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(50)
  limit?: number = 20;
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/vehicles/dto/create-vehicle.dto.ts
import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean,
  IsArray, Min, Max, Length, IsInt } from 'class-validator';

export class CreateVehicleDto {
  @IsEnum(['car', 'bike', 'auto_part', 'number_plate', 'truck', 'van'])
  vehicle_type: string;

  @IsString() @Length(10, 500)
  title: string;

  @IsOptional() @IsString() @Length(0, 500)
  title_urdu?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  description_urdu?: string;

  @IsString() @Length(1, 100)
  make: string;

  @IsString() @Length(1, 100)
  model: string;

  @IsOptional() @IsString() @Length(0, 100)
  variant?: string;

  @IsInt() @Min(1990) @Max(new Date().getFullYear() + 1)
  year: number;

  @IsOptional() @IsString()
  color?: string;

  @IsOptional() @IsEnum(['sedan', 'suv', 'hatchback', 'coupe', 'pickup', 'van', 'minivan', 'crossover', 'convertible', 'wagon'])
  body_type?: string;

  @IsOptional() @IsEnum(['petrol', 'diesel', 'hybrid', 'electric', 'cng', 'lpg'])
  fuel_type?: string;

  @IsOptional() @IsEnum(['manual', 'automatic', 'semi_automatic', 'cvt'])
  transmission?: string;

  @IsOptional() @IsEnum(['local', 'imported'])
  assembly?: string;

  @IsEnum(['new', 'used', 'certified_used'])
  condition_type: string;

  @IsOptional() @IsInt() @Min(50) @Max(10000)
  engine_capacity?: number;

  @IsOptional() @IsInt() @Min(0)
  mileage?: number;

  @IsOptional() @IsString()
  registered_city?: string;

  @IsOptional() @IsInt()
  registration_year?: number;

  @IsOptional() @IsString()
  vin?: string;

  @IsOptional() @IsString()
  chassis_number?: string;

  @IsNumber() @Min(1)
  price: number;

  @IsOptional() @IsBoolean()
  price_negotiable?: boolean;

  @IsString() @Length(1, 100)
  city: string;

  @IsOptional() @IsString()
  area?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  features?: string[];
}

export class UpdateVehicleDto extends CreateVehicleDto {}
