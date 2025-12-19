import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PushNotificationsService } from './push-notification.service';
import { PushNotificationsController } from './push-notification.controller';

@Module({
  providers: [PushNotificationsService, PrismaService],
  controllers: [PushNotificationsController],
  exports: [PushNotificationsService], // so other modules can inject it
})
export class PushNotificationsModule {}
