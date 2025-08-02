import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TaskManagementService } from './task-management.service';
import { AdminJwtAuthGuard } from 'src/guards/adminGuard.guard';
import { RequestWithAdmin } from 'src/common/interfaces/admin.interface';

@Controller('task')
@UseGuards(AdminJwtAuthGuard)
export class TaskManagementController {
  constructor(private readonly taskServices: TaskManagementService) {}
  @Post('create')
  async registerTask(@Body() data) {
    try {
      return await this.taskServices.registerTask(data);
    } catch (error) {
      console.error('error registering a task', error);
      throw new Error(error.message);
    }
  }

  @Get('all')
  async getAllTasks() {
    try {
      return await this.taskServices.getAllTasks();
    } catch (error) {
      console.error('error getting tasks', error);
      throw new Error(error.message);
    }
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.taskServices.findTaskById(id);
  }

  @Put('update/:id')
  @UseGuards(AdminJwtAuthGuard)
  async updateTask(
    @Param('id') id: string,
    @Body() data,
    @Req() req: RequestWithAdmin,
  ) {
    const adminId = req.admin?.id as string;
    return this.taskServices.updateTask(id, {
      ...data,
      adminId,
    });
  }

  @Delete('delete/:id')
  @UseGuards(AdminJwtAuthGuard)
  async deleteTask(
    @Param('id') id: string,
    @Body() data,
    @Req() req: RequestWithAdmin,
  ) {
     const adminId = req.admin?.id as string;
    return this.taskServices.deleteTask(id, adminId);
  }
}