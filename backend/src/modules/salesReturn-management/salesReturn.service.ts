import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SalesReturnService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a new sales return
  async create(data: { sku: string; reason?: string; createdAt?: Date }) {
    try {
      const { sku, reason, createdAt } = data;

      if (!sku) throw new BadRequestException('SKU is required');
    //   if (!createdAt) throw new BadRequestException('createdAt is required');

      // Step 1: Find StockOut by SKU
      const stockout = await this.prisma.stockOut.findFirst({
        where: { sku },
      });

      if (!stockout)
        throw new BadRequestException('StockOut with this SKU not found');

      // Step 2: Find related StockIn using stockout.stockinId
      const stockin = await this.prisma.stockIn.findUnique({
        where: { id: String(stockout.stockinId) },
      });

      if (!stockin) throw new BadRequestException('Related StockIn not found');

      // Step 3: Update StockIn quantity by adding back the StockOut quantity
      await this.prisma.stockIn.update({
        where: { id: stockin.id },
        data: {
          quantity: (stockin.quantity ?? 0) + (stockout.quantity ?? 0),
        },
      });

      // Step 4: Create SalesReturn
      const newReturn = await this.prisma.salesReturn.create({
        data: {
          stockoutId: stockout.id,
          reason,
          createdAt: createdAt ? createdAt : new Date().toISOString(),
        },
      });

      return {
        message: 'Sales return processed successfully',
        data: newReturn,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
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
