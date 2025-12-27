import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

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
import { SummaryModule } from './modules/Summary/summary.module';
import { ReportModule } from './modules/report-management/report.module';
import { BackOrderManagementModule } from './modules/backorder-management/backorder-management.module';
import { SalesReturnModule } from './modules/salesReturn-management/salesReturn.module';
import { PartnerModule } from './modules/partner-management/partner.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { PushNotificationsModule } from './modules/push-notification/push-notification.module';

@Module({
  imports: [
    // 🔥 Redis Cache (GLOBAL)
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      ttl: 60, // default cache time (seconds)
      isGlobal: true,
    }),

    PrismaModule,
    AdminModule,
    EmployeeManagmentModule,
    TaskManagementModule,
    CategoryManagementModule,
    ProductManagmentModule,
    StockinManagmentModule,
    StockoutModule,
    EmailModule,
    ReportModule,
    ActivityManagmentModule,
    SummaryModule,
    BackOrderManagementModule,
    SalesReturnModule,
    PartnerModule,
    PushNotificationsModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
