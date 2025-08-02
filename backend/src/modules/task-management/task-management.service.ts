import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Injectable()
export class TaskManagementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly activityService: ActivityManagementService,
  ) {}
  async registerTask(data: {
    taskname?: string;
    description?: string;
    adminId: string;
  }) {
    try {
      const { taskname, description } = data;

      // Basic validation - at least one field should be provided
      if (!taskname && !description) {
        throw new BadRequestException(
          'At least task name or description is required',
        );
      }

      const createTask = await this.prismaService.task.create({
        data: {
          taskname: taskname,
          description: description,
        },
      });

      // ✅ Check if admin exists
      const admin = await this.prismaService.admin.findUnique({
        where: { id: data.adminId },
      });

      if (!admin) {
        throw new BadRequestException('Admin not found');
      }
      // ✅ Log activity
      await this.activityService.createActivity({
        activityName: 'Task Registered',
        description: `${admin.adminName} registered a task: ${taskname || 'No Name'}`,
        adminId: admin.id,
      });

      return {
        message: 'task registered successfully',
        createTask,
      };
    } catch (error) {
      console.error('error registering a task', error);
      throw new Error(error.message);
    }
  }

  async findTaskByName(taskname: string) {
    try {
      if (!taskname) {
        throw new BadRequestException('task name is required');
      }

      const task = await this.prismaService.task.findFirst({
        where: {
          taskname: taskname,
        },
      });

      return task;
    } catch (error) {
      console.error('error getting task by name', error);
      throw new Error(error.message);
    }
  }

  async findTaskById(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('id is required');
      }

      const task = await this.prismaService.task.findUnique({
        where: {
          id: id,
        },
      });

      return task;
    } catch (error) {
      console.error('error getting task by id', error);
      throw new Error(error.message);
    }
  }

  async getAllTasks() {
    try {
      const tasks = await this.prismaService.task.findMany();
      return tasks;
    } catch (error) {
      console.error('error getting tasks', error);
      throw new Error(error.message);
    }
  }

  async updateTask(
    id: string,
    data: { taskname?: string; description?: string; adminId: string },
  ) {
    try {
      const existingTask = await this.findTaskById(id);

      if (!existingTask) {
        throw new BadRequestException('Task not found');
      }

      const updatedTask = await this.prismaService.task.update({
        where: { id },
        data: {
          taskname: data.taskname ?? existingTask.taskname,
          description: data.description ?? existingTask.description,
        },
      });

      // ✅ Check if admin exists
      const admin = await this.prismaService.admin.findUnique({
        where: { id: data.adminId },
      });

      if (!admin) {
        throw new BadRequestException('Admin not found');
      }

      // ✅ Log activity
      await this.activityService.createActivity({
        activityName: 'Task Updated',
        description: `${admin.adminName} updated a task: ${updatedTask.taskname}`,
        adminId: admin.id,
      });

      return {
        message: 'Task updated successfully',
        updatedTask,
      };
    } catch (error) {
      console.error('Error updating task', error);
      throw new Error(error.message);
    }
  }

  async deleteTask(id: string, adminId: string ) {
    try {
      const existTaks = await this.findTaskById(id); // Ensure task exists first

      if (!existTaks) {
        throw new NotFoundException('position not found');
      }
      await this.prismaService.task.delete({
        where: { id },
      });

      // ✅ Check if admin exists
      const admin = await this.prismaService.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new BadRequestException('Admin not found');
      }

      // ✅ Log activity
      await this.activityService.createActivity({
        activityName: 'Task Deleted',
        description: `${admin.adminName} deleted a task: ${existTaks.taskname}`,
        adminId: admin.id,
      });

      return {
        message: 'Task deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting task', error);
      throw new Error(error.message);
    }
  }
}