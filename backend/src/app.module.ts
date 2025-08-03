import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmployeeManagmentModule } from './modules/employee-managment/employee-managment.module';
import { TaskManagementModule } from './modules/task-management/task-management.module';
import { CategoryManagementModule } from './modules/category-management/category-management.module';
import { ProductManagmentModule } from './modules/product-managment/product-managment.module';
import { StockinManagmentModule } from './modules/stockin-managment/stockin-managment.module';
import { StockoutModule } from './modules/stockout-management/stockout.module';
import { EmailModule } from './global/email/email.module';
import { ActivityManagmentModule } from './modules/activity-managament/activity.module';
import { SalesReturnModule } from './modules/salesReturn-management/salesReturn.module';
import { SummaryModule } from './modules/Summary/summary.module';


@Module({
  imports: [
    PrismaModule,
    AdminModule,
    EmployeeManagmentModule,
    TaskManagementModule,
    CategoryManagementModule,
    ProductManagmentModule,
    StockinManagmentModule,
    StockoutModule,
    EmailModule,
    ActivityManagmentModule,
    SalesReturnModule,
    SummaryModule
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
