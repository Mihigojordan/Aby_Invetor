import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Injectable()
export class SalesReturnService {
  constructor(private readonly prisma: PrismaService , private readonly activityService:ActivityManagementService ) {}

  // Create a new sales return
  async create(data: {
    returns: { transactionId: string; reason?: string; createdAt?: Date }[];
    adminId?: string;
    employeeId?: string;
  }) {
    const result: {
      success: { transactionId: string; returnId: string }[];
      errors: { transactionId: string; error: string }[];
    } = {
      success: [],
      errors: [],
    };

    const { returns, adminId, employeeId } = data;

    const activityUser =
      (adminId && (await this.prisma.admin.findUnique({ where: { id: adminId } }))) ||
      (employeeId && (await this.prisma.employee.findUnique({ where: { id: employeeId } })));

    if (!activityUser) {
      throw new NotFoundException('Admin or Employee not found');
    }

    for (const item of returns) {
      const { transactionId, reason, createdAt } = item;

      try {
        if (!transactionId) throw new Error('transactionId is required');

        const stockout = await this.prisma.stockOut.findFirst({
          where: { transactionId },
        });

        if (!stockout)
          throw new Error(`StockOut not found for ${transactionId}`);

        const stockin = await this.prisma.stockIn.findUnique({
          where: { id: String(stockout.stockinId) },
        });

        if (!stockin) throw new Error(`StockIn not found for ${transactionId}`);

        await this.prisma.stockIn.update({
          where: { id: stockin.id },
          data: {
            quantity: (stockin.quantity ?? 0) + (stockout.quantity ?? 0),
          },
        });

        const newReturn = await this.prisma.salesReturn.create({
          data: {
            stockoutId: stockout.id,
            reason,
            createdAt: createdAt ?? new Date(),
          },
        });

        result.success.push({ transactionId, returnId: newReturn.id });
      } catch (error) {
        result.errors.push({ transactionId, error: error.message });
      }
    }

    await this.activityService.createActivity({
      activityName: 'Sales Return',
      description: `${'adminName' in activityUser ? activityUser.adminName : activityUser.firstname} processed ${returns.length} sales return(s)`,
      adminId,
      employeeId,
    });

    return {
      message: 'Bulk sales return processing completed',
      ...result,
    };
  }

  // Get all sales returns
  async findAll() {
    try {
      const returns = await this.prisma.salesReturn.findMany({
        include: {
          stockout: true,
        },
      });

      return {
        message: 'Sales returns retrieved successfully',
        data: returns,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Get a single sales return by ID
  async findOne(id: string) {
    try {
      if (!id) throw new BadRequestException('ID is required');

      const returnItem = await this.prisma.salesReturn.findUnique({
        where: { id },
        include: {
          stockout: true,
        },
      });

      if (!returnItem) {
        throw new NotFoundException('Sales return not found');
      }

      return {
        message: 'Sales return retrieved successfully',
        data: returnItem,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
