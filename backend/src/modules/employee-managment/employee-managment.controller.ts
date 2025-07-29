import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
}
