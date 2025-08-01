import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { SalesReturnService } from './salesReturn.service';

@Controller('sales-return')
export class SalesReturnController {
  constructor(private readonly salesReturnService: SalesReturnService) {}

  @Post('create')
  async create(@Body() data) {
    return this.salesReturnService.create(data);
  }

  @Get()
  async findAll() {
    return this.salesReturnService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesReturnService.findOne(id);
  }
}
