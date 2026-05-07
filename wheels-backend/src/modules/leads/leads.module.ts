import { Module } from '@nestjs/common';
import { DealersModule } from '../dealers/dealers.module';

@Module({ imports: [DealersModule] })
export class LeadsModule {}
