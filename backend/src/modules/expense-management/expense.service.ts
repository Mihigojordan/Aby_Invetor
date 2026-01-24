// src/expense/expense.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  // ===============================
  // CREATE
  // ===============================
  async createExpense(data: any) {
    const { amount, expenseDate } = data;

    if (!amount || !expenseDate) {
      throw new BadRequestException('Amount and expenseDate are required');
    }

    return this.prisma.expense.create({
      data: {
        description: data.description ?? null,
        amount,
        reason: data.reason ?? null,
        expenseDate: new Date(expenseDate),
        employeeId: data.employeeId ?? null,
        reportId: data.reportId ?? null,
      },
      include: {
        employee: true,
        report: true,
      },
    });
  }

  // ===============================
  // UPDATE
  // ===============================
  async updateExpense(id: string, data: any) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        description: data.description ?? expense.description,
        amount: data.amount ?? expense.amount,
        reason: data.reason ?? expense.reason,
        expenseDate: data.expenseDate
          ? new Date(data.expenseDate)
          : expense.expenseDate,
        employeeId: data.employeeId ?? expense.employeeId,
        reportId: data.reportId ?? expense.reportId,
      },
      include: {
        employee: true,
        report: true,
      },
    });
  }

  // ===============================
// UPDATE STATUS
// ===============================
async updateExpenseStatus(id: string, status: string) {
  const expense = await this.prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    throw new NotFoundException('Expense not found');
  }

  const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];

  if (!allowedStatuses.includes(status)) {
    throw new BadRequestException('Invalid expense status');
  }

  return this.prisma.expense.update({
    where: { id },
    data: {
      status: status as any,
    },
    include: {
      employee: true,
      report: true,
    },
  });
}


  // ===============================
  // GET ONE
  // ===============================
  async getExpense(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        employee: true,
        report: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  // ===============================
  // GET ALL
  // ===============================
  async getAllExpenses(query: any) {
    const where: any = {};

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.reportId) where.reportId = query.reportId;

    if (query.reason) {
      where.reason = {
        contains: query.reason,
        mode: 'insensitive',
      };
    }

    return this.prisma.expense.findMany({
      where,
      include: {
        employee: true,
        report: true,
      },
      orderBy: {
        expenseDate: 'desc',
      },
    });
  }

  // ===============================
  // DELETE
  // ===============================
  async deleteExpense(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    await this.prisma.expense.delete({ where: { id } });

    return expense;
  }
}
