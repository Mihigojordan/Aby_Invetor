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

  // ✅ CACHED — supports ?updatedAfter=<ISO> for delta sync
  // When updatedAfter is omitted: full fetch (first launch / manual reset)
  // When updatedAfter is set: returns only records changed since that time + deletedIds
  @Get('all')
  @CacheTTL(120) // 2 minutes — safe because delta responses are keyed by URL (includes updatedAfter)
  getAllCategories(
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    return this.categoryService.getAllCategories(updatedAfter);
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
