import { Module } from '@nestjs/common';
import { EmployeeManagmentController } from './employee-managment.controller';
import { EmployeeManagmentService } from './employee-managment.service';

@Module({
  controllers: [EmployeeManagmentController],
  providers: [EmployeeManagmentService]
})
export class EmployeeManagmentModule {}
