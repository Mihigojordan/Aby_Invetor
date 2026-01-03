import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequisitionStatus, ItemStatus } from 'generated/prisma';

@Injectable()
export class RequisitionService {
  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // PARTNER CREATES REQUISITION
  // ============================================================================
  async createRequisition(data: {
    partnerId: string;
    partnerNote?: string;
    items: {
      itemName: string;
      qtyRequested: number;
      note?: string;
    }[];
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Requisition must have at least one item');
    }

    // Validate partner exists
    const partner = await this.prisma.partner.findUnique({
      where: { id: data.partnerId },
    });

    if (!partner) {
      throw new BadRequestException('Partner not found');
    }

    // Validate all quantities are positive
    for (const item of data.items) {
      if (item.qtyRequested <= 0) {
        throw new BadRequestException(
          `Invalid quantity for item "${item.itemName}". Quantity must be greater than 0`
        );
      }
    }

    return this.prisma.requisition.create({
      data: {
        partnerId: data.partnerId,
        partnerNote: data.partnerNote,
        status: RequisitionStatus.PENDING,
        items: {
          create: data.items.map((item) => ({
            itemName: item.itemName,
            qtyRequested: item.qtyRequested,
            note: item.note,
            status: ItemStatus.PENDING,
            qtyDelivered: 0,
          })),
        },
      },
      include: {
        items: {
          include: {
            stockIn: true,
            approver: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
            deliveries: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                  },
                },
                confirmedBy: true,
              },
            },
          },
        },
        partner: true,
      },
    });
  }

  // ============================================================================
  // UPDATE PENDING REQUISITION (Partner Only)
  // ============================================================================
  async updateRequisition(
    id: string,
    partnerId: string,
    data: {
      partnerNote?: string;
      items?: {
        id?: string;
        itemName?: string;
        qtyRequested?: number;
        note?: string;
        remove?: boolean;
      }[];
    }
  ) {
    const requisition = await this.prisma.requisition.findFirst({
      where: { id, partnerId },
      include: { items: true },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    if (requisition.status !== RequisitionStatus.PENDING) {
      throw new ForbiddenException(
        'Only pending requisitions can be updated by partners'
      );
    }

    // Update partner note
    if (data.partnerNote !== undefined) {
      await this.prisma.requisition.update({
        where: { id },
        data: { partnerNote: data.partnerNote },
      });
    }

    // Update items
    if (data.items) {
      for (const item of data.items) {
        // Remove item
        if (item.remove && item.id) {
          await this.prisma.requisitionItem.delete({
            where: { id: item.id },
          });
          continue;
        }

        // Update existing item
        if (item.id) {
          const updateData: any = {};
          if (item.itemName) updateData.itemName = item.itemName;
          if (item.qtyRequested) {
            if (item.qtyRequested <= 0) {
              throw new BadRequestException('Quantity must be greater than 0');
            }
            updateData.qtyRequested = item.qtyRequested;
          }
          if (item.note !== undefined) updateData.note = item.note;

          await this.prisma.requisitionItem.update({
            where: { id: item.id },
            data: updateData,
          });
        } else {
          // Create new item
          if (!item.itemName || !item.qtyRequested) {
            throw new BadRequestException(
              'Item name and quantity are required for new items'
            );
          }

          if (item.qtyRequested <= 0) {
            throw new BadRequestException('Quantity must be greater than 0');
          }

          await this.prisma.requisitionItem.create({
            data: {
              requisitionId: id,
              itemName: item.itemName,
              qtyRequested: item.qtyRequested,
              note: item.note,
              status: ItemStatus.PENDING,
              qtyDelivered: 0,
            },
          });
        }
      }
    }

    return this.findOne(id);
  }

  // ============================================================================
  // EMPLOYEE APPROVAL
  // ============================================================================
  async approveItems(
    requisitionId: string,
    employeeId: string,
    items: {
      itemId: string;
      qtyApproved: number;
      stockInId?: string;
      approvalNote?: string;
    }[]
  ) {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: { items: true },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    if (requisition.status !== RequisitionStatus.PENDING) {
      throw new ForbiddenException('Only pending requisitions can be approved');
    }

    // Validate employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    const now = new Date();
    let hasApprovedItems = false;

    // Process each item approval
    for (const approvalData of items) {
      const item = requisition.items.find((i) => i.id === approvalData.itemId);

      if (!item) {
        throw new BadRequestException(`Item ${approvalData.itemId} not found`);
      }

      if (item.qtyApproved !== null) {
        throw new BadRequestException(
          `Item "${item.itemName}" has already been reviewed`
        );
      }

      // Validate approved quantity
      if (approvalData.qtyApproved < 0) {
        throw new BadRequestException('Approved quantity cannot be negative');
      }

      if (approvalData.qtyApproved > item.qtyRequested) {
        throw new BadRequestException(
          `Approved quantity (${approvalData.qtyApproved}) cannot exceed requested quantity (${item.qtyRequested}) for item "${item.itemName}"`
        );
      }

      // If stockInId provided, validate it exists and get price
      let unitPriceAtApproval = null;
      if (approvalData.stockInId) {
        const stockIn = await this.prisma.stockIn.findUnique({
          where: { id: approvalData.stockInId },
        });

        if (!stockIn) {
          throw new BadRequestException(
            `Stock item ${approvalData.stockInId} not found`
          );
        }

        unitPriceAtApproval = stockIn.sellingPrice as any;
      }

      // Determine item status
      let itemStatus: ItemStatus;
      if (approvalData.qtyApproved === 0) {
        itemStatus = ItemStatus.REJECTED;
      } else {
        itemStatus = ItemStatus.REVIEWED;
        hasApprovedItems = true;
      }

      // Update item
      await this.prisma.requisitionItem.update({
        where: { id: item.id },
        data: {
          qtyApproved: approvalData.qtyApproved,
          approvalNote: approvalData.approvalNote,
          stockInId: approvalData.stockInId,
          approvedById: employeeId,
          approvedAt: now,
          unitPriceAtApproval,
          status: itemStatus,
        },
      });
    }

    // Update requisition status and reviewedAt
    const allItems = await this.prisma.requisitionItem.findMany({
      where: { requisitionId },
    });

    const allReviewed = allItems.every((i) => i.qtyApproved !== null);
    const anyApproved = allItems.some((i) => i.qtyApproved && i.qtyApproved > 0);
    const allRejected = allItems.every((i) => i.qtyApproved === 0);

    let newStatus = requisition.status as RequisitionStatus;
    if (allReviewed) {
      if (allRejected) {
        newStatus = RequisitionStatus.REJECTED;
      } else if (anyApproved) {
        newStatus = RequisitionStatus.REVIEWED;
      }
    }

    await this.prisma.requisition.update({
      where: { id: requisitionId },
      data: {
        status: newStatus,
        reviewedAt: requisition.reviewedAt || now,
      },
    });

    return this.findOne(requisitionId);
  }

  // ============================================================================
  // ADMIN PRICE OVERRIDE
  // ============================================================================
  async overridePrice(
    itemId: string,
    priceOverride: number,
  ) {
    const item = await this.prisma.requisitionItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (!item.qtyApproved || item.qtyApproved === 0) {
      throw new ForbiddenException('Can only override price for approved items');
    }

    if (item.qtyDelivered > 0) {
      throw new ForbiddenException(
        'Cannot override price after delivery has started'
      );
    }

    if (priceOverride < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    return this.prisma.requisitionItem.update({
      where: { id: itemId },
      data: {
        priceOverride,
        priceOverriddenAt: new Date(),
      },
      include: {
        requisition: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  // ============================================================================
  // DELIVERY/RECEIVING
  // ============================================================================
  async deliverItems(
    requisitionId: string,
    employeeId: string,
    deliveries: {
      itemId: string;
      qtyDelivered: number;
      deliveryNote?: string;
    }[]
  ) {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: { items: true },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    if (
      requisition.status !== RequisitionStatus.APPROVED &&
      requisition.status !== RequisitionStatus.PARTIALLY_FULFILLED
    ) {
      throw new ForbiddenException('Only approved requisitions can be delivered');
    }

    // Validate employee
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    // Process each delivery
    for (const delivery of deliveries) {
      const item = requisition.items.find((i) => i.id === delivery.itemId);

      if (!item) {
        throw new BadRequestException(`Item ${delivery.itemId} not found`);
      }

      if (!item.qtyApproved || item.qtyApproved === 0) {
        throw new BadRequestException(
          `Item "${item.itemName}" was not approved for delivery`
        );
      }

      if (delivery.qtyDelivered <= 0) {
        throw new BadRequestException('Delivery quantity must be greater than 0');
      }

      const newTotalDelivered = item.qtyDelivered + delivery.qtyDelivered;

      if (newTotalDelivered > item.qtyApproved) {
        throw new BadRequestException(
          `Cannot deliver more than approved. Item: "${item.itemName}", ` +
            `Approved: ${item.qtyApproved}, Already delivered: ${item.qtyDelivered}, ` +
            `Trying to deliver: ${delivery.qtyDelivered}`
        );
      }

      // Create delivery record
      await this.prisma.requisitionItemDelivery.create({
        data: {
          requisitionItemId: item.id,
          qtyDelivered: delivery.qtyDelivered,
          deliveryNote: delivery.deliveryNote,
          createdById: employeeId,
        },
      });

      // Update item status
      let itemStatus: ItemStatus;
      if (newTotalDelivered >= item.qtyApproved) {
        itemStatus = ItemStatus.FULFILLED;
      } else {
        itemStatus = ItemStatus.PARTIALLY_FULFILLED;
      }

      await this.prisma.requisitionItem.update({
        where: { id: item.id },
        data: {
          qtyDelivered: newTotalDelivered,
          status: itemStatus,
        },
      });
    }

    // Update requisition status
    const allItems = await this.prisma.requisitionItem.findMany({
      where: { requisitionId },
    });

    const approvedItems = allItems.filter((i) => i.qtyApproved && i.qtyApproved > 0);
    const allFulfilled = approvedItems.every(
      (i) => i.qtyDelivered >= i.qtyApproved!
    );
    const anyDelivered = approvedItems.some((i) => i.qtyDelivered > 0);

    let newStatus: RequisitionStatus;
    let completedAt: Date | null = null;

    if (allFulfilled) {
      newStatus = RequisitionStatus.COMPLETED;
      completedAt = new Date();
    } else if (anyDelivered) {
      newStatus = RequisitionStatus.PARTIALLY_FULFILLED;
    } else {
      newStatus = RequisitionStatus.APPROVED;
    }

    await this.prisma.requisition.update({
      where: { id: requisitionId },
      data: {
        status: newStatus,
        completedAt,
      },
    });

    return this.findOne(requisitionId);
  }

  // ============================================================================
  // PARTNER CONFIRMS RECEIPT
  // ============================================================================
  async confirmReceipt(
    deliveryId: string,
    partnerId: string,
    partnerNote?: string
  ) {
    const delivery = await this.prisma.requisitionItemDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        requisitionItem: {
          include: {
            requisition: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.requisitionItem.requisition.partnerId !== partnerId) {
      throw new ForbiddenException('You can only confirm your own deliveries');
    }

    if (delivery.confirmedAt) {
      throw new BadRequestException('This delivery has already been confirmed');
    }

    return this.prisma.requisitionItemDelivery.update({
      where: { id: deliveryId },
      data: {
        confirmedByPartnerId: partnerId,
        confirmedAt: new Date(),
        partnerNote,
      },
    });
  }

  // ============================================================================
  // REJECT REQUISITION
  // ============================================================================
  async rejectRequisition(id: string, employeeId: string, reason: string) {
    if (!reason) {
      throw new BadRequestException('Rejection reason required');
    }

    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    if (requisition.status !== RequisitionStatus.PENDING) {
      throw new ForbiddenException('Only pending requisitions can be rejected');
    }

    // Mark all items as rejected
    await this.prisma.requisitionItem.updateMany({
      where: { requisitionId: id },
      data: {
        qtyApproved: 0,
        approvalNote: reason,
        approvedById: employeeId,
        approvedAt: new Date(),
        status: ItemStatus.REJECTED,
      },
    });

    return this.prisma.requisition.update({
      where: { id },
      data: {
        status: RequisitionStatus.REJECTED,
        approvalSummary: reason,
        reviewedAt: new Date(),
      },
      include: {
        items: true,
        partner: true,
      },
    });
  }

  // ============================================================================
  // CANCEL REQUISITION
  // ============================================================================
  async cancelRequisition(id: string, partnerId: string) {
    const requisition = await this.prisma.requisition.findFirst({
      where: { id, partnerId },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    if (requisition.status === RequisitionStatus.COMPLETED) {
      throw new ForbiddenException('Cannot cancel completed requisitions');
    }

    if (
      requisition.status === RequisitionStatus.APPROVED ||
      requisition.status === RequisitionStatus.PARTIALLY_FULFILLED
    ) {
      throw new ForbiddenException(
        'Cannot cancel requisitions that are being processed. Please contact support.'
      );
    }

    return this.prisma.requisition.update({
      where: { id },
      data: { status: RequisitionStatus.CANCELLED },
      include: {
        items: true,
        partner: true,
      },
    });
  }

  // ============================================================================
  // DELETE
  // ============================================================================
  async delete(id: string) {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    if (requisition.status !== RequisitionStatus.PENDING) {
      throw new ForbiddenException(
        'Only pending requisitions can be deleted. Use cancel instead.'
      );
    }

    return this.prisma.requisition.delete({
      where: { id },
    });
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  async findAll(filters?: {
    partnerId?: string;
    status?: RequisitionStatus;
  }) {
    return this.prisma.requisition.findMany({
      where: {
        partnerId: filters?.partnerId,
        status: filters?.status,
      },
      include: {
        partner: true,
        items: {
          include: {
            stockIn: true,
            approver: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByPartner(partnerId: string) {
    return this.prisma.requisition.findMany({
      where: { partnerId },
      include: {
        items: {
          include: {
            stockIn: true,
            deliveries: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.requisition.findUnique({
      where: { id },
      include: {
        partner: true,
        items: {
          include: {
            stockIn: {
                include: {
                    product:true
                },
            },
            approver: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
            deliveries: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                  },
                },
                confirmedBy: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
  }

  async getDeliverySummary(requisitionId: string) {
    const items = await this.prisma.requisitionItem.findMany({
      where: { requisitionId },
      include: {
        deliveries: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      qtyRequested: item.qtyRequested,
      qtyApproved: item.qtyApproved,
      qtyDelivered: item.qtyDelivered,
      remainingQty: (item.qtyApproved || 0) - item.qtyDelivered,
      status: item.status,
      deliveries: item.deliveries,
      unitPrice:item.priceOverride ?? item.unitPriceAtApproval,
      totalPrice: ((item.priceOverride ?? item.unitPriceAtApproval ?? 0) as number) *(item.qtyApproved || 0),
    }));
  }
}