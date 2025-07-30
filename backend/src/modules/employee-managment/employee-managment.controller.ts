import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { EmployeeManagmentService } from './employee-managment.service';
import { AdminJwtAuthGuard } from 'src/guards/adminGuard.guard';

@Controller('employee')
export class EmployeeManagmentController {
  constructor(private readonly employeeServices: EmployeeManagmentService) {}

  @Post('register')
  @UseGuards(AdminJwtAuthGuard)
  async registerEmployee(@Body() data) {
    try {
      return await this.employeeServices.registerEmployee(data);
    } catch (error) {
      console.error('error registering a employee', error);
      throw new Error(error.message);
    }
  }

  @Get('all')
  @UseGuards(AdminJwtAuthGuard)
  async getAllEmployee() {
    try {
      return await this.employeeServices.getAllEmployee();
    } catch (error) {
      console.error('error getting   employees', error);
      throw new Error(error.message);
    }
  }

  @Put('update:id')
  update(@Param('id') id: string, @Body() data) {
    return this.employeeServices.updateEmployee(id, data);
  }

  @Delete('delete:id')
  remove(@Param('id') id: string) {
    return this.employeeServices.deleteEmployee(id);
  }

  @Post('assign-task')
  @UseGuards(AdminJwtAuthGuard)
  async assignTakToEmployee(@Body() data) {
    try {
      return await this.employeeServices.assignTasks(data);
    } catch (error) {
      console.error('error assigning task   employees', error);
      throw new Error(error.message);
    }
  }
}
