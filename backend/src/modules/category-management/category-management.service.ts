import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CategoryManagementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly activityService: ActivityManagementService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ================= CREATE =================
  async createCategory(data: {
    name?: string;
    description?: string;
    adminId?: string;
    employeeId?: string;
  }) {
    try {
      const { name, description } = data;
      if (!name) throw new BadRequestException('Category name is required');

      const categoryExists = await this.prismaService.category.findFirst({
        where: { name },
      });
      if (categoryExists) throw new BadRequestException('Category already exists');

      const createdCategory = await this.prismaService.category.create({
        data: { name, description },
      });

      if (data?.adminId) {
        const admin = await this.prismaService.admin.findUnique({
          where: { id: data.adminId },
        });
        if (!admin) throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'category created',
          description: `${admin.adminName} created category called ${createdCategory.name}`,
          adminId: admin.id,
        });
      }

      if (data?.employeeId) {
        const employee = await this.prismaService.employee.findUnique({
          where: { id: data.employeeId },
        });
        if (!employee)
          throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'category created',
          description: `${employee.firstname} created category ${createdCategory.name}`,
          employeeId: employee.id,
        });
      }

      await this.safeCacheReset();

      return {
        message: 'Category created successfully',
        category: createdCategory,
      };
    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error(error.message);
    }
  }

  // ================= GET ALL =================
  async getAllCategories(p0: number, p1: number) {
    try {
      const categories = await this.prismaService.category.findMany();
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error(error.message);
    }
  }

  // ================= GET BY ID =================
  async getCategoryById(id: string) {
    try {
      if (!id) throw new BadRequestException('Category ID is required');

      const category = await this.prismaService.category.findUnique({
        where: { id },
      });
      if (!category) throw new BadRequestException('Category not found');

      return category;
    } catch (error) {
      console.error('Error getting category:', error);
      throw new Error(error.message);
    }
  }

  // ================= UPDATE =================
  async updateCategory(
    id: string,
    data: {
      name?: string;
      description?: string;
      adminId?: string;
      employeeId?: string;
    },
  ) {
    try {
      if (!id) throw new BadRequestException('Category ID is required');

      const existing = await this.prismaService.category.findUnique({
        where: { id },
      });
      if (!existing) throw new BadRequestException('Category not found');

      const updated = await this.prismaService.category.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          description: data.description ?? existing.description,
        },
      });

      if (data?.adminId) {
        const admin = await this.prismaService.admin.findUnique({
          where: { id: data.adminId },
        });
        if (!admin) throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'category updated',
          description: `${admin.adminName} updated category called ${updated.name}`,
          adminId: admin.id,
        });
      }

      if (data?.employeeId) {
        const employee = await this.prismaService.employee.findUnique({
          where: { id: data.employeeId },
        });
        if (!employee)
          throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'category updated',
          description: `${employee.firstname} updated category ${updated.name}`,
          employeeId: employee.id,
        });
      }

      await this.safeCacheReset();

      return {
        message: 'Category was updated successfully',
        category: updated,
      };
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error(error.message);
    }
  }

  // ================= DELETE =================
  async deleteCategory(
    id: string,
    data?: Partial<{ adminId: string; employeeId?: string }>,
  ) {
    try {
      if (!id) throw new BadRequestException('Category ID is required');

      const deleted = await this.prismaService.category.delete({
        where: { id },
      });

      if (data?.adminId) {
        const admin = await this.prismaService.admin.findUnique({
          where: { id: data.adminId },
        });
        if (!admin) throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'category deleted',
          description: `${admin.adminName} deleted category called ${deleted.name}`,
          adminId: admin.id,
        });
      }

      if (data?.employeeId) {
        const employee = await this.prismaService.employee.findUnique({
          where: { id: data.employeeId },
        });
        if (!employee)
          throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

        await this.activityService.createActivity({
          activityName: 'category deleted',
          description: `${employee.firstname} deleted category ${deleted.name}`,
          employeeId: employee.id,
        });
      }

      await this.safeCacheReset();

      return {
        message: 'Category deleted successfully',
        category: deleted,
      };
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error(error.message);
    }
  }

  // ================= SAFE CACHE RESET =================
  private async safeCacheReset() {
    try {
      // @ts-ignore: store may have reset method depending on driver
      if (this.cacheManager.store && typeof this.cacheManager.store.reset === 'function') {
        await (this.cacheManager.stores as any).reset();
      } else {
        console.warn('Cache store does not support reset');
      }
    } catch (err) {
      console.error('Error resetting cache:', err);
    }
  }
}
