import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryManagementService {
    constructor( private readonly prismaService: PrismaService ){}
    async createCategory(data: { name?: string; description?: string }) {
    try {
      const { name, description } = data;

      if (!name) {
        throw new BadRequestException('Category name is required');
      }

      const categoryExists = await this.prismaService.category.findFirst({
        where: { name },
      });

      if (categoryExists) {
        throw new BadRequestException('Category already exists');
      }

      const createdCategory = await this.prismaService.category.create({
        data: { name, description },
      });

      return {
        message: 'Category created successfully',
        category: createdCategory,
      };
    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error(error.message);
    }
  }

  async getAllCategories() {
    try {
      const categories = await this.prismaService.category.findMany();
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error(error.message);
    }
  }

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

  async updateCategory(id: string, data: { name?: string; description?: string }) {
    try {
      if (!id) throw new BadRequestException('Category ID is required');

      const existing = await this.prismaService.category.findUnique({ where: { id } });

      if (!existing) throw new BadRequestException('Category not found');

      const updated = await this.prismaService.category.update({
        where: { id },
        data,
      });

      return {
        message: 'Category updated successfully',
        category: updated,
      };
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error(error.message);
    }
  }

  async deleteCategory(id: string) {
    try {
      if (!id) throw new BadRequestException('Category ID is required');

      const deleted = await this.prismaService.category.delete({
        where: { id },
      });

      return {
        message: 'Category deleted successfully',
        category: deleted,
      };
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error(error.message);
    }
  }
}
