import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put } from "@nestjs/common";
import { StockoutService } from "./stockout.service";

@Controller('stockout')
export class StockoutController{
    constructor(private readonly stockoutService: StockoutService) {}

  @Post('create')
  async register(@Body() body: any) {
    try {
      return await this.stockoutService.create(body);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Get('all')
  async getAll() {
    try {
      return await this.stockoutService.getAll();
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }


  @Get('transaction/:id')
  async getStockoutBytransactionId(@Param('id') id:string){
    try {
      
      return await this.stockoutService.getStockOutByTransactionId(id)
    } catch (error) {
      console.log('error getting transactions:', error.message)
      throw new HttpException(error.message, error.status)
    }
  }

  @Get('getone/:id')
  async getOne(@Param('id') id: string) {
    try {
      return await this.stockoutService.getOne(id);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.NOT_FOUND);
    }
  }

  @Put('update/:id')
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      return await this.stockoutService.update(id, body);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('delete/:id')
  async delete(@Param('id') id: string, @Body() data ) {
    try {
      return await this.stockoutService.delete(id, data);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.NOT_FOUND);
    }
  }
}