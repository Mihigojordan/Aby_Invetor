import { Module } from '@nestjs/common';
import { TaskManagementService } from './task-management.service';
import { TaskManagementController } from './task-management.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/Global/Activity/activity.module';

@Module({
  imports: [ActivityModule], // <-- Important!
  controllers: [TaskManagementController],
  providers: [TaskManagementService, PrismaService],
})
export class TaskManagementModule {}
