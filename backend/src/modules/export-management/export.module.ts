import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { DualAuthGuard } from 'src/guards/dual-auth.guard';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ImportService } from './import.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretkey',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ExportController],
  providers: [ExportService, ImportService, PrismaService, DualAuthGuard],
})
export class ExportManagementModule {}
