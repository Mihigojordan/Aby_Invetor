import { Module } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { PartnerController } from './partner.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PartnerAuthModule } from './auth/partner-auth.module';

@Module({
  providers: [PartnerService, PrismaService],
  imports: [PartnerAuthModule],
  controllers: [PartnerController],
})
export class PartnerModule {}
