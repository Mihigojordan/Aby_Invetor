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

  @Get('all')
  getAllCategories(
    @Query('updatedAfter') updatedAfter?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.categoryService.getAllCategories(
      updatedAfter,
      limit ? +limit : 200,
      offset ? +offset : 0,
    );
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
