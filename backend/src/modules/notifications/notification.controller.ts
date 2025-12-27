import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { NotificationService, Recipient } from './notification.service';
import { DualAuthGuard, RequestWithAuth } from 'src/guards/dual-auth.guard';

@Controller('notifications')
@UseGuards(DualAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async create(
    @Req() req: RequestWithAuth,
    @Body() body: {
      recipients: Recipient[];
      title: string;
      message: string;
      link?: string;
    },
  ) {
    const sender =
      req.admin
        ? { id: req.admin.id, type: 'ADMIN' }
        : req.partner
        ? { id: req.partner.id, type: 'PARTNER' }
        : { id: req.employee.id, type: 'EMPLOYEE' };

    return this.notificationService.createNotification({
      ...body,
      senderId: sender.id,
      senderType: sender.type as any,
    }, req);
  }

  @Get()
  async getMyNotifications(
    @Req() req: RequestWithAuth,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    const user =
      req.admin
        ? { id: req.admin.id, type: 'ADMIN' }
        : req.partner
        ? { id: req.partner.id, type: 'PARTNER' }
        : { id: req.employee.id, type: 'EMPLOYEE' };

    return this.notificationService.getNotificationsForRecipient(
      user.id,
      user.type as any,
      Number(page) || 1,
      Number(limit) || 10,
      search,
    );
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const recipientId =
      req.admin?.id || req.partner?.id || req.employee?.id;

    return this.notificationService.markAsRead(id, recipientId);
  }
}
