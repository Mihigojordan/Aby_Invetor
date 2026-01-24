// src/credit/credit.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';
import { PrismaService } from 'src/prisma/prisma.service';

import { DualAuthGuard } from '../../guards/dual-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretkey',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [CreditController],
  providers: [CreditService, PrismaService, DualAuthGuard],
  exports: [CreditService],
})
export class CreditModule {}