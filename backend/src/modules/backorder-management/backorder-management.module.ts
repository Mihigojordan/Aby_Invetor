import { Module } from '@nestjs/common';
import { BackOrderManagementController } from './backorder-management.controller';
import { BackOrderManagementService } from './backorder-management.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Module({
  controllers: [BackOrderManagementController],
  providers: [
    BackOrderManagementService,
    ActivityManagementService
  ],
  

})
export class BackOrderManagementModule {}