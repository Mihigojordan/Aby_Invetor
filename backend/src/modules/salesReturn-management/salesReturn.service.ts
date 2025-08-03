import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';
import { generateSKU, generateStockSKU } from 'src/common/utils/generate-sku.util';

@Injectable()
export class SalesReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityManagementService,
  ) {}

  // Create a new sales return
  async create(data: {
    transactionId: string;
    reason?: string;
    createdAt?: Date;
    items: { stockoutId: string; quantity: number }[];
    adminId?: string;
    employeeId?: string;
  }) {
    const {
      transactionId,
      reason,
      createdAt,
      items,
      adminId,
      employeeId,
    } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item must be provided');
    }

    const activityUser =
      (adminId &&
        (await this.prisma.admin.findUnique({ where: { id: adminId } }))) ||
      (employeeId &&
        (await this.prisma.employee.findUnique({ where: { id: employeeId } })));

    if (!activityUser) {
      throw new NotFoundException('Admin or Employee not found');
    }

    const success: { stockoutId: string; itemId: string }[] = [];
    const errors: { stockoutId: string; error: string }[] = [];

    const creditnoteId = await generateStockSKU('credit','inventory')

    // Create SalesReturn first
    const salesReturn = await this.prisma.salesReturn.create({
      data: {
        transactionId,
        reason,
        creditnoteId: creditnoteId,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      },
    });

    for (const item of items) {
      const { stockoutId, quantity } = item;

      try {
        const stockout = await this.prisma.stockOut.findUnique({
          where: { id: stockoutId },
        });

        if (!stockout) throw new Error('Invalid stockoutId');

        if (quantity > (stockout.quantity ?? 0)) {
          throw new Error(
            `Returned quantity ${quantity} exceeds stockout quantity ${stockout.quantity ?? 0}`,
          );
        }

        const stockin = await this.prisma.stockIn.findUnique({
          where: { id: stockout.stockinId ?? '' },
        });

        if (!stockin) throw new Error('Related stockin not found');

        // Update StockIn quantity
        await this.prisma.stockIn.update({
          where: { id: stockin.id },
          data: {
            quantity: (stockin.quantity ?? 0) + quantity,
          },
        });

        // Subtract from StockOut
        await this.prisma.stockOut.update({
          where: { id: stockout.id },
          data: {
            quantity: (stockout.quantity ?? 0) - quantity,
          },
        });

        // Create SalesReturnItem
        const returnItem = await this.prisma.salesReturnItem.create({
          data: {
            salesReturnId: salesReturn.id,
            stockoutId,
            quantity,
          },
        });

        success.push({ stockoutId, itemId: returnItem.id });
      } catch (error) {
        errors.push({ stockoutId, error: error.message });
      }
    }

    await this.activityService.createActivity({
      activityName: 'Sales Return',
      description: `${'adminName' in activityUser ? activityUser.adminName : activityUser.firstname} processed a sales return with ${success.length} item(s)`,
      adminId,
      employeeId,
    });

    return {
      message: 'Sales return processed',
      transactionId: transactionId,
      salesReturn,
      success,
      errors,
    };
  }

  // Get all sales returns
  async findAll() {
    try {
      const returns = await this.prisma.salesReturn.findMany({
        include:{
          items: {
            include:{
              stockout: {
                include:{
                  stockin:{
                    include:{
                      product:true
                    }
                  }
                }
              }
            }
          }
        }
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
        include:{
          items: {
            include:{
              stockout: {
                include:{
                  stockin:{
                    include:{
                      product:true
                    }
                  }
                }
              }
            }
          }
        }
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
