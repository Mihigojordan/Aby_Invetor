import { Module } from '@nestjs/common';
import { CategoryManagementService } from './category-management.service';
import { CategoryManagementController } from './category-management.controller';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Module({
  providers: [CategoryManagementService, ActivityManagementService],
  controllers: [CategoryManagementController]
})
export class CategoryManagementModule {}
