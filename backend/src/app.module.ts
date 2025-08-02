import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './Modules/admin/admin.module';
import { EmployeeManagmentModule } from './Modules/employee-managment/employee-managment.module';
import { TaskManagementModule } from './Modules/task-management/task-management.module';
import { CategoryManagementModule } from './Modules/category-management/category-management.module';
import { ProductManagmentModule } from './Modules/product-managment/product-managment.module';
import { StockinManagmentModule } from './Modules/stockin-managment/stockin-managment.module';
import { StockoutModule } from './Modules/stockout-management/stockout.module';
import { EmailModule } from './Global/email/email.module';
import { ActivityManagmentModule } from './Modules/activity-managament/activity.module';
import { SalesReturnModule } from './Modules/salesReturn-management/salesReturn.module';


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
    SalesReturnModule
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
