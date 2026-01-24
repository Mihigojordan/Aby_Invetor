// src/expense/expense.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { DualAuthGuard, RequestWithAuth } from 'src/guards/dual-auth.guard';

@Controller('expense')
@UseGuards(DualAuthGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  // ===============================
  // CREATE
  // ===============================
  @Post()
  createExpense(
    @Req() req: RequestWithAuth,
    @Body() body: any,
  ) {
    // If the logged-in user is an employee, attach employeeId automatically
    const employeeId = req.employee?.id ?? null;

    return this.expenseService.createExpense({
      ...body,
      employeeId,
    });
  }

  // ===============================
  // UPDATE
  // ===============================
  @Patch(':id')
  updateExpense(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.expenseService.updateExpense(id, body);
  }

  // ===============================
// UPDATE STATUS
// ===============================
@Patch(':id/status')
updateExpenseStatus(
  @Param('id') id: string,
  @Body('status') status: string,
) {
  return this.expenseService.updateExpenseStatus(id, status);
}


  // ===============================
  // GET ALL
  // ===============================
  @Get()
  getAllExpenses(@Query() query: any) {
    return this.expenseService.getAllExpenses(query);
  }

  // ===============================
  // GET ONE
  // ===============================
  @Get(':id')
  getExpense(@Param('id') id: string) {
    return this.expenseService.getExpense(id);
  }

  // ===============================
  // DELETE
  // ===============================
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteExpense(@Param('id') id: string) {
    return this.expenseService.deleteExpense(id);
  }
}
