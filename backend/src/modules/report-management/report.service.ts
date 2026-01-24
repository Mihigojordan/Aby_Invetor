import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
  const { employeeId, expenses, transactions, cashAtHand, moneyOnPhone } = data;

  return await this.prisma.$transaction(async (tx) => {
    // 1️⃣ Create report first
    const report = await tx.report.create({
      data: {
        employeeId,
        cashAtHand: cashAtHand || 0,
        moneyOnPhone: moneyOnPhone || 0,
      },
    });

    // 2️⃣ Create expenses
    if (expenses?.length) {
      await tx.expense.createMany({
        data: expenses.map((e: any) => ({
          description: e.description,
          amount: e.amount,
          reportId: report.id,
        })),
      });
    }

    // 3️⃣ Create transactions
    let createdTransactions: any[] = [];

    if (transactions?.length) {
      createdTransactions = await Promise.all(
        transactions.map((t: any) =>
          tx.transaction.create({
            data: {
              type: t.type,
              description: t.description,
              amount: t.amount,
              reportId: report.id,
            },
          }),
        ),
      );
    }

    // 4️⃣ Create credits FROM transactions where type = CREDIT
    const creditTransactions = createdTransactions.filter(
      (t) => t.type === 'CREDIT',
    );

    if (creditTransactions.length) {
      await tx.credit.createMany({
        data: creditTransactions.map((t) => ({
          description: t.description,
          totalAmount: t.amount,
          reportId: report.id,
          payments: [], // JSON array starts empty
          status: 'PENDING',
        })),
      });
    }

    // 5️⃣ Return full report
    return tx.report.findUnique({
      where: { id: report.id },
      include: {
        expenses: true,
        transactions: true,
        credits: true, // 👈 important
      },
    });
  });
}

  async findAll() {
    try {
      return await this.prisma.report.findMany({
        include: {
          expenses: true,
          transactions: true,
          employee:true
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findOne(id: string) {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id },
        include: {
          expenses: true,
          transactions: true,
          employee:true
        },
      });

      if (!report) throw new NotFoundException('Report not found');
      return report;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findReportByEmployeeId(employeeId:string){
    try {
      const report = await this.prisma.report.findMany({
        where: { employeeId: employeeId },
        include: {
          expenses: true,
          transactions: true,
          employee:true
        },
      });

      if (!report) throw new NotFoundException('Report not found');
      return report;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.report.update({
        where: { id },
        data: {
          cashAtHand: data.cashAtHand,
          moneyOnPhone: data.moneyOnPhone,
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.report.delete({
        where: { id },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
