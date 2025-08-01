import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateStockSKU } from 'src/common/utils/generate-sku.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Injectable()
export class StockoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityManagementService,
  ) {}

  async create(data: {
    stockinId: string;
    adminId?: string;
    employeeId?: string;
    quantity: number;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
  }) {
    try {
      const { stockinId, quantity } = data;

      if (!stockinId || !quantity) {
        throw new BadRequestException('Missing required fields');
      }

      const stockin = await this.prisma.stockIn.findUnique({
        where: { id: stockinId },
      });

      if (!stockin) throw new NotFoundException('Stockin not found');

      if (stockin.quantity === null || stockin.quantity === undefined) {
        throw new BadRequestException('Stockin quantity is not set');
      }
      if (stockin.quantity < quantity) {
        throw new BadRequestException('Not enough stock available');
      }

      // Update stockin to subtract quantity
      await this.prisma.stockIn.update({
        where: { id: stockinId },
        data: {
          quantity: stockin.quantity - quantity,
        },
      });

      if (stockin.sellingPrice === null || stockin.sellingPrice === undefined) {
        throw new BadRequestException('Stockin selling price is not set');
      }
      const soldPrice = stockin.sellingPrice * quantity;

      const sku = generateStockSKU('abyride', String(data.clientName));

      const stockout = await this.prisma.stockOut.create({
        data: {
          ...data,
          sku: sku,
          soldPrice: soldPrice,
        },
      });
      if (data.adminId) {
        const admin = await this.prisma.admin.findUnique({
          where: { id: data.adminId },
        });
        if (!admin)
          throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'Stock Out',
          description: `${admin.adminName} recorded a stock out of ${quantity} items`,
          adminId: admin.id,
        });
      }

      if (data.employeeId) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: data.employeeId },
        });
        if (!employee)
          throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'Stock Out',
          description: `${employee.firstname} recorded a stock out of ${quantity} items`,
          employeeId: employee.id,
        });
      }
      return stockout;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getAll() {
    try {
      return await this.prisma.stockOut.findMany({
        include: {
          stockin: true,
          admin: true,
          employee: true,
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getOne(id: string) {
    try {
      const stockout = await this.prisma.stockOut.findUnique({
        where: { id },
        include: {
          stockin: true,
          admin: true,
          employee: true,
        },
      });

      if (!stockout) throw new NotFoundException('StockOut not found');
      return stockout;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(
    id: string,
    data: Partial<{
      quantity: number;
      soldPrice: number;
      clientName: string;
      clientEmail: string;
      clientPhone: string;
      adminId: string;
      employeeId: string;
    }>,
  ) {
    try {
      const stockout = await this.prisma.stockOut.findUnique({ where: { id } });
      if (!stockout) throw new NotFoundException('StockOut not found');

      const updatedStockout = await this.prisma.stockOut.update({
        where: { id },
        data,
      });
      if (data.adminId) {
        const admin = await this.prisma.admin.findUnique({
          where: { id: data.adminId },
        });
        if (!admin)
          throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'Stock Out Updated',
          description: `${admin.adminName} updated stock out record for client ${stockout.clientName || ''}`,
          adminId: admin.id,
        });
      }

      if (data.employeeId) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: data.employeeId },
        });
        if (!employee)
          throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'Stock Out Updated',
          description: `${employee.firstname} updated stock out record for client ${stockout.clientName || ''}`,
          employeeId: employee.id,
        });
      }
      return updatedStockout;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async delete(id: string, data?: { adminId?: string; employeeId?: string }) {
    try {
      const stockout = await this.prisma.stockOut.findUnique({ where: { id } });
      if (!stockout) throw new NotFoundException('StockOut not found');
      const deletedStock = await this.prisma.stockOut.delete({ where: { id } });
      if (data?.adminId) {
        const admin = await this.prisma.admin.findUnique({
          where: { id: data.adminId },
        });
        if (!admin)
          throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'Stock Out Deleted',
          description: `${admin.adminName} deleted stock out record for client ${stockout.clientName || ''}`,
          adminId: admin.id,
        });
      }

      if (data?.employeeId) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: data.employeeId },
        });
        if (!employee)
          throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'Stock Out Deleted',
          description: `${employee.firstname} deleted stock out record for client ${stockout.clientName || ''}`,
          employeeId: employee.id,
        });
      }

      return deletedStock
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
