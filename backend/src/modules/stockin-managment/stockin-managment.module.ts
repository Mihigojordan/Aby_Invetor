import { Module } from '@nestjs/common';
import { StockinManagmentController } from './stockin-managment.controller';
import { StockinManagmentService } from './stockin-managment.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Module({
  controllers: [StockinManagmentController],
  providers: [StockinManagmentService, ActivityManagementService]
})
export class StockinManagmentModule {}
