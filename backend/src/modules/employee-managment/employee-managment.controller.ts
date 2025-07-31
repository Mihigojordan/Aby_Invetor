import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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

@Controller('employee')
export class EmployeeManagmentController {
  constructor(private readonly employeeServices: EmployeeManagmentService) {}

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
  ) {
    try {
      return await this.employeeServices.registerEmployee({
        ...data,
        profileImg: files.profileImg,
        identityCard: files.identityCard,
        cv: files.cv,
      });
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

  @UseInterceptors(
    FileFieldsInterceptor(EmployeeFileFields, EmployeeUploadConfig),
  )
  @Put('update/:id')
  update(
    @Param('id') id: string,
    @Body() data,
    @UploadedFiles()
    files: {
      profileImg?: Express.Multer.File[];
      cv?: Express.Multer.File[];
      identityCard?: Express.Multer.File[];
    },
  ) {
    return this.employeeServices.updateEmployee(id, {
      ...data,
      profileImg: files.profileImg,
      identityCard: files.identityCard,
      cv: files.cv,
    });
  }

  @Delete('delete/:id')
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
