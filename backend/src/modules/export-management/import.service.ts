import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ImportDataDto, ImportResultDto, EntityImportResult } from './dto/import-data.dto';

// Strict dependency order — parents before children
const IMPORT_ORDER = [
  'Admin',
  'Employee',
  'Partner',
  'Task',
  'Permission',
  'Category',
  'Product',
  'StockIn',
  'BackOrder',
  'StockOut',
  'SalesReturn',
  'SalesReturnItem',
  'Requisition',
  'RequisitionItem',
  'RequisitionItemDelivery',
  'StockRequisition',
  'StockRequisitionItem',
  'ReceivingLog',
  'Report',
  'Expense',
  'Transaction',
  'Credit',
  'Activity',
  'Notification',
];

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

// Fields that should never be passed to prisma.create (synthetic or computed)
const STRIP_ON_IMPORT: Record<string, string[]> = {
  Task: ['_employeeIds'],
};

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importData(payload: ImportDataDto): Promise<ImportResultDto> {
    if (payload.version !== '1.0' || payload.system !== 'aby-inventor') {
      throw new BadRequestException(
        'Invalid export file. Expected version 1.0 from aby-inventor.',
      );
    }

    const details: Record<string, EntityImportResult> = {};

    // Process in dependency order — only entities present in the payload
    for (const entity of IMPORT_ORDER) {
      const rows = payload.data[entity];
      if (!rows?.length) continue;

      details[entity] = { created: 0, skipped: 0, errors: [] };

      for (const rawRow of rows) {
        await this.importRow(entity, rawRow, details[entity]);
      }
    }

    return this.buildSummary(details);
  }

  // ─── PRIVATE ──────────────────────────────────────────────────────────────

  private async importRow(
    entity: string,
    rawRow: any,
    result: EntityImportResult,
  ): Promise<void> {
    const model = PRISMA_MODEL[entity];
    if (!model) return;

    // Extract synthetic fields before creating
    const syntheticFields: Record<string, any> = {};
    const row = { ...rawRow };

    for (const field of STRIP_ON_IMPORT[entity] ?? []) {
      if (field in row) {
        syntheticFields[field] = row[field];
        delete row[field];
      }
    }

    // Convert ISO date strings to Date objects for Prisma
    const data = this.coerceDates(row);

    try {
      const exists = await (this.prisma as any)[model].findUnique({
        where: { id: data.id },
      });

      if (exists) {
        result.skipped++;
        return;
      }

      await (this.prisma as any)[model].create({ data });
      result.created++;

      // Handle M2M: Task ↔ Employee junction
      if (entity === 'Task' && syntheticFields._employeeIds?.length) {
        await this.connectTaskEmployees(data.id, syntheticFields._employeeIds, result);
      }
    } catch (err: any) {
      // Log FK violations and other errors — don't abort the whole import
      result.errors.push(`id=${data.id}: ${err.message?.split('\n')[0]}`);
    }
  }

  private async connectTaskEmployees(
    taskId: string,
    employeeIds: string[],
    result: EntityImportResult,
  ): Promise<void> {
    for (const empId of employeeIds) {
      try {
        // Only connect if the employee exists (may not have been imported)
        const empExists = await this.prisma.employee.findUnique({ where: { id: empId } });
        if (!empExists) continue;

        await this.prisma.task.update({
          where: { id: taskId },
          data: { employees: { connect: { id: empId } } },
        });
      } catch {
        // Non-critical — task was created, just the association failed
      }
    }
  }

  private coerceDates(row: any): any {
    const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
    const result: any = {};

    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && ISO_REGEX.test(value)) {
        const d = new Date(value);
        result[key] = isNaN(d.getTime()) ? value : d;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private buildSummary(details: Record<string, EntityImportResult>): ImportResultDto {
    let totalProcessed = 0;
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of Object.values(details)) {
      totalProcessed += r.created + r.skipped + r.errors.length;
      created += r.created;
      skipped += r.skipped;
      errors += r.errors.length;
    }

    return { summary: { totalProcessed, created, skipped, errors }, details };
  }
}
