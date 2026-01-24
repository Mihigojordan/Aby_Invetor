// src/credit/credit.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreditService } from './credit.service';
import { DualAuthGuard, RequestWithAuth } from 'src/guards/dual-auth.guard';

@Controller('credit')
@UseGuards(DualAuthGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  // ===============================
  // CREATE CREDIT
  // ===============================
  @Post()
  createCredit(@Req() req: RequestWithAuth, @Body() body: any) {
    const employeeId = req.employee?.id ?? body.employeeId ?? null;

    return this.creditService.createCredit({
      ...body,
      employeeId,
    });
  }

  // ===============================
  // ADD PAYMENT
  // ===============================
  @Patch(':id/pay')
  addPayment(
    @Param('id') id: string,
    @Body('amount') amount: number,
  ) {
    return this.creditService.addPayment(id, amount);
  }

  // ===============================
  // GET ALL
  // ===============================
  @Get()
  getAllCredits(@Query() query: any) {
    return this.creditService.getAllCredits(query);
  }

  // ===============================
  // GET ONE
  // ===============================
  @Get(':id')
  getCredit(@Param('id') id: string) {
    return this.creditService.getCredit(id);
  }

  // ===============================
  // DELETE
  // ===============================
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCredit(@Param('id') id: string) {
    return this.creditService.deleteCredit(id);
  }
}
