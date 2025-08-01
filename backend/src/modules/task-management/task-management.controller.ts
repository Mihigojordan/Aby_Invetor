import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards,Request } from '@nestjs/common';
import { TaskManagementService } from './task-management.service';
import { AdminJwtAuthGuard } from 'src/guards/adminGuard.guard';

@Controller('task')
@UseGuards(AdminJwtAuthGuard)
export class TaskManagementController {
  constructor(private readonly taskServices: TaskManagementService) {}

  @Post('create')
  async registerTask(@Body() data,@Request() req) {
    try {
  // Attach user ID from request (assuming guard sets req.user)
    return await this.taskServices.registerTask({ ...data, userId: req.user.id })
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
  async updateTask(
    @Param('id') id: string,
    @Body() data: { taskname?: string; description?: string },
  ) {
    return this.taskServices.updateTask(id, data);
  }

  @Delete('delete/:id')
  async deleteTask(@Param('id') id: string) {
    return this.taskServices.deleteTask(id);
  }
}
