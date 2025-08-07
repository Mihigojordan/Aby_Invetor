import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateAndSaveBarcodeImage } from 'src/common/utils/generate-barcode.util';
import { generateSKU } from 'src/common/utils/generate-sku.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Injectable()
export class StockinManagmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityManagementService,
  ) {}

  async register(data: {
    purchases: {
      productId: string;
      quantity: number;
      price: number;
      sellingPrice: number;
      supplier?: string;
    }[];
    adminId?: string;
    employeeId?: string;
  }) {
    const { purchases, adminId, employeeId } = data;

    if (!Array.isArray(purchases) || purchases.length === 0) {
      throw new BadRequestException('At least one purchase is required');
    }

    const createdStocks: Awaited<ReturnType<typeof this.prisma.stockIn.create>>[] = [];

    for (const purchase of purchases) {
      const { productId, quantity, price, sellingPrice, supplier } = purchase;

      if (!productId || !quantity || !price) {
        throw new BadRequestException(
          'Missing required fields in purchase item',
        );
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product)
        throw new NotFoundException(`Product not found for ID: ${productId}`);

      const sku = generateSKU(String(product.productName));
      const barcodeUrl = await generateAndSaveBarcodeImage(sku);
      const totalPrice = quantity * price;

      const createdStock = await this.prisma.stockIn.create({
        data: {
          productId,
          quantity: Number(quantity),
          price,
          totalPrice: Number(totalPrice),
          supplier,
          sellingPrice: Number(sellingPrice),
          sku,
          barcodeUrl,
          adminId,
          employeeId,
        },
      });

      createdStocks.push(createdStock);
    }

    // Activity Tracking
    const activityUser =
      (adminId &&
        (await this.prisma.admin.findUnique({ where: { id: adminId } }))) ||
      (employeeId &&
        (await this.prisma.employee.findUnique({ where: { id: employeeId } })));

    if (!activityUser) {
      throw new NotFoundException('Admin or Employee not found');
    }

    await this.activityService.createActivity({
      activityName: 'Multiple Stock Purchases',
      description: `${'adminName' in activityUser ? activityUser.adminName : activityUser.firstname} created ${createdStocks.length} stock purchase(s)`,
      adminId: adminId,
      employeeId: employeeId,
    });

    return {
      message: 'Multiple stock purchases created successfully',
      data: createdStocks,
    };
  }

  async getAll() {
    return this.prisma.stockIn.findMany({
      include: {
        product: true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      quantity: number;
      price: number;
      supplier: string;
      sellingPrice: number;
      adminId: string;
      employeeId: string;
    }>,
  ) {
    const stock = await this.prisma.stockIn.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!stock) throw new NotFoundException('Stock not found');

    const totalPrice =
      data.quantity && data.price
        ? data.quantity * data.price
        : stock.totalPrice;

    const updatedStock = await this.prisma.stockIn.update({
      where: { id },
      data: {
        ...data,
        quantity:
          data.quantity !== undefined ? Number(data.quantity) : stock.quantity,
        price: data.price !== undefined ? Number(data.price) : stock.price,
        sellingPrice: Number(data.sellingPrice),
        totalPrice,
      },
    });

    // Activity tracking
    if (data.adminId) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: data.adminId },
      });
      if (!admin)
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

      await this.activityService.createActivity({
        activityName: 'Stock Updated',
        description: `${admin.adminName} updated stock for product called ${stock.product?.productName}`,
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
        activityName: 'Stock Updated',
        description: `${employee.firstname} updated stock for product called ${stock.product?.productName}`,
        employeeId: employee.id,
      });
    }

    return updatedStock;
  }

  async getOne(id: string) {
    const stock = await this.prisma.stockIn.findUnique({ where: { id } });
    if (!stock) throw new NotFoundException('Stock not found');
    return stock;
  }

  async delete(id: string, data?: { adminId?: string; employeeId?: string }) {
    const stock = await this.prisma.stockIn.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!stock) throw new NotFoundException('Stock not found');

    const deletedStock = await this.prisma.stockIn.delete({ where: { id } });

    // Activity tracking
    if (data?.adminId) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: data.adminId },
      });
      if (!admin)
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

      await this.activityService.createActivity({
        activityName: 'Stock Deleted',
        description: `${admin.adminName} deleted stock for product called ${stock.product?.productName}`,
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
        activityName: 'Stock Deleted',
        description: `${employee.firstname} deleted stock for product called ${stock.product?.productName}`,
        employeeId: employee.id,
      });
    }
    return deletedStock;
  }


  async getStockInBysku(sku: string){
      try {
        if (!sku) {
          throw new HttpException('id is required', HttpStatus.BAD_REQUEST)
        }
        const stockin = await this.prisma.stockIn.findFirst({
          where: {
            sku: sku
          },
          include: {
            product:true,
          }
        })
        console.log(stockin);
        
        return stockin
      } catch (error) {
        throw new HttpException(error.message, error.status)
      }
    }
}
