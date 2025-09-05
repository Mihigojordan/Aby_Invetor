import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { BackOrderManagementService } from './backorder-management.service';

@Controller('backorder')
export class BackOrderManagementController {
  constructor(private readonly backOrderService: BackOrderManagementService) {}

  // Create BackOrder
  @Post('create')
  async createBackOrder(@Body() data) {
    return await this.backOrderService.createBackOrder(data);
  }

  // Get All BackOrders
  @Get('all')
  async getAllBackOrders() {
    return await this.backOrderService.getAllBackOrders();
  }

  // Get Single BackOrder by ID
  @Get('getone/:id')
  async getBackOrderById(@Param('id') id) {
    return await this.backOrderService.getBackOrderById(id);
  }

  // Update BackOrder
  @Put('update/:id')
  async updateBackOrder(@Param('id') id, @Body() data) {
    return await this.backOrderService.updateBackOrder(id, data);
  }

  // Delete BackOrder
  @Delete('delete/:id')
  async deleteBackOrder(@Param('id') id, @Body() data) {
    return this.backOrderService.deleteBackOrder(id, data);
  }
}