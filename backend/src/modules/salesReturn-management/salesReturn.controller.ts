import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { SalesReturnService } from './salesReturn.service';

@Controller('sales-return')
export class SalesReturnController {
  constructor(private readonly salesReturnService: SalesReturnService) {}

  @Post('create')
  async create(@Body() data) {
    return this.salesReturnService.create(data);
  }

  @Get()
  async findAll(
    @Query('updatedAfter') updatedAfter?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.salesReturnService.findAll(
      updatedAfter,
      limit ? +limit : 200,
      offset ? +offset : 0,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesReturnService.findOne(id);
  }
}