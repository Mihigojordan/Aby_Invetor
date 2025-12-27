import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CacheTTL,CacheInterceptor } from '@nestjs/cache-manager';

import { CategoryManagementService } from './category-management.service';

@UseInterceptors(CacheInterceptor)
@Controller('category')
export class CategoryManagementController {
  constructor(private readonly categoryService: CategoryManagementService) {}

  // ❌ NO CACHE (write)
  @Post('create')
  createCategory(@Body() data) {
    return this.categoryService.createCategory(data);
  }

  // ✅ CACHED
  @Get('all')
  @CacheTTL(120) // 2 minutes
  getAllCategories(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.categoryService.getAllCategories(+page, +limit);
  }

  // ✅ CACHED
  @Get('getone/:id')
  @CacheTTL(300) // 5 minutes
  getCategoryById(@Param('id') id: string) {
    return this.categoryService.getCategoryById(id);
  }

  // ❌ NO CACHE (write)
  @Put('update/:id')
  updateCategory(@Param('id') id: string, @Body() data) {
    return this.categoryService.updateCategory(id, data);
  }

  // ❌ NO CACHE (write)
  @Delete('delete/:id')
  deleteCategory(@Param('id') id: string, @Body() data) {
    return this.categoryService.deleteCategory(id, data);
  }
}
