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
    productId: string;
    quantity: number;
    price: number;
    adminId?: string;
    employeeId?: string;
    sellingPrice: number;
    supplier?: string;
  }) {
    const { productId, quantity, price, supplier, sellingPrice } = data;

    if (!productId || !quantity || !price) {
      throw new BadRequestException('Missing required fields');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new NotFoundException('Product not found');

    const sku = generateSKU(String(product.productName));
    const barcodeUrl = await generateAndSaveBarcodeImage(sku);
    const totalPrice = quantity * price;

    const creteatedStockin = await this.prisma.stockIn.create({
      data: {
        productId,
        quantity: Number(quantity),
        price,
        totalPrice: Number(totalPrice),
        supplier,
        sellingPrice: Number(sellingPrice),
        sku,
        barcodeUrl,
        adminId: data.adminId,
        employeeId: data.employeeId,
      },
    });

    if (data.adminId) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: data.adminId },
      });
      if (!admin) {
        throw new HttpException('admin not found', HttpStatus.NOT_FOUND);
      }
      // Track the login activity
      await this.activityService.createActivity({
        activityName: 'admin created stock',
        description: `${admin.adminName} l in successfully`,
        adminId: admin.id,
      });
    }
    if (data.employeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: data.employeeId },
      });
      if (!employee) {
        throw new HttpException('admin not found', HttpStatus.NOT_FOUND);
      }
      // Track the login activity
      await this.activityService.createActivity({
        activityName: 'employee created stock',
        description: `${employee.firstname} created stock successfully`,
        employeeId: employee.id,
      });
    }

    return creteatedStockin;
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
    const stock = await this.prisma.stockIn.findUnique({ where: { id } });
    if (!stock) throw new NotFoundException('Stock not found');

    const totalPrice =
      data.quantity && data.price
        ? data.quantity * data.price
        : stock.totalPrice;

    const updatedStock = await this.prisma.stockIn.update({
      where: { id },
      data: {
        ...data,
        quantity:data.quantity !== undefined ? Number(data.quantity) : stock.quantity,
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
        description: `${admin.adminName} updated stock for product ID: ${stock.productId}`,
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
        description: `${employee.firstname} updated stock for product ID: ${stock.productId}`,
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
    const stock = await this.prisma.stockIn.findUnique({ where: { id } });
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
        description: `${admin.adminName} deleted stock for product ID: ${stock.productId}`,
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
        description: `${employee.firstname} deleted stock for product ID: ${stock.productId}`,
        employeeId: employee.id,
      });
    }
    return deletedStock;
  }
}
