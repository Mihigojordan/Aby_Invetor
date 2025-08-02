import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EmployeeManagmentService } from './employee-managment.service';
import { AdminJwtAuthGuard } from 'src/guards/adminGuard.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  EmployeeFileFields,
  EmployeeUploadConfig,
} from 'src/common/utils/file-upload.utils';
import { RequestWithAdmin } from 'src/common/interfaces/admin.interface';
import { EmployeeJwtAuthGuard } from 'src/guards/employeeGuard.guard';
import { RequestWithEmployee } from 'src/common/interfaces/employee.interface';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Controller('employee')
export class EmployeeManagmentController {
  constructor(private readonly employeeServices: EmployeeManagmentService, private readonly activity: ActivityManagementService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(EmployeeFileFields, EmployeeUploadConfig),
  )
  @UseGuards(AdminJwtAuthGuard)
  async registerEmployee(
    @Body() data,
    @UploadedFiles()
    files: {
      profileImg?: Express.Multer.File[];
      cv?: Express.Multer.File[];
      identityCard?: Express.Multer.File[];
    },
    @Req() req: RequestWithAdmin,
  ) {
    try {
      const adminId = req.admin?.id as string;
      return await this.employeeServices.registerEmployee({
        ...data,
        profileImg: files.profileImg,
        identityCard: files.identityCard,
        cv: files.cv,
        adminId,
      });
    } catch (error) {
      console.error('error registering a employee', error);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('all')
  @UseGuards(AdminJwtAuthGuard)
  async getAllEmployee() {
    try {
      return await this.employeeServices.getAllEmployee();
    } catch (error) {
      console.error('error getting   employees', error);
      throw new HttpException(error.message, error.status);
    }
  }

  @UseInterceptors(
    FileFieldsInterceptor(EmployeeFileFields, EmployeeUploadConfig),
  )
  @Put('update/:id')
  async update(
    @Param('id') id: string,
    @Body() data,
    @UploadedFiles()
    files: {
      profileImg?: Express.Multer.File[];
      cv?: Express.Multer.File[];
      identityCard?: Express.Multer.File[];
    },
  ) {
    try {
      return await this.employeeServices.updateEmployee(id, {
        ...data,
        profileImg: files.profileImg,
        identityCard: files.identityCard,
        cv: files.cv,
      });
    } catch (error) {
      console.error('error getting   employees', error);
      throw new HttpException(error.message, error.status);
    }
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    try {
      return await this.employeeServices.deleteEmployee(id);
    } catch (error) {
      console.error('error getting   employees', error);
      throw new HttpException(error.message, error.status);
    }
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

  @Get('activity')
  @UseGuards(EmployeeJwtAuthGuard)
  async getActivityOfEmployee(@Req() req: RequestWithEmployee) {
    try {
      const id = req.employee?.id as string;
      return await this.activity.getActivityByEmployeeId(id)
    } catch (error) {}
  }

   @Get('activity/:id')
  async getActivityOfEmployeeWithId(@Req() req: RequestWithEmployee,@Param('id') id: string) {
    try {
   
      return await this.activity.getActivityByEmployeeId(id)
    } catch (error) {}
  }
}
