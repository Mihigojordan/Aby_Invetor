import { Module } from '@nestjs/common';
import { PartnerAuthController } from './partner-auth.controller';
import { PartnerAuthService } from './partner-auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { PartnerAuthGuard } from 'src/guards/partner-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.Jwt_SECRET_KEY || 'secretkey',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PartnerAuthController],
  providers: [PartnerAuthService, PrismaService, PartnerAuthGuard],
  exports: [PartnerAuthService, PartnerAuthGuard],
})
export class PartnerAuthModule {}
