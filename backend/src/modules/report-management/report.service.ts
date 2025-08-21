import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    try {
      const { employeeId, productsSold, expenses, transactions, cashAtHand, moneyOnPhone } = data;

      return await this.prisma.report.create({
        data: {
          employeeId,
          productsSold,
          cashAtHand: cashAtHand || 0,
          moneyOnPhone: moneyOnPhone || 0,
          expenses: {
            create: expenses?.map((e: any) => ({
              description: e.description,
              amount: e.amount,
            })) || [],
          },
          transactions: {
            create: transactions?.map((t: any) => ({
              type: t.type,
              description: t.description,
              amount: t.amount,
            })) || [],
          },
        },
        include: {
          expenses: true,
          transactions: true,
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
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
          productsSold: data.productsSold,
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
