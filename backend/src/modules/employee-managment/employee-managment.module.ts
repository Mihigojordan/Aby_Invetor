import { Module } from '@nestjs/common';
import { EmployeeManagmentController } from './employee-managment.controller';
import { EmployeeManagmentService } from './employee-managment.service';
import { EmployeeAuthController } from './auth/auth.controller';
import { EmployeeAuthService } from './auth/auth.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Module({
  controllers: [EmployeeManagmentController, EmployeeAuthController],
  providers: [EmployeeManagmentService, EmployeeAuthService, ActivityManagementService]
})
export class EmployeeManagmentModule {}
