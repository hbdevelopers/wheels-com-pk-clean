// backend/src/modules/vehicles/vehicles.controller.ts
import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, Request, HttpCode, HttpStatus,
  ParseUUIDPipe, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { SearchVehiclesDto } from './dto/search-vehicles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { AiService } from '../ai/ai.service';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly uploadsService: UploadsService,
    private readonly aiService: AiService,
  ) {}

  // ── Search ─────────────────────────────────────────────────
  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Search and filter listings' })
  search(@Query() dto: SearchVehiclesDto, @CurrentUser('id') userId?: string) {
    return this.vehiclesService.search(dto, userId);
  }

  // ── Autocomplete ───────────────────────────────────────────
  @Get('autocomplete')
  @ApiQuery({ name: 'q', required: true })
  autocomplete(@Query('q') q: string) {
    return this.vehiclesService.getAutocomplete(q);
  }

  // ── Featured ───────────────────────────────────────────────
  @Get('featured')
  getFeatured(@Query('limit') limit = 10) {
    return this.vehiclesService.getFeatured(limit);
  }

  // ── My Listings ────────────────────────────────────────────
  @Get('my-listings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMyListings(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.vehiclesService.getSellerListings(userId, status);
  }

  // ── Get Single ─────────────────────────────────────────────
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.vehiclesService.findOne(id, userId);
  }

  // ── Create ─────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new vehicle listing' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(userId, dto);
  }

  // ── Upload Photos ──────────────────────────────────────────
  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('images', 20, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
    fileFilter: (_, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return cb(new Error('Only image files allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.uploadsService.uploadVehicleImages(id, userId, files);
  }

  // ── Update ─────────────────────────────────────────────────
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, userId, dto);
  }

  // ── Mark Sold ──────────────────────────────────────────────
  @Post(':id/mark-sold')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  markSold(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehiclesService.markSold(id, userId);
  }

  // ── Delete ─────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.vehiclesService.remove(id, userId, userRole);
  }
}
