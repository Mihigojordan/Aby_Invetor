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
      soldPrice?: number;
      isBackOrder: boolean;
      backOrder: any;
      debtedAmount?: number;
      isDebt?: boolean;
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
        const { stockinId, quantity, soldPrice: overrideSoldPrice, isBackOrder, backOrder, debtedAmount, isDebt } = sale;

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

          const soldPrice = overrideSoldPrice ?? stockin.sellingPrice;
          const totalAmount = soldPrice * quantity;

          // Calculate payment status and debted amount
          let paymentStatus: 'PENDING' | 'SUCCESSFUL' | 'DEBTED' = 'PENDING';
          let finalDebtedAmount: number;

          if (isDebt) {
            // User marked it as debt - entire amount is debted
            finalDebtedAmount = totalAmount;
            paymentStatus = 'DEBTED';
          } else if (debtedAmount !== undefined && debtedAmount !== null) {
            // User provided specific debted amount
            finalDebtedAmount = debtedAmount;

            if (finalDebtedAmount <= 0) {
              // Fully paid
              paymentStatus = 'SUCCESSFUL';
              finalDebtedAmount = 0;
            } else if (finalDebtedAmount > 0 && finalDebtedAmount < totalAmount) {
              // Partially paid - still has debt
              paymentStatus = 'DEBTED';
            } else {
              // Full amount is debted
              paymentStatus = 'DEBTED';
            }
          } else {
            // No debt indication - assume fully paid
            finalDebtedAmount = 0;
            paymentStatus = 'SUCCESSFUL';
          }

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
              paymentMethod: paymentMethod ?? 'MOMO',
              debtedAmount: finalDebtedAmount,
              paymentStatus: paymentStatus
            },
          });

          createdStockouts.push(newStockout);
        } else if (isBackOrder) {
          if (backorderData.quantity === null || backorderData.quantity === undefined) {
            throw new BadRequestException(`Back order quantity is required`);
          }

          if (backorderData.productName === null || backorderData.productName === undefined) {
            throw new BadRequestException(`Product name not set for Back order`);
          }

          // Override sellingPrice if provided in sale
          if (overrideSoldPrice !== undefined) {
            backorderData.sellingPrice = overrideSoldPrice;
          }

          if (backorderData.sellingPrice === null || backorderData.sellingPrice === undefined) {
            throw new BadRequestException(`Selling price not set for Back order`);
          }

          const soldPrice = backorderData.sellingPrice;
          const totalAmount = soldPrice * quantity;

          // Calculate payment status and debted amount
          let paymentStatus: 'PENDING' | 'SUCCESSFUL' | 'DEBTED' = 'PENDING';
          let finalDebtedAmount: number;

          if (isDebt) {
            // User marked it as debt - entire amount is debted
            finalDebtedAmount = totalAmount;
            paymentStatus = 'DEBTED';
          } else if (debtedAmount !== undefined && debtedAmount !== null) {
            // User provided specific debted amount
            finalDebtedAmount = debtedAmount;

            if (finalDebtedAmount <= 0) {
              // Fully paid
              paymentStatus = 'SUCCESSFUL';
              finalDebtedAmount = 0;
            } else if (finalDebtedAmount > 0 && finalDebtedAmount < totalAmount) {
              // Partially paid - still has debt
              paymentStatus = 'DEBTED';
            } else {
              // Full amount is debted
              paymentStatus = 'DEBTED';
            }
          } else {
            // No debt indication - assume fully paid
            finalDebtedAmount = 0;
            paymentStatus = 'SUCCESSFUL';
          }

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
              paymentMethod: paymentMethod || 'CASH',
              backorderId: backorder.backOrder.id,
              debtedAmount: finalDebtedAmount,
              paymentStatus: paymentStatus
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


  async updatePayment(stockoutId: string, paidAmount: number) {
    if (!stockoutId) {
      throw new BadRequestException('Stockout ID is required');
    }

    if (paidAmount === null || paidAmount === undefined || paidAmount < 0) {
      throw new BadRequestException('Valid paid amount is required');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Get the current stockout record
      const stockout = await tx.stockOut.findUnique({
        where: { id: stockoutId },
      });

      if (!stockout) {
        throw new NotFoundException(`Stockout not found for ID: ${stockoutId}`);
      }

      if (!stockout.debtedAmount || stockout.debtedAmount <= 0) {
        throw new BadRequestException('This stockout has no outstanding debt');
      }

      // Calculate new debted amount
      const newDebtedAmount = stockout.debtedAmount - paidAmount;

      // Determine new payment status
      let newPaymentStatus: 'SUCCESSFUL' | 'DEBTED' | 'PENDING' = 'DEBTED';

      if (newDebtedAmount <= 0) {
        // Fully paid
        newPaymentStatus = 'SUCCESSFUL';
      } else {
        // Still has debt
        newPaymentStatus = 'DEBTED';
      }

      // Update the stockout record
      const updatedStockout = await tx.stockOut.update({
        where: { id: stockoutId },
        data: {
          debtedAmount: newDebtedAmount <= 0 ? 0 : newDebtedAmount,
          paymentStatus: newPaymentStatus,
        },
      });

      // Track activity for payment update
      const activityUser =
        stockout.adminId && (await tx.admin.findUnique({ where: { id: stockout.adminId } })) ||
        stockout.employeeId && (await tx.employee.findUnique({ where: { id: stockout.employeeId } }));

      if (activityUser) {
        const name = 'adminName' in activityUser ? activityUser.adminName : activityUser.firstname;

        await this.activityService.createActivity({
          activityName: 'Payment Update',
          description: `${name} updated payment for stockout ${stockoutId}. Paid: ${paidAmount}, Remaining debt: ${updatedStockout.debtedAmount}`,
          adminId: stockout?.adminId as any,
          employeeId: stockout?.employeeId as any,
        });
      }

      return {
        message: newPaymentStatus === 'SUCCESSFUL'
          ? 'Payment completed successfully. No outstanding debt.'
          : `Payment recorded. Remaining debt: ${updatedStockout.debtedAmount}`,
        paymentStatus: newPaymentStatus,
        previousDebt: stockout.debtedAmount,
        paidAmount: paidAmount,
        remainingDebt: updatedStockout.debtedAmount,
        data: updatedStockout,
      };
    });
  }

  // Delta sync support: accepts optional updatedAfter timestamp
  // Returns { data: StockOut[], deletedIds: string[] }
  async getAll(updatedAfter?: string) {
    try {
      const where: any = { deletedAt: null };

      if (updatedAfter) {
        where.updatedAt = { gte: new Date(updatedAfter) };
      }

      const records = await this.prisma.stockOut.findMany({
        where,
        include: {
          stockin: { include: { product: true } },
          backorder: true,
          admin: true,
          employee: true,
        },
      });

      let deletedIds: string[] = [];
      if (updatedAfter) {
        const deletedRecords = await this.prisma.stockOut.findMany({
          where: { deletedAt: { gte: new Date(updatedAfter) } },
          select: { id: true },
        });
        deletedIds = deletedRecords.map((r) => r.id);
      }

      return { data: records, deletedIds };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async getAllDebted() {
    try {
      return await this.prisma.stockOut.findMany({
        include: {
          stockin: {
            include: {
              product: true
            }
          },
          backorder: true,
          admin: true,
          employee: true,
        },
        where: {
          OR: [
            {
              paymentStatus: 'DEBTED'
            },
            {
              AND: [
                {
                  debtedAmount: {
                    not: null
                  }
                },
                {
                  debtedAmount: {
                    gt: 0
                  }
                }
              ]
            }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        }
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
          backorder: true,
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
          backorder: true,
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
      totalPrice: number;
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

      // If quantity or soldPrice is updated, recalculate totalPrice
      let calculatedTotalPrice: number | undefined;
      const newQuantity = data.quantity ?? stockout.quantity;
      const newSoldPrice = data.soldPrice ?? stockout.soldPrice;
      if ((data.quantity !== undefined || data.soldPrice !== undefined) && newQuantity !== null && newSoldPrice !== null) {
        calculatedTotalPrice = newSoldPrice * newQuantity;
      }


      const updateData = {
        quantity: data.quantity ?? stockout.quantity,
        soldPrice: data.soldPrice ?? stockout.soldPrice,

        clientName: data.clientName ?? stockout.clientName,
        clientEmail: data.clientEmail ?? stockout.clientEmail,
        clientPhone: data.clientPhone ?? stockout.clientPhone,
        adminId: data.adminId ?? stockout.adminId,
        employeeId: data.employeeId ?? stockout.employeeId,
      };

      console.log(updateData);



      const updatedStockout = await this.prisma.stockOut.update({
        where: { id },
        data: updateData,
      });

      if (stockout.backorderId) {
        const existingBackOrder = await this.prisma.backOrder.findUnique({ where: { id: stockout.backorderId } })
        if (!existingBackOrder) {
          throw new NotFoundException('backorder was not found')
        }
        await this.prisma.backOrder.update({
          where: { id: existingBackOrder.id },
          data: {
            quantity: data.quantity ?? undefined,
            soldPrice: data.soldPrice ?? undefined,
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
      // Soft delete: mark as deleted so delta sync can return this ID in deletedIds
      const deletedStock = await this.prisma.stockOut.update({ where: { id }, data: { deletedAt: new Date() } });
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