import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { EmailService } from './email.service';

@Module({
  providers: [NotificationsService, PushService, EmailService],
  exports: [NotificationsService, PushService, EmailService],
})
export class NotificationsModule {}
