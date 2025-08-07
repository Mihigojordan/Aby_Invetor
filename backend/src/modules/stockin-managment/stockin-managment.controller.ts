import { BadRequestException, Body, Controller, Delete, Get, HttpException, Param, Post, Put } from '@nestjs/common';
import { StockinManagmentService } from './stockin-managment.service';

@Controller('stockin')
export class StockinManagmentController {
  constructor(private readonly stockInService: StockinManagmentService) { }

  @Post('create')
  async createStockIn(
    @Body() data
  ) {
    const stockIn = await this.stockInService.register(data);
    return {
      message: 'StockIn created successfully',
      stockIn,
    };
  }

  @Get('all')
  async getAllStockIns() {
    return await this.stockInService.getAll();
  }

  @Get('getone/:id')
  async getStockInById(@Param('id') id: string) {
    return await this.stockInService.getOne(id);
  }

  @Put('update/:id')
  async updateStockIn(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      quantity: number;
      price: number;
      supplier: string;
    }>,
  ) {
    return await this.stockInService.update(id, data);
  }

  @Delete('delete/:id')
  async deleteStockIn(@Param('id') id: string, @Body() data) {
    await this.stockInService.delete(id, data);
    return { message: 'StockIn deleted successfully' };
  }

  @Get('sku/:id')
  async getStockInBysku(@Param('id') sku: string) {
    try {
      console.log(sku);
      
      return await this.stockInService.getStockInBysku(sku)
    } catch (error) {
      console.log('error getting stockinbysku:', error.message)
      throw new HttpException(error.message, error.status)
    }
  }
}
