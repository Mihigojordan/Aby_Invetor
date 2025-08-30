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
import { generateAndSaveBarcodeImage } from 'src/common/utils/generate-barcode.util';
import { BackOrderManagementService } from '../backorder-management/backorder-management.service';

@Injectable()
export class StockoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityManagementService,
    private readonly backOrderService: BackOrderManagementService,
  ) { }

async create(data: {
  sales: {
    stockinId: string;
    quantity: number;
    isBackOrder: boolean;
    backOrder: any;
  }[];
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  paymentMethod?;
  adminId?: string;
  employeeId?: string;
}) {
  const { sales, adminId, employeeId, clientEmail, clientName, clientPhone, paymentMethod } = data;
  console.log(data);

  if (!Array.isArray(sales) || sales.length === 0) {
    throw new BadRequestException('At least one sale is required');
  }

  const transactionId = generateStockSKU('abyride', 'transaction');
  const createdStockouts: Awaited<ReturnType<typeof this.prisma.stockOut.create>>[] = [];

  // Use a database transaction to ensure atomicity
  return await this.prisma.$transaction(async (tx) => {
    for (const sale of sales) {
      const { stockinId, quantity, isBackOrder, backOrder } = sale;

      const backorderData = {
        ...backOrder,
        adminId,
        employeeId
      };

      if (stockinId) {
        // First, get the current stock with a lock for update
        const stockin = await tx.stockIn.findUnique({
          where: { id: stockinId },
        });

        if (!stockin) {
          throw new NotFoundException(`Stockin not found for ID: ${stockinId}`);
        }

        if (stockin.quantity === null || stockin.quantity === undefined) {
          throw new BadRequestException(`Stockin quantity not set for stockin ID: ${stockinId}`);
        }

        if (stockin.quantity < quantity) {
          throw new BadRequestException(`Not enough stock for product with ID: ${stockinId}. Available: ${stockin.quantity}, Requested: ${quantity}`);
        }

        if (stockin.sellingPrice === null || stockin.sellingPrice === undefined) {
          throw new BadRequestException(`Selling price not set for stockin ID: ${stockinId}`);
        }

        console.log('quantity of stockin Stock in : ' + stockin.id, stockin.quantity);

        // Use atomic decrement operation to prevent race conditions
        const updatedStock = await tx.stockIn.updateMany({
          where: {
            id: stockinId,
            quantity: { gte: quantity } // Only update if we still have enough stock
          },
          data: {
            quantity: { decrement: quantity }
          }
        });

        // Check if the update actually happened (count should be 1)
        if (updatedStock.count === 0) {
          throw new BadRequestException(`Insufficient stock for product with ID: ${stockinId}. Another transaction may have reduced the stock.`);
        }

        console.log('Stock updated successfully for stockin:', stockinId);

        const soldPrice = stockin.sellingPrice * quantity;

        const newStockout = await tx.stockOut.create({
          data: {
            stockinId,
            quantity,
            soldPrice,
            clientName,
            clientEmail,
            clientPhone,
            adminId,
            employeeId,
            transactionId,
            paymentMethod
          },
        });

        createdStockouts.push(newStockout);
      }
      else if (isBackOrder) {
        if (backorderData.quantity === null || backorderData.quantity === undefined) {
          throw new BadRequestException(`Back order quantity is required`);
        }

        if (backorderData.sellingPrice === null || backorderData.sellingPrice === undefined) {
          throw new BadRequestException(`Selling price not set for Back order`);
        }

        if (backorderData.productName === null || backorderData.productName === undefined) {
          throw new BadRequestException(`Product name not set for Back order`);
        }

        const soldPrice = backorderData.sellingPrice * quantity;

        const backorder = await this.backOrderService.createBackOrder(backorderData);

        const newStockout = await tx.stockOut.create({
          data: {
            stockinId,
            quantity,
            soldPrice,
            clientName,
            clientEmail,
            clientPhone,
            adminId,
            employeeId,
            transactionId,
            paymentMethod,
            backorderId: backorder.backOrder.id
          },
        });

        createdStockouts.push(newStockout);
      }
    }

    // Generate barcode after successful transaction
    await generateAndSaveBarcodeImage(String(transactionId));

    // Track activity once for the entire transaction
    const activityUser =
      adminId && (await tx.admin.findUnique({ where: { id: adminId } })) ||
      employeeId && (await tx.employee.findUnique({ where: { id: employeeId } }));

    if (!activityUser) {
      throw new NotFoundException('Admin or Employee not found');
    }

    const name = 'adminName' in activityUser ? activityUser.adminName : activityUser.firstname;

    await this.activityService.createActivity({
      activityName: 'Bulk Stock Out',
      description: `${name} created ${createdStockouts.length} stock out records under transaction ${transactionId}`,
      adminId,
      employeeId,
    });

    console.log('Transaction completed successfully', createdStockouts);

    return {
      message: 'Stock out transaction completed successfully',
      transactionId,
      data: createdStockouts,
    };
  });
}

  async getAll() {
    try {
      return await this.prisma.stockOut.findMany({
        include: {
          stockin: {
            include: {
              product: true
            }
          },
          backorder:true,
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
          stockin: {
            include: {
              product: {
                include: {
                  category: true,

                }
              }, // include product via stockin
            },
          },
          backorder:true,
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



  async getStockOutByTransactionId(id: string) {
    try {
      if (!id) {
        throw new HttpException('id is required', HttpStatus.BAD_REQUEST)
      }

      const stockouts = await this.prisma.stockOut.findMany({
        where: { transactionId: id },
        include: {
          stockin: {
            include: {
              product: true, // include product via stockin
            },
          },
          backorder:true,
          admin: true,
          employee: true,

        }
      })
      return stockouts
    } catch (error) {
      throw new HttpException(error.message, error.status)
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
      if(stockout.backorderId){

        const existingBackOrder = await this.prisma.backOrder.findUnique({where:{ id:stockout.backorderId }})
        if(!existingBackOrder){
          throw new NotFoundException('backorder was not found') 
        }
        await this.prisma.backOrder.update({
          where:{id:existingBackOrder.id},
          data:{
            quantity: data.quantity || undefined
          }
        })


      }
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
