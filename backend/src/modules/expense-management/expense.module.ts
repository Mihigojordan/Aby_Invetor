// src/expense/expense.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { PrismaService } from 'src/prisma/prisma.service';

import { DualAuthGuard } from '../../guards/dual-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretkey',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService, PrismaService, DualAuthGuard],
  exports: [ExpenseService],
})
export class ExpenseModule {}
