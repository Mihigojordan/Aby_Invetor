import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmployeeManagmentModule } from './modules/employee-managment/employee-managment.module';
import { TaskManagementModule } from './modules/task-management/task-management.module';
import { CategoryManagementModule } from './modules/category-management/category-management.module';

@Module({
  imports: [PrismaModule, AdminModule, EmployeeManagmentModule, TaskManagementModule, CategoryManagementModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
