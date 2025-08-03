import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      totalCategories,
      totalProducts,
      totalEmployees,
      totalSalesReturns,
    ] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.product.count(),
      this.prisma.employee.count(),
      this.prisma.salesReturn.count(),
    ]);

    // Most used category (by number of products)
    const mostUsedCategory = await this.prisma.category.findFirst({
      orderBy: {
        product: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: {
            product: true,
          },
        },
      },
    });

    // Total stockIn quantity
    const stockInAgg = await this.prisma.stockIn.aggregate({
      _sum: {
        quantity: true,
      },
    });

    // Total stockOut quantity
    const stockOutAgg = await this.prisma.stockOut.aggregate({
      _sum: {
        quantity: true,
      },
    });

    // Product with most stockIn quantity
    const stockInCountByProduct = await this.prisma.stockIn.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 1,
    });

    const mostStockedInProduct = stockInCountByProduct[0]
      ? await this.prisma.product.findUnique({
          where: {
            id: stockInCountByProduct[0].productId,
          },
        })
      : null;

    // Get all products and calculate actual stock (stockIn - stockOut)
    const allProducts = await this.prisma.product.findMany({
      include: {
        stockIn: {
          include: {
            stockout: true,
          },
        },
      },
    });

    const stockLevels = allProducts.map((product) => {
      const totalStockIn = product.stockIn.reduce(
        (acc, stockIn) => acc + (stockIn.quantity || 0),
        0,
      );

      const totalStockOut = product.stockIn.reduce((acc, stockIn) => {
        const outQty = stockIn.stockout?.reduce(
          (sum, so) => sum + (so.quantity || 0),
          0,
        );
        return acc + outQty;
      }, 0);

      return {
        productId: product.id,
        productName: product.productName,
        stock: totalStockIn - totalStockOut,
      };
    });

    // Sort stock levels
    const sortedStock = [...stockLevels].sort((a, b) => a.stock - b.stock);
    const lowStock = sortedStock.slice(0, 5); // lowest 5
    const highStock = sortedStock.slice(-5).reverse(); // highest 5

    return {
      totalCategories,
      totalProducts,
      totalEmployees,
      totalSalesReturns,
      totalStockIn: stockInAgg._sum.quantity || 0,
      totalStockOut: stockOutAgg._sum.quantity || 0,
      mostUsedCategory: mostUsedCategory
        ? {
            name: mostUsedCategory.name,
            usageCount: mostUsedCategory._count.product,
          }
        : null,
      mostStockedInProduct: mostStockedInProduct
        ? {
            id: mostStockedInProduct.id,
            name: mostStockedInProduct.productName,
          }
        : null,
      lowStock,
      highStock,
    };
  }
}
