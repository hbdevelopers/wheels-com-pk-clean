// backend/src/modules/chat/chat.controller.ts
import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@Controller('chats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user chat list' })
  getMyChats(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    return this.chatService.getUserChats(userId, +page, +limit);
  }

  @Post('start')
  @ApiOperation({ summary: 'Start or get existing chat for a vehicle' })
  startChat(
    @CurrentUser('id') buyerId: string,
    @Body() body: { vehicle_id: string; seller_id: string },
  ) {
    return this.chatService.getOrCreateChat(buyerId, body.seller_id, body.vehicle_id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages in a chat' })
  getMessages(
    @Param('id', ParseUUIDPipe) chatId: string,
    @CurrentUser('id') userId: string,
    @Query('before') before?: string,
    @Query('limit') limit = 50,
  ) {
    return this.chatService.getMessages(chatId, userId, before, +limit);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a chat' })
  archive(
    @Param('id', ParseUUIDPipe) chatId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.archiveChat(chatId, userId);
  }

  @Post('offers/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept, reject or counter an offer' })
  respondToOffer(
    @Param('id', ParseUUIDPipe) offerId: string,
    @CurrentUser('id') sellerId: string,
    @Body() body: { response: 'accept' | 'reject' | 'counter'; counter_price?: number },
  ) {
    return this.chatService.respondToOffer(offerId, sellerId, body.response, body.counter_price);
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/modules/chat/chat.module.ts

import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
