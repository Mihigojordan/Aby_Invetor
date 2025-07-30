import { Module } from '@nestjs/common';
import { CategoryManagementService } from './category-management.service';
import { CategoryManagementController } from './category-management.controller';

@Module({
  providers: [CategoryManagementService],
  controllers: [CategoryManagementController]
})
export class CategoryManagementModule {}
