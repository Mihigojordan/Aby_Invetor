import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { PermissionModule } from '../permission-management/permission.module';

@Module({
  imports: [PermissionModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
