import { Module } from '@nestjs/common';
import { SalesReturnService } from './salesReturn.service';
import { SalesReturnController } from './salesReturn.controller';
import { ActivityManagementService } from '../activity-managament/activity.service';


@Module({
  controllers: [SalesReturnController],
  providers: [SalesReturnService, ActivityManagementService],
})
export class SalesReturnModule {}
