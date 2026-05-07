import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { JazzCashService } from './jazzcash.service';
import { EasypaisaService } from './easypaisa.service';

@Module({
  controllers: [PaymentsController],
  providers: [JazzCashService, EasypaisaService],
  exports: [JazzCashService, EasypaisaService],
})
export class PaymentsModule {}
