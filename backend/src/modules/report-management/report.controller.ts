import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
  HttpException,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { EmployeeJwtAuthGuard } from 'src/guards/employeeGuard.guard';
import { RequestWithEmployee } from 'src/common/interfaces/employee.interface';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(EmployeeJwtAuthGuard)
  async create(@Body() body: any, @Req() req: RequestWithEmployee) {
    try {
      const employeeId = req?.employee?.id as string;
      return await this.reportService.create({
        ...body,
        employeeId,
      });
    } catch (error) {
     throw new HttpException(error.message, error.status)
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.reportService.findAll();
    } catch (error) {
     throw new HttpException(error.message, error.status)
    }
  }


  @Get('employee')
  @UseGuards(EmployeeJwtAuthGuard)
  async findbyEmployeeId( @Req() req: RequestWithEmployee ){
    try{
      const EmployeeId = req.employee?.id as string
      return await this.reportService.findReportByEmployeeId(EmployeeId)
    }catch(error){
      throw new HttpException(error.message, error.status)
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.reportService.findOne(id);
    } catch (error) {
     throw new HttpException(error.message, error.status)
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      return await this.reportService.update(id, body);
    } catch (error) {
     throw new HttpException(error.message, error.status)
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.reportService.remove(id);
    } catch (error) {
     throw new HttpException(error.message, error.status)
    }
  }
}
