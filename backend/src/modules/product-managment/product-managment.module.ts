import { Module } from '@nestjs/common';
import { ProductManagmentController } from './product-managment.controller';
import { ProductManagmentService } from './product-managment.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Module({
  controllers: [ProductManagmentController],
  providers: [ProductManagmentService, ActivityManagementService]
})
export class ProductManagmentModule {}
