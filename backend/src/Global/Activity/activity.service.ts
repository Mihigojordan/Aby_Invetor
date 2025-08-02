import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async logActivity(data: {
    name: string;
    description: string;
    userId: string;
  }) {
    return this.prisma.activity.create({
      data: {
        activityName: data.name,
        description: data.description,
        adminId: data.userId,
      },
    });
  }
}
