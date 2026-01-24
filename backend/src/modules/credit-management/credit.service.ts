// src/credit/credit.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  // ===============================
  // CREATE CREDIT
  // ===============================
  async createCredit(data: any) {
    const { totalAmount } = data;

    if (!totalAmount) {
      throw new BadRequestException('totalAmount is required');
    }

    return this.prisma.credit.create({
      data: {
        description: data.description ?? null,
        totalAmount,
        employeeId: data.employeeId ?? null,
        payments: [],
      },
      include: {
        employee: true,
      },
    });
  }

  // ===============================
  // ADD PAYMENT (JSON ARRAY)
  // ===============================
  async addPayment(id: string, amount: number) {
    const credit = await this.prisma.credit.findUnique({
      where: { id },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    const existingPayments: any[] = (credit.payments as any[]) || [];

    const newPayment = {
      amount,
      paidAt: new Date(),
    };

    const updatedPayments = [...existingPayments, newPayment];

    const totalPaid = updatedPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    let status: any = 'PARTIAL';
    if (totalPaid >= credit.totalAmount) {
      status = 'COMPLETED';
    }

    return this.prisma.credit.update({
      where: { id },
      data: {
        payments: updatedPayments,
        status,
      },
      include: {
        employee: true,
      },
    });
  }

  // ===============================
  // GET ONE CREDIT
  // ===============================
  async getCredit(id: string) {
    const credit = await this.prisma.credit.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    return credit;
  }

  // ===============================
  // GET ALL CREDITS
  // ===============================
  async getAllCredits(query: any) {
    const where: any = {};

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;

    return this.prisma.credit.findMany({
      where,
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===============================
  // DELETE CREDIT
  // ===============================
  async deleteCredit(id: string) {
    const credit = await this.prisma.credit.findUnique({
      where: { id },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    await this.prisma.credit.delete({
      where: { id },
    });

    return credit;
  }
}
