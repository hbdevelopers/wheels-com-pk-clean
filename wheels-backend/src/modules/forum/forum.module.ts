// backend/src/modules/forum/forum.module.ts
import { Module } from '@nestjs/common';
import { ForumController, SavedController, ReportsController, ReferralsController, ReelsController } from './forum.controller';

@Module({
  controllers: [ForumController, SavedController, ReportsController, ReferralsController, ReelsController],
})
export class ForumModule {}
