import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Param, Post, Put, Query } from "@nestjs/common";
import { StockoutService } from "./stockout.service";
import { IdempotencyService } from "src/common/idempotency/idempotency.service";

@Controller('stockout')
export class StockoutController{
    constructor(
      private readonly stockoutService: StockoutService,
      private readonly idempotencyService: IdempotencyService,
    ) {}

  @Post('create')
  async register(
    @Body() body: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    try {
      // Return cached response if we've seen this idempotency key before
      if (idempotencyKey) {
        const cached = await this.idempotencyService.check(idempotencyKey);
        if (cached) {
          return cached;
        }
      }

      const result = await this.stockoutService.create(body);

      // Cache the response for 24 hours so retries get the same result
      if (idempotencyKey) {
        await this.idempotencyService.store(idempotencyKey, result);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Get('all')
  async getAll(
    @Query('updatedAfter') updatedAfter?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.stockoutService.getAll(
        updatedAfter,
        limit ? +limit : 200,
        offset ? +offset : 0,
      );
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Get('debt-all')
  async getDebtAll() {
    try {
      return await this.stockoutService.getAllDebted();
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
  @Put('update-payment/:id')
  async updatePayment(@Param('id') id: string, @Body() body: any) {
    try {
      return await this.stockoutService.updatePayment(id, body.amount);
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