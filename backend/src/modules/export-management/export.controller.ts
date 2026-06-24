import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DualAuthGuard } from 'src/guards/dual-auth.guard';
import { ExportConfigDto } from './dto/export-config.dto';
import { ImportDataDto } from './dto/import-data.dto';
import { ExportService } from './export.service';
import { ImportService } from './import.service';

@Controller('export')
@UseGuards(DualAuthGuard)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly importService: ImportService,
  ) {}

  @Post('preview')
  preview(@Body() config: ExportConfigDto) {
    return this.exportService.preview(config);
  }

  @Post('data')
  exportData(@Body() config: ExportConfigDto) {
    return this.exportService.exportData(config);
  }

  @Post('import')
  importData(@Body() payload: ImportDataDto) {
    return this.importService.importData(payload);
  }
}
