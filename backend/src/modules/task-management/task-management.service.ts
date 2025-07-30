import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TaskManagementService {
  constructor(private readonly prismaService: PrismaService) {}
  async registerTask(data: { taskname?: string; description?: string }) {
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
    data: { taskname?: string; description?: string },
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

      return {
        message: 'Task updated successfully',
        updatedTask,
      };
    } catch (error) {
      console.error('Error updating task', error);
      throw new Error(error.message);
    }
  }

  async deleteTask(id: string) {
    try {
      const existTaks = await this.findTaskById(id); // Ensure task exists first

      if (!existTaks) {
        throw new NotFoundException('position not found')
      }
      await this.prismaService.task.delete({
        where: { id },
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
