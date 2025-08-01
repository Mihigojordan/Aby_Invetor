import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { generateStockSKU } from 'src/common/utils/generate-sku.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StockoutService {
  constructor(private readonly prisma: PrismaService) {}

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

      const sku = generateStockSKU('abyride', String(data.clientName))

      return await this.prisma.stockOut.create({
        data: {
          ...data,
          sku: sku,
          soldPrice: soldPrice
        },
      });
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
    }>,
  ) {
    try {
      const stockout = await this.prisma.stockOut.findUnique({ where: { id } });
      if (!stockout) throw new NotFoundException('StockOut not found');

      return await this.prisma.stockOut.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async delete(id: string) {
    try {
      const stockout = await this.prisma.stockOut.findUnique({ where: { id } });
      if (!stockout) throw new NotFoundException('StockOut not found');

      return await this.prisma.stockOut.delete({ where: { id } });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
