// backend/src/modules/users/users.controller.ts
import {
  Controller, Get, Put, Post, Delete, Body, Param,
  UseGuards, UseInterceptors, UploadedFile, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getPublicProfile(userId, userId);
  }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('avatar'))
  updateAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.updateAvatar(userId, file);
  }

  @Get('me/saved-searches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getSavedSearches(@CurrentUser('id') userId: string) {
    return this.usersService.getSavedSearches(userId);
  }

  @Post('me/saved-searches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createSavedSearch(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.usersService.createSavedSearch(userId, dto);
  }

  @Delete('me/saved-searches/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteSavedSearch(
    @Param('id', ParseUUIDPipe) searchId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.deleteSavedSearch(searchId, userId);
  }

  @Get('me/referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getReferralStats(@CurrentUser('id') userId: string) {
    return this.usersService.getReferralStats(userId);
  }

  @Post('me/cnic')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit CNIC for verification' })
  submitCnic(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.usersService.submitCnic(userId, dto);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  getProfile(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser('id') viewerId?: string,
  ) {
    return this.usersService.getPublicProfile(userId, viewerId);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  followUser(
    @Param('id', ParseUUIDPipe) targetId: string,
    @CurrentUser('id') followerId: string,
  ) {
    return this.usersService.followUser(followerId, targetId);
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  leaveReview(
    @Param('id', ParseUUIDPipe) reviewedId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: any,
  ) {
    return this.usersService.leaveReview(reviewerId, reviewedId, dto);
  }

  @Get(':id/reviews')
  getReviews(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query('page') page = 1,
  ) {
    return this.usersService.getUserReviews(userId, +page);
  }
}
