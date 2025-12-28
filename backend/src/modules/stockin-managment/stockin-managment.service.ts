import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { generateAndSaveBarcodeImage } from 'src/common/utils/generate-barcode.util';
import { generateSKU } from 'src/common/utils/generate-sku.util';
import { StockIn } from '@prisma/client';


@Injectable()
export class StockinManagmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityManagementService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ================= CREATE MULTIPLE STOCK =================
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

    const createdStocks: StockIn[] = [];

    for (const purchase of purchases) {
      const { productId, quantity, price, sellingPrice, supplier } = purchase;

      if (!productId || quantity == null || price == null) {
        throw new BadRequestException('Missing required fields in purchase item');
      }

      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException(`Product not found for ID: ${productId}`);

      const sku = generateSKU(String(product.productName));
      const barcodeUrl = await generateAndSaveBarcodeImage(sku);
      const totalPrice = Number(quantity) * Number(price);

      const createdStock = await this.prisma.stockIn.create({
        data: {
          productId,
          quantity: Number(quantity),
          price: Number(price),
          sellingPrice: Number(sellingPrice),
          totalPrice,
          supplier: supplier ?? null,
          sku,
          barcodeUrl,
          adminId: adminId ?? null,
          employeeId: employeeId ?? null,
        },
      });

      createdStocks.push(createdStock);
    }

    // Activity Logging
    const activityUser =
      (adminId && (await this.prisma.admin.findUnique({ where: { id: adminId } }))) ||
      (employeeId && (await this.prisma.employee.findUnique({ where: { id: employeeId } })));

    if (!activityUser) throw new NotFoundException('Admin or Employee not found');

    await this.activityService.createActivity({
      activityName: 'Multiple Stock Purchases',
      description: `${'adminName' in activityUser ? activityUser.adminName : activityUser.firstname} created ${createdStocks.length} stock purchase(s)`,
      adminId,
      employeeId,
    });

    await this.safeCacheReset();

    return { message: 'Multiple stock purchases created successfully', data: createdStocks };
  }

  // ================= PAGINATED GET =================
  async getAll(page = 1, limit = 10) {
    const cacheKey = `stockin_page_${page}_limit_${limit}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const [stocks, total] = await Promise.all([
      this.prisma.stockIn.findMany({
        skip,
        take: limit,
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockIn.count(),
    ]);

    const result = { data: stocks, total, page, totalPages: Math.ceil(total / limit) };
    await this.cacheManager.set(cacheKey, result, 30); // TTL 30 seconds

    return result;
  }

  // ================= GET ONE =================
  async getOne(id: string) {
    const stock = await this.prisma.stockIn.findUnique({ where: { id }, include: { product: true } });
    if (!stock) throw new NotFoundException('Stock not found');
    return stock;
  }

  // ================= UPDATE =================
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
    const stock = await this.prisma.stockIn.findUnique({ where: { id }, include: { product: true } });
    if (!stock) throw new NotFoundException('Stock not found');

    const totalPrice = data.quantity != null && data.price != null
      ? Number(data.quantity) * Number(data.price)
      : stock.totalPrice;

    const updatedStock = await this.prisma.stockIn.update({
      where: { id },
      data: {
        quantity: data.quantity != null ? Number(data.quantity) : stock.quantity,
        price: data.price != null ? Number(data.price) : stock.price,
        sellingPrice: data.sellingPrice != null ? Number(data.sellingPrice) : stock.sellingPrice,
        supplier: data.supplier ?? stock.supplier,
        totalPrice,
      },
    });

    // Activity Logging
    if (data.adminId) {
      const admin = await this.prisma.admin.findUnique({ where: { id: data.adminId } });
      if (!admin) throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Stock Updated',
        description: `${admin.adminName} updated stock for product ${stock.product?.productName}`,
        adminId: admin.id,
      });
    }

    if (data.employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: data.employeeId } });
      if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Stock Updated',
        description: `${employee.firstname} updated stock for product ${stock.product?.productName}`,
        employeeId: employee.id,
      });
    }

    await this.safeCacheReset();
    return updatedStock;
  }

  // ================= DELETE =================
  async delete(id: string, data?: { adminId?: string; employeeId?: string }) {
    const stock = await this.prisma.stockIn.findUnique({ where: { id }, include: { product: true } });
    if (!stock) throw new NotFoundException('Stock not found');

    const deletedStock = await this.prisma.stockIn.delete({ where: { id } });

    // Activity Logging
    if (data?.adminId) {
      const admin = await this.prisma.admin.findUnique({ where: { id: data.adminId } });
      if (!admin) throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Stock Deleted',
        description: `${admin.adminName} deleted stock for product ${stock.product?.productName}`,
        adminId: admin.id,
      });
    }

    if (data?.employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: data.employeeId } });
      if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Stock Deleted',
        description: `${employee.firstname} deleted stock for product ${stock.product?.productName}`,
        employeeId: employee.id,
      });
    }

    await this.safeCacheReset();
    return deletedStock;
  }

  // ================= GET BY SKU =================
  async getStockInBysku(sku: string) {
    if (!sku) throw new HttpException('SKU is required', HttpStatus.BAD_REQUEST);

    const stockin = await this.prisma.stockIn.findFirst({
      where: { sku },
      include: { product: true },
    });

    if (!stockin) throw new NotFoundException('Stock not found for this SKU');
    return stockin;
  }

  // ================= SAFE CACHE RESET =================
  private async safeCacheReset() {
    try {
      // @ts-ignore
      if (this.cacheManager.store && typeof this.cacheManager.store.reset === 'function') {
        await (this.cacheManager.stores as any).reset();
      } else {
        console.warn('Cache store does not support reset');
      }
    } catch (err) {
      console.error('Error resetting cache:', err);
    }
  }
}
