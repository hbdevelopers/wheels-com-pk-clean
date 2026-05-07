import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AuctionsGateway } from './auctions.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AuctionsController],
  providers: [AuctionsGateway],
  exports: [AuctionsGateway],
})
export class AuctionsModule {}
