import { HttpCode, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ActivityManagementService {
    constructor(private readonly prisma: PrismaService) {}

  async createActivity(data: {
    activityName: string;
    description: string;
    adminId?: string;
    employeeId?: string;
    doneAt?:string;
  }) {
    try {
      // Validate foreign keys if provided
      if (data.adminId) {
        const adminExists = await this.prisma.admin.findUnique({
          where: { id: data.adminId },
        });
        if (!adminExists) throw new HttpException('Invalid adminId', HttpStatus.BAD_REQUEST );
      }

      if (data.employeeId) {
        const employeeExists = await this.prisma.employee.findUnique({
          where: { id: data.employeeId },
        });
        if (!employeeExists) throw new HttpException('Invalid employeeId', HttpStatus.BAD_REQUEST);
      }

      return await this.prisma.activity.create({
        data: {
          activityName: data.activityName,
          description: data.description,
          adminId: data.adminId,
          employeeId: data.employeeId,
          doneAt: data.doneAt ? data.doneAt : new Date().toISOString()
        },
      });
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async getAllActivities() {
    return await this.prisma.activity.findMany({
      include: {
        admin: true,
        employee: true,
      },
    });
  }

  async getActivityById(id: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        admin: true,
        employee: true,
      },
    });

    if (!activity) throw new HttpException('Activity not found', HttpStatus.NOT_FOUND);
    return activity;
  }
  async getActivityByEmployeeId(id: string) {
    const activities = await this.prisma.activity.findMany({
      where: { employeeId: id },
    });

    if (!activities || activities.length === 0) throw new HttpException('Activity not found', HttpStatus.NOT_FOUND);
    return activities;
  }
}