import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { SalesReturnService } from './salesReturn.service';

@Controller('sales-return')
export class SalesReturnController {
  constructor(private readonly salesReturnService: SalesReturnService) {}

  @Post('create')
  async create(@Body() data) {
    return this.salesReturnService.create(data);
  }

  // Supports ?updatedAfter=<ISO> for delta sync
  @Get()
  async findAll(@Query('updatedAfter') updatedAfter?: string) {
    return this.salesReturnService.findAll(updatedAfter);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesReturnService.findOne(id);
  }
}