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
import { EmailModule } from './global/email/email.module';


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
    EmailModule
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
