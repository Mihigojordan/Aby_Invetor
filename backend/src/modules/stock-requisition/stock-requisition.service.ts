import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StockRequisitionStatus, StockReceivingStatus } from '@prisma/client';
import { generateSKU } from 'src/common/utils/generate-sku.util';
import { generateAndSaveBarcodeImage } from 'src/common/utils/generate-barcode.util';

@Injectable()
export class StockRequisitionService {
  constructor(private prisma: PrismaService) {}

  // ───────────────────────────────────
  // CREATE STOCK REQUISITION
  // ───────────────────────────────────
  async createStockRequisition(data: {
    employeeId: string;
    description?: string;
    items: {
      itemName: string;
      quantity: number;
      categoryId?:string;
      note?: string;
      stockId?: string;
    }[];
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Stock requisition must have at least one item');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    return this.prisma.stockRequisition.create({
      data: {
        employeeId: data.employeeId,
        description: data.description,
        status: StockRequisitionStatus.PENDING,
        items: {
          create: data.items.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            note: item.note,
            categoryId: item?.categoryId,
            stockId: item.stockId || null,
            receivedQty: 0,
            receivingStatus: StockReceivingStatus.NOT_RECEIVED,
          })),
        },
      },
      include: {
        items: {
          include: {
            stock: true,
            receivingLogs: {
              include: { receivedBy: true },
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
        employee: true,
      },
    });
  }

  // ───────────────────────────────────
  // UPDATE PENDING REQUISITION (Employee Only)
  // ───────────────────────────────────
  async updateStockRequisition(
    id: string,
    employeeId: string,
    data: {
      description?: string;
      items?: {
        id?: string;
        remove?: boolean;
        itemName?: string;
        quantity?: number;
        categoryId?:string;
        note?: string;
        stockId?: string;
      }[];
    },
  ) {
    const requisition = await this.prisma.stockRequisition.findFirst({
      where: { id, employeeId },
      include: { items: true },
    });

    if (!requisition) {
      throw new NotFoundException('Stock requisition not found');
    }

    if (requisition.status !== StockRequisitionStatus.PENDING) {
      throw new ForbiddenException('Only pending requisitions can be updated');
    }

    // Update description
    if (data.description !== undefined) {
      await this.prisma.stockRequisition.update({
        where: { id },
        data: { description: data.description },
      });
    }

    // Update items
    if (data.items) {
      for (const item of data.items) {
        // Remove item
        if (item.remove && item.id) {
          await this.prisma.stockRequisitionItem.delete({
            where: { id: item.id },
          });
          continue;
        }

        // Update existing item
        if (item.id) {
          await this.prisma.stockRequisitionItem.update({
            where: { id: item.id },
            data: {
              itemName: item.itemName,
              quantity: item.quantity,
              note: item.note,
              categoryId: item?.categoryId,
              stockId: item.stockId || null,
            },
          });
        } else {
          // Create new item
          await this.prisma.stockRequisitionItem.create({
            data: {
              requisitionId: id,
              itemName: item.itemName as any,
              quantity: item.quantity  as any,
              note: item.note,
              stockId: item.stockId || null,
                categoryId: item?.categoryId,
              receivedQty: 0,
              receivingStatus: StockReceivingStatus.NOT_RECEIVED,
            },
          });
        }
      }
    }

    return this.prisma.stockRequisition.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            stock: true,
            receivingLogs: {
              include: { receivedBy: true },
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
        employee: true,
      },
    });
  }

  // ───────────────────────────────────
  // APPROVE REQUISITION
  // ───────────────────────────────────
  async approveStockRequisition(
    id: string,
    body?: {
      items?: {
        id?: string;
        remove?: boolean;
        itemName?: string;
        quantity?: number;
        categoryId?:string;
        note?: string;
        sellingPrice?:string;
        price?:string;
        stockId?: string;
      }[];
    },
  ) {

    const requisition = await this.prisma.stockRequisition.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!requisition) {
      throw new NotFoundException('Stock requisition not found');
    }

    if (requisition.status !== StockRequisitionStatus.PENDING) {
      throw new ForbiddenException('Only pending requisitions can be approved');
    }

    // Apply admin edits if provided
    if (body?.items) {
      for (const item of body.items) {
        if (item.remove && item.id) {
          await this.prisma.stockRequisitionItem.delete({
            where: { id: item.id },
          });
          continue;
        }

        if (item.id) {
          await this.prisma.stockRequisitionItem.update({
            where: { id: item.id },
            data: {
              itemName: item.itemName,
              quantity: item.quantity,
              categoryId:item.categoryId,
              sellingPrice:String(item?.sellingPrice) || '0',
              price: String(item?.price) || '0',
            
              note: item.note,
              stockId: item.stockId || null,
            },
          });
        } else {
          await this.prisma.stockRequisitionItem.create({
            data: {
              requisitionId: id,
              itemName: item.itemName as any,
              quantity: item.quantity as any,
              note: item.note,
              stockId: item.stockId || null,
              categoryId:item?.categoryId,
              sellingPrice:String(item?.sellingPrice) || '0',
              price: String(item?.price) || '0',
              receivedQty: 0,
              receivingStatus: StockReceivingStatus.NOT_RECEIVED,
            },
          });
        }
      }
    }

    return this.prisma.stockRequisition.update({
      where: { id },
      data: {
        status: StockRequisitionStatus.APPROVED,
        approvedAt: new Date(),
      },
      include: {
        items: {
          include: {
            stock: true,
            receivingLogs: {
              include: { receivedBy: true },
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
        employee: true,
      },
    });
  }

  // ───────────────────────────────────
  // RECEIVE ITEMS
  // ───────────────────────────────────
async receiveItems(
  requisitionId: string,
  receivedById: string,
  items: {
    itemId: string;
    receivedQty: number;
    note?: string;
  }[],
) {
  const requisition = await this.prisma.stockRequisition.findUnique({
    where: { id: requisitionId },
    include: { items: true },
  });

  if (!requisition) {
    throw new NotFoundException('Stock requisition not found');
  }

  if (
    requisition.status !== StockRequisitionStatus.APPROVED &&
    requisition.status !== StockRequisitionStatus.PARTIALLY_RECEIVED
  ) {
    throw new ForbiddenException('Only approved requisitions can be received');
  }

  for (const receiveData of items) {
    const item = requisition.items.find(i => i.id === receiveData.itemId);

    if (!item) {
      throw new BadRequestException(`Item ${receiveData.itemId} not found`);
    }

    const newReceivedQty = item.receivedQty + receiveData.receivedQty;

    if (newReceivedQty > item.quantity) {
      throw new BadRequestException(
        `Cannot receive more than requested for ${item.itemName}`,
      );
    }

    /** ─────────────────────────────
     * CREATE RECEIVING LOG
     * ───────────────────────────── */
    await this.prisma.receivingLog.create({
      data: {
        requisitionItemId: item.id,
        receivedQty: receiveData.receivedQty,
        receivedById,
        note: receiveData.note,
      },
    });

    /** ─────────────────────────────
     * STOCK HANDLING
     * ───────────────────────────── */
    let stockId = item.stockId;

    // 🟡 CASE 1: No stock → create Product & StockIn
    if (!stockId) {
      if (!item.categoryId) {
        throw new BadRequestException(
          `Category is required to create product for item ${item.itemName}`,
        );
      }

      const product = await this.prisma.product.create({
        data: {
          productName: item.itemName,
          categoryId: item.categoryId,
          employeeId: receivedById,
        },
      });

       const sku = generateSKU(String(product.productName));
            const barcodeUrl = await generateAndSaveBarcodeImage(sku);
      
      const stockIn = await this.prisma.stockIn.create({
        data: {
          productId: product.id,
          employeeId: receivedById,
          barcodeUrl,
          sku,
          quantity: Math.floor(receiveData.receivedQty),
          sellingPrice:Number(item.sellingPrice) ,
          price:Number(item.price),

        },
      });

      stockId = stockIn.id;

      // Link stock to requisition item
      await this.prisma.stockRequisitionItem.update({
        where: { id: item.id },
        data: { stockId },
      });
    }
    // 🟢 CASE 2: Stock exists → increment
    else {
      await this.prisma.stockIn.update({
        where: { id: stockId },
        data: {
          quantity: {
            increment: Math.floor(receiveData.receivedQty),
          },
        },
      });
    }

    /** ─────────────────────────────
     * UPDATE ITEM STATUS
     * ───────────────────────────── */
    const receivingStatus =
      newReceivedQty >= item.quantity
        ? StockReceivingStatus.FULLY_RECEIVED
        : StockReceivingStatus.PARTIALLY_RECEIVED;

    await this.prisma.stockRequisitionItem.update({
      where: { id: item.id },
      data: {
        receivedQty: newReceivedQty,
        receivingStatus,
      },
    });
  }

  /** ─────────────────────────────
   * UPDATE REQUISITION STATUS
   * ───────────────────────────── */
  const updatedItems = await this.prisma.stockRequisitionItem.findMany({
    where: { requisitionId },
  });

  const allFullyReceived = updatedItems.every(
    i => i.receivingStatus === StockReceivingStatus.FULLY_RECEIVED,
  );

  const anyReceived = updatedItems.some(
    i => i.receivingStatus !== StockReceivingStatus.NOT_RECEIVED,
  );

  let status = StockRequisitionStatus.APPROVED as any;
  let completedAt: Date | null = null;

  if (allFullyReceived) {
    status = StockRequisitionStatus.FULLY_RECEIVED;
    completedAt = new Date();
  } else if (anyReceived) {
    status = StockRequisitionStatus.PARTIALLY_RECEIVED;
  }

  return this.prisma.stockRequisition.update({
    where: { id: requisitionId },
    data: {
      status,
      completedAt,
    },
    include: {
      items: {
        include: {
          stock: true,
          receivingLogs: {
            include: { receivedBy: true },
            orderBy: { receivedAt: 'desc' },
          },
        },
      },
      employee: true,
    },
  });
}

  // ───────────────────────────────────
  // REJECT REQUISITION
  // ───────────────────────────────────
  async rejectStockRequisition(id: string, reason: string) {
    if (!reason) {
      throw new BadRequestException('Rejection reason required');
    }

    const requisition = await this.prisma.stockRequisition.findUnique({
      where: { id },
    });

    if (!requisition) {
      throw new NotFoundException('Stock requisition not found');
    }

    if (requisition.status !== StockRequisitionStatus.PENDING) {
      throw new ForbiddenException('Only pending requisitions can be rejected');
    }

    return this.prisma.stockRequisition.update({
      where: { id },
      data: {
        status: StockRequisitionStatus.REJECTED,
        rejectReason: reason,
      },
      include: {
        items: {
          include: {
            stock: true,
            receivingLogs: {
              include: { receivedBy: true },
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
        employee: true,
      },
    });
  }

  // ───────────────────────────────────
  // DELETE
  // ───────────────────────────────────
  async delete(id: string) {
    return this.prisma.stockRequisition.delete({ where: { id } });
  }

  // ───────────────────────────────────
  // FIND ALL
  // ───────────────────────────────────
  async findAll() {
    return this.prisma.stockRequisition.findMany({
      include: {
        items: {
          include: {
            stock: true,
            receivingLogs: {
              include: { receivedBy: true },
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
        employee: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ───────────────────────────────────
  // FIND BY EMPLOYEE
  // ───────────────────────────────────
  async findByEmployee(employeeId: string) {
    return this.prisma.stockRequisition.findMany({
      where: { employeeId },
      include: {
        items: {
          include: {
            stock: true,
            receivingLogs: {
              include: { receivedBy: true },
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
        employee: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ───────────────────────────────────
  // FIND ONE
  // ───────────────────────────────────
  async findOne(id: string) {
    return this.prisma.stockRequisition.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            stock: true,
            receivingLogs: {
              include: { receivedBy: true },
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
        employee: true,
      },
    });
  }

  // ───────────────────────────────────
  // GET RECEIVING SUMMARY
  // ───────────────────────────────────
  async getReceivingSummary(requisitionId: string) {
    const items = await this.prisma.stockRequisitionItem.findMany({
      where: { requisitionId },
      include: {
        stock: true,
        receivingLogs: {
          include: { receivedBy: true },
          orderBy: { receivedAt: 'desc' },
        },
      },
    });

    return items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      quantity: item.quantity,
      receivedQty: item.receivedQty,
      remainingQty: item.quantity - item.receivedQty,
      receivingStatus: item.receivingStatus,
      stockId: item.stockId,
      note: item.note,
      receivingLogs: item.receivingLogs,
    }));
  }
}