import { Module } from '@nestjs/common';
import { SalesReturnService } from './salesReturn.service';
import { SalesReturnController } from './salesReturn.controller';

@Module({
  controllers: [SalesReturnController],
  providers: [SalesReturnService],
})
export class SalesReturnModule {}
