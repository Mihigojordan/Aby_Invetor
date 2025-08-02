import { Module } from '@nestjs/common';
import { TaskManagementController } from './task-management.controller';
import { TaskManagementService } from './task-management.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Module({
  controllers: [TaskManagementController],
  providers: [TaskManagementService, ActivityManagementService]
})
export class TaskManagementModule {}