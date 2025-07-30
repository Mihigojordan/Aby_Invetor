import { Module } from '@nestjs/common';
import { StockinManagmentController } from './stockin-managment.controller';
import { StockinManagmentService } from './stockin-managment.service';

@Module({
  controllers: [StockinManagmentController],
  providers: [StockinManagmentService]
})
export class StockinManagmentModule {}
