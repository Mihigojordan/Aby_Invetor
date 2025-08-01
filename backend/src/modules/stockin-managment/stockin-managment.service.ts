import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateAndSaveBarcodeImage } from 'src/common/utils/generate-barcode.util';
import { generateSKU } from 'src/common/utils/generate-sku.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StockinManagmentService {
  constructor(private readonly prisma: PrismaService) {}

  async register(data: {
    productId: string;
    quantity: number;
    price: number;
    adminId?: string;
    employeeId?: string;
    sellingPrice: number;
    supplier?: string;
  }) {
    const { productId, quantity, price, supplier , sellingPrice } = data;

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

    return await this.prisma.stockIn.create({
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
        employeeId: data.employeeId
      },
    });
  }

  async getAll() {
    return this.prisma.stockIn.findMany({
      include: {
        product: true,
      },
    });
  }

  async update(id: string, data: Partial<{ quantity: number; price: number; supplier: string }>) {
    const stock = await this.prisma.stockIn.findUnique({ where: { id } });
    if (!stock) throw new NotFoundException('Stock not found');

    const totalPrice = data.quantity && data.price
      ? data.quantity * data.price
      : stock.totalPrice;

    return this.prisma.stockIn.update({
      where: { id },
      data: {
        ...data,
        quantity: Number(data.quantity),
        totalPrice,
      },
    });
  }

  async getOne(id: string) {
    const stock = await this.prisma.stockIn.findUnique({ where: { id } });
    if (!stock) throw new NotFoundException('Stock not found');
    return stock;
  }

  async delete(id: string) {
    const stock = await this.prisma.stockIn.findUnique({ where: { id } });
    if (!stock) throw new NotFoundException('Stock not found');

    return this.prisma.stockIn.delete({ where: { id } });
  }
}
