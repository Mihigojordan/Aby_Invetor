import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CategoryManagementService } from './category-management.service';

@Controller('category')
export class CategoryManagementController {
    constructor(private readonly categoryService: CategoryManagementService ){}

    //Create Category
  @Post('create')
  async createCategory(@Body() data) {
    return await this.categoryService.createCategory(data);
  }

  //Get All Categories
  @Get('all')
  async getAllCategories() {
    return await this.categoryService.getAllCategories();
  }

  // Get Single Category by ID
  @Get('getone/:id')
  async getCategoryById(@Param('id') id: string) {
    return await this.categoryService.getCategoryById(id);
  }

  //Update Category
  @Put('update/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() data,
  ) {
    return await this.categoryService.updateCategory(id, data);
  }

  //Delete Category
  @Delete('delete/:id')
  async deleteCategory(@Param('id') id: string , @Body() data ) {
    return this.categoryService.deleteCategory(id, data);
  }
}
