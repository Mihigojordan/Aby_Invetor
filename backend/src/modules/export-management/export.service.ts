import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExportConfigDto } from './dto/export-config.dto';

// Entities that have no meaningful timestamp for date filtering
const NO_DATE_FILTER = new Set(['SalesReturnItem', 'Transaction']);

// Which timestamp field to use per entity for date range filtering
const DATE_FIELD: Record<string, string> = {
  Category: 'createdAt',
  Product: 'createdAt',
  StockIn: 'receivedAt',
  StockOut: 'createdAt',
  BackOrder: 'createdAt',
  SalesReturn: 'createdAt',
  Partner: 'createdAt',
  Requisition: 'createdAt',
  RequisitionItem: 'createdAt',
  RequisitionItemDelivery: 'createdAt',
  StockRequisition: 'createdAt',
  StockRequisitionItem: 'createdAt',
  ReceivingLog: 'receivedAt',
  Employee: 'createdAt',
  Admin: 'createdAt',
  Task: 'createdAt',
  Permission: 'createdAt',
  Report: 'createdAt',
  Expense: 'createdAt',
  Credit: 'createdAt',
  Activity: 'doneAt',
  Notification: 'createdAt',
};

// Fields always stripped from every entity (security)
const ALWAYS_STRIP: Record<string, string[]> = {
  Admin: ['password'],
  Employee: ['password'],
  Partner: ['password'],
};

// Prisma model accessor name per entity key
const PRISMA_MODEL: Record<string, string> = {
  Category: 'category',
  Product: 'product',
  StockIn: 'stockIn',
  StockOut: 'stockOut',
  BackOrder: 'backOrder',
  SalesReturn: 'salesReturn',
  SalesReturnItem: 'salesReturnItem',
  Partner: 'partner',
  Requisition: 'requisition',
  RequisitionItem: 'requisitionItem',
  RequisitionItemDelivery: 'requisitionItemDelivery',
  StockRequisition: 'stockRequisition',
  StockRequisitionItem: 'stockRequisitionItem',
  ReceivingLog: 'receivingLog',
  Employee: 'employee',
  Admin: 'admin',
  Task: 'task',
  Permission: 'permission',
  Report: 'report',
  Expense: 'expense',
  Transaction: 'transaction',
  Credit: 'credit',
  Activity: 'activity',
  Notification: 'notification',
};

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(config: ExportConfigDto): Promise<Record<string, number>> {
    try {
      const counts: Record<string, number> = {};
      const dateFilter = this.buildDateFilter(config.dateRange);

      for (const entity of config.entities) {
        const model = PRISMA_MODEL[entity];
        if (!model) continue;
        const where = this.buildWhere(entity, dateFilter, config.filters);
        counts[entity] = await (this.prisma as any)[model].count({ where });
      }

      return counts;
    } catch (err: any) {
      throw new BadRequestException(`Preview failed: ${err.message?.split('\n')[0]}`);
    }
  }

  async exportData(config: ExportConfigDto): Promise<Record<string, any[]>> {
    try {
      const result: Record<string, any[]> = {};
      const dateFilter = this.buildDateFilter(config.dateRange);

      for (const entity of config.entities) {
        const rows = await this.fetchEntity(entity, dateFilter, config.filters);
        result[entity] = rows.map((row) =>
          this.sanitize(row, entity, config.excludeFields),
        );
      }

      return result;
    } catch (err: any) {
      throw new BadRequestException(`Export failed: ${err.message?.split('\n')[0]}`);
    }
  }

  // ─── PRIVATE ──────────────────────────────────────────────────────────────

  private buildDateFilter(dateRange?: { start?: string; end?: string }) {
    if (!dateRange?.start && !dateRange?.end) return undefined;
    const filter: any = {};
    if (dateRange.start) filter.gte = new Date(dateRange.start);
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setUTCHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return filter;
  }

  private buildWhere(entity: string, dateFilter: any, filters?: any): any {
    const where: any = {};

    const dateField = DATE_FIELD[entity];
    if (dateFilter && dateField && !NO_DATE_FILTER.has(entity)) {
      where[dateField] = dateFilter;
    }

    if (entity === 'StockOut' && filters?.StockOut?.paymentStatus?.length) {
      where.paymentStatus = { in: filters.StockOut.paymentStatus };
    }
    if (entity === 'Expense' && filters?.Expense?.status?.length) {
      where.status = { in: filters.Expense.status };
    }
    if (entity === 'Requisition' && filters?.Requisition?.status?.length) {
      where.status = { in: filters.Requisition.status };
    }
    if (entity === 'StockRequisition' && filters?.StockRequisition?.status?.length) {
      where.status = { in: filters.StockRequisition.status };
    }

    return where;
  }

  private async fetchEntity(entity: string, dateFilter: any, filters?: any): Promise<any[]> {
    const p = this.prisma as any;
    const where = this.buildWhere(entity, dateFilter, filters);

    switch (entity) {
      case 'Category':
        return p.category.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'Product':
        return p.product.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'StockIn':
        return p.stockIn.findMany({ where, orderBy: { receivedAt: 'asc' } });

      case 'StockOut':
        return p.stockOut.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'BackOrder':
        return p.backOrder.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'SalesReturn':
        return p.salesReturn.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'SalesReturnItem':
        return p.salesReturnItem.findMany({ where });

      case 'Partner':
        return p.partner.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'Requisition':
        return p.requisition.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'RequisitionItem':
        return p.requisitionItem.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'RequisitionItemDelivery':
        return p.requisitionItemDelivery.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'StockRequisition':
        return p.stockRequisition.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'StockRequisitionItem':
        return p.stockRequisitionItem.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'ReceivingLog':
        return p.receivingLog.findMany({ where, orderBy: { receivedAt: 'asc' } });

      case 'Employee':
        return p.employee.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'Admin':
        return p.admin.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'Task': {
        // Include employee IDs for M2M relationship — stored as synthetic field
        const tasks = await p.task.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          include: { employees: { select: { id: true } } },
        });
        return tasks.map((t: any) => {
          const { employees, ...rest } = t;
          return { ...rest, _employeeIds: employees.map((e: any) => e.id) };
        });
      }

      case 'Permission':
        return p.permission.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'Report':
        return p.report.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'Expense':
        return p.expense.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'Transaction':
        return p.transaction.findMany({ where });

      case 'Credit':
        return p.credit.findMany({ where, orderBy: { createdAt: 'asc' } });

      case 'Activity':
        return p.activity.findMany({ where, orderBy: { doneAt: 'asc' } });

      case 'Notification':
        return p.notification.findMany({ where, orderBy: { createdAt: 'asc' } });

      default:
        return [];
    }
  }

  private sanitize(row: any, entity: string, excludeFields?: any): any {
    const clone = { ...row };

    // Always strip passwords/tokens
    for (const field of ALWAYS_STRIP[entity] ?? []) {
      delete clone[field];
    }

    // User-requested optional exclusions
    for (const field of excludeFields?.[entity] ?? []) {
      delete clone[field];
    }

    // Serialize Prisma Decimal to string for JSON compatibility
    for (const key of Object.keys(clone)) {
      if (clone[key] && typeof clone[key] === 'object' && typeof clone[key].toFixed === 'function') {
        clone[key] = clone[key].toString();
      }
    }

    return clone;
  }
}
