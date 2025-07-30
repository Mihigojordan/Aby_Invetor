import { Module } from '@nestjs/common';
import { AuthModule } from './Modules/Auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}
