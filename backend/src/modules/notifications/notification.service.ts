import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GlobalSocketGateway } from 'src/global/socket/socket.gateway';
import { PushNotificationsService } from '../push-notification/push-notification.service';
import { RequestWithAuth } from 'src/guards/dual-auth.guard';

export type Recipient = {
  id: string;
  type:'ADMIN' | 'PARTNER' | 'EMPLOYEE';
  read: boolean;
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: GlobalSocketGateway,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  // ────────────────────────────────
  // FIND SENDER (FOR ICON / CONTEXT)
  // ────────────────────────────────
  async findSender(senderId: string, senderType: 'ADMIN' | 'PARTNER' | 'EMPLOYEE') {
    if (senderType === 'ADMIN') {
      return this.prisma.admin.findUnique({ where: { id: senderId } });
    }

    if (senderType === 'PARTNER') {
      return this.prisma.partner.findUnique({ where: { id: senderId } });
    }

    if (senderType === 'EMPLOYEE') {
      return this.prisma.employee.findUnique({ where: { id: senderId } });
    }

    return null;
  }

  // ────────────────────────────────
  // CREATE NOTIFICATION
  // ────────────────────────────────
  async createNotification(
    data: {
      recipients: Recipient[];
      senderId?: string;
      senderType?: 'ADMIN' | 'PARTNER' | 'EMPLOYEE';
      title: string;
      message: string;
      link?: string;
    },
    req?: any,
  ) {
    if (!data.recipients?.length) {
      throw new BadRequestException('At least one recipient is required');
    }

    const notification = await this.prisma.notification.create({
      data: {
        recipients: data.recipients as any,
        senderId: data.senderId,
        senderType: data.senderType,
        title: data.title,
        message: data.message,
        link: data.link,
      },
    });

    // SEND PUSH
    await Promise.all(
      data.recipients.map((recipient) =>
        this.pushNotificationsService.sendToUser(
          recipient.id,
          recipient.type,
          {
            title: data.title,
            message: data.message,
            url: data.link,
            tag: notification.id,
            data: {
              notificationId: notification.id,
            },
          },
        ).catch(err =>
          console.error(`Push failed for ${recipient.type}:${recipient.id}`, err),
        ),
      ),
    );

    // SOCKET EMIT
    this.socket.emitToRecipients(
      data.recipients,
      'new-notification',
      notification,
    );

    return notification;
  }

  // ────────────────────────────────
  // GET NOTIFICATIONS FOR USER
  // ────────────────────────────────
  async getNotificationsForRecipient(
    recipientId: string,
    recipientType: 'ADMIN' | 'PARTNER' | 'EMPLOYEE',
    page = 1,
    limit = 10,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    let notifications = await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    });

    notifications = notifications.filter((n) =>
      (n.recipients as Recipient[]).some(
        (r) => r.id === recipientId && r.type === recipientType,
      ),
    );

    if (search?.trim()) {
      const q = search.toLowerCase();
      notifications = notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q),
      );
    }

    const total = notifications.length;

    return {
      data: notifications.slice(skip, skip + limit),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ────────────────────────────────
  // MARK AS READ
  // ────────────────────────────────
  async markAsRead(notificationId: string, recipientId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updatedRecipients = (notification.recipients as Recipient[]).map(r =>
      r.id === recipientId ? { ...r, read: true } : r,
    );

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { recipients: updatedRecipients as any },
    });

    const recipient = updatedRecipients.find(r => r.id === recipientId);

    if (recipient) {
      this.socket.emitToRecipients(
        [recipient],
        'notification-read',
        { notificationId, recipientId },
      );
    }

    return updated;
  }
}
