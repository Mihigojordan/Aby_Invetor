import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { GlobalSocketGateway } from 'src/global/socket/socket.gateway';
import { PushNotificationsService } from '../push-notification/push-notification.service';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { DualAuthGuard } from 'src/guards/dual-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretkey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    PrismaService,
    GlobalSocketGateway,
    PushNotificationsService,
    DualAuthGuard,
  ],
  exports: [NotificationService, PushNotificationsService],
})
export class NotificationModule {}
