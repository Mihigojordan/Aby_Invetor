import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Injectable()
export class BackOrderManagementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly activityService: ActivityManagementService,
  ) {}

  async createBackOrder(data:any) {
    try {
      const { productName, quantity, sellingPrice:soldPrice, adminId, employeeId } = data;

      if (!productName) {
        throw new BadRequestException('Product name is required');
      }

      if (!quantity || quantity <= 0) {
        throw new BadRequestException('Valid quantity is required');
      }

      const createdBackOrder = await this.prismaService.backOrder.create({
        data: {
          productName,
          quantity,
          soldPrice,
          adminId,
          employeeId
        },
        include: {
          admin: true,
          employee: true
        }
      });

      if (adminId) {
        const admin = await this.prismaService.admin.findUnique({
          where: { id: adminId },
        });
        if (!admin)
          throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'back order created',
          description: `${admin.adminName} created back order for ${createdBackOrder.productName}`,
          adminId: admin.id,
        });
      }

      if (employeeId) {
        const employee = await this.prismaService.employee.findUnique({
          where: { id: employeeId },
        });
        if (!employee)
          throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'back order created',
          description: `${employee.firstname} created back order for ${createdBackOrder.productName}`,
          employeeId: employee.id,
        });
      }

      return {
        message: 'Back order created successfully',
        backOrder: createdBackOrder,
      };
    } catch (error) {
      console.error('Error creating back order:', error);
      throw new Error(error.message);
    }
  }

  async getAllBackOrders() {
    try {
      const backOrders = await this.prismaService.backOrder.findMany({
        include: {
          admin: true,
          employee: true,
          stockout: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return backOrders;
    } catch (error) {
      console.error('Error getting back orders:', error);
      throw new Error(error.message);
    }
  }

  async getBackOrderById(id:any) {
    try {
      if (!id) throw new BadRequestException('Back order ID is required');

      const backOrder = await this.prismaService.backOrder.findUnique({
        where: { id },
        include: {
          admin: true,
          employee: true,
          stockout: true
        }
      });

      if (!backOrder) throw new BadRequestException('Back order not found');

      return backOrder;
    } catch (error) {
      console.error('Error getting back order:', error);
      throw new Error(error.message);
    }
  }

  async updateBackOrder(id:string, data:any) {
    try {
      if (!id) throw new BadRequestException('Back order ID is required');

      const existing = await this.prismaService.backOrder.findUnique({
        where: { id },
      });

      if (!existing) throw new BadRequestException('Back order not found');

      const { productName, quantity, soldPrice, adminId, employeeId } = data;

      const updated = await this.prismaService.backOrder.update({
        where: { id },
        data: {
          productName: productName ?? existing.productName,
          quantity: quantity ?? existing.quantity,
          soldPrice: soldPrice ?? existing.soldPrice,
          adminId: adminId ?? existing.adminId,
          employeeId: employeeId ?? existing.employeeId
        },
        include: {
          admin: true,
          employee: true
        }
      });

      if (adminId) {
        const admin = await this.prismaService.admin.findUnique({
          where: { id: adminId },
        });
        if (!admin)
          throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'back order updated',
          description: `${admin.adminName} updated back order for ${updated.productName}`,
          adminId: admin.id,
        });
      }

      if (employeeId) {
        const employee = await this.prismaService.employee.findUnique({
          where: { id: employeeId },
        });
        if (!employee)
          throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'back order updated',
          description: `${employee.firstname} updated back order for ${updated.productName}`,
          employeeId: employee.id,
        });
      }

      return {
        message: 'Back order updated successfully',
        backOrder: updated,
      };
    } catch (error) {
      console.error('Error updating back order:', error);
      throw new Error(error.message);
    }
  }

  async deleteBackOrder(id:string, data:any) {
    try {
      if (!id) throw new BadRequestException('Back order ID is required');

      const deleted = await this.prismaService.backOrder.delete({
        where: { id },
      });

      if (data?.adminId) {
        const admin = await this.prismaService.admin.findUnique({
          where: { id: data.adminId },
        });
        if (!admin)
          throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'back order deleted',
          description: `${admin.adminName} deleted back order for ${deleted.productName}`,
          adminId: admin.id,
        });
      }

      if (data?.employeeId) {
        const employee = await this.prismaService.employee.findUnique({
          where: { id: data.employeeId },
        });
        if (!employee)
          throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'back order deleted',
          description: `${employee.firstname} deleted back order for ${deleted.productName}`,
          employeeId: employee.id,
        });
      }

      return {
        message: 'Back order deleted successfully',
        backOrder: deleted,
      };
    } catch (error) {
      console.error('Error deleting back order:', error);
      throw new Error(error.message);
    }
  }
}