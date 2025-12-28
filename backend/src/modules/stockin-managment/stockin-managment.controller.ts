import { BadRequestException, Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { StockinManagmentService } from './stockin-managment.service';

@Controller('stockin')
export class StockinManagmentController {
  constructor(private readonly stockInService: StockinManagmentService) {}

  @Post('create')
  async createStockIn(@Body() data) {
    return this.stockInService.register(data);
  }

  @Get('all')
  async getAllStockIns(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const pageLimit = Number(limit) > 0 ? Number(limit) : 10;
    return this.stockInService.getAll(pageNumber, pageLimit);
  }

  @Get('getone/:id')
  async getStockInById(@Param('id') id: string) {
    return this.stockInService.getOne(id);
  }

  @Put('update/:id')
  async updateStockIn(@Param('id') id: string, @Body() data) {
    return this.stockInService.update(id, data);
  }

  @Delete('delete/:id')
  async deleteStockIn(@Param('id') id: string, @Body() data) {
    return this.stockInService.delete(id, data);
  }

  @Get('sku/:sku')
  async getStockInBysku(@Param('sku') sku: string) {
    try {
      return this.stockInService.getStockInBysku(sku);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
