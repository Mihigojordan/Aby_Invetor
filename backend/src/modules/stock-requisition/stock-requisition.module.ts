import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

import { StockRequisitionService } from './stock-requisition.service';
import { StockRequisitionController } from './stock-requisition.controller';
import { StockRequisitionGateway } from './stock-requisition.gateway';
import { PushNotificationsService } from '../push-notification/push-notification.service';

import { NotificationService } from '../notifications/notification.service';
import { DualAuthGuard } from 'src/guards/dual-auth.guard';
import { GlobalSocketGateway } from 'src/global/socket/socket.gateway';

@Module({
  controllers: [StockRequisitionController],

  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'yourSecretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],

  providers: [
    PrismaService,
    StockRequisitionService,
    StockRequisitionGateway,
    GlobalSocketGateway,
    NotificationService,
    PushNotificationsService,
    DualAuthGuard,
    
  ],
})
export class StockRequisitionModule {}
