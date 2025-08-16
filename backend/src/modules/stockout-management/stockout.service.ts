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

@Injectable()
export class StockoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityManagementService,
  ) {}

  async create(data: {
  sales: {
    stockinId: string;
    quantity: number;
  }[];
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  paymentMethod?;
  adminId?: string;
  employeeId?: string;
}) {
  const { sales, adminId, employeeId , clientEmail,clientName,clientPhone , paymentMethod } = data;
  console.log('recieved data:', data)

  if (!Array.isArray(sales) || sales.length === 0) {
    throw new BadRequestException('At least one sale is required');
  }

  const transactionId = generateStockSKU('abyride','transaction') ;
  const createdStockouts: Awaited<ReturnType<typeof this.prisma.stockOut.create>>[] = [];

  for (const sale of sales) {
    const { stockinId, quantity } = sale;

    const stockin = await this.prisma.stockIn.findUnique({
      where: { id: stockinId },
    });

    if (!stockin) {
      throw new NotFoundException(`Stockin not found for ID: ${stockinId}`);
    }

    if (stockin.quantity === null || stockin.quantity === undefined) {
      throw new BadRequestException(`Stockin quantity not set for stockin ID: ${stockinId}`);
    }

    if (stockin.quantity < quantity) {
      throw new BadRequestException(`Not enough stock for product with ID: ${stockinId}`);
    }

    if (stockin.sellingPrice === null || stockin.sellingPrice === undefined) {
      throw new BadRequestException(`Selling price not set for stockin ID: ${stockinId}`);
    }

    const updatedStock = await this.prisma.stockIn.update({
      where: { id: stockinId },
      data: {
        quantity: stockin.quantity - quantity,
      },
    });

    const soldPrice = stockin.sellingPrice * quantity;

    const newStockout = await this.prisma.stockOut.create({
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
    await generateAndSaveBarcodeImage(String(transactionId))
  }

  // Track activity once for the entire transaction
  const activityUser =
    adminId && (await this.prisma.admin.findUnique({ where: { id: adminId } })) ||
    employeeId && (await this.prisma.employee.findUnique({ where: { id: employeeId } }));

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

  return {
    message: 'Stock out transaction completed successfully',
    transactionId,
    data: createdStockouts,
  };
}

  async getAll() {
    try {
      return await this.prisma.stockOut.findMany({
        include: {
          stockin: {
            include:{
              product:true
            }
          },
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


  
  async getStockOutByTransactionId(id: string){
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
