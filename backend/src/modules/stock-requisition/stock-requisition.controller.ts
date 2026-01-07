import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { StockRequisitionService } from './stock-requisition.service';
import { StockRequisitionGateway } from './stock-requisition.gateway';
import { DualAuthGuard, RequestWithAuth } from 'src/guards/dual-auth.guard';

@Controller('stock-requisition')
@UseGuards(DualAuthGuard)
export class StockRequisitionController {
  constructor(
    private readonly service: StockRequisitionService,
    private readonly gateway: StockRequisitionGateway,
  ) { }

  // ───────────────────────────────────
  // CREATE STOCK REQUISITION
  // ───────────────────────────────────
  @Post()
  async create(@Body() body: any, @Req() req: RequestWithAuth) {
    const employeeId = req.employee?.id;

    if (!employeeId) {
      throw new UnauthorizedException('Employee authentication required');
    }

    const requisition = await this.service.createStockRequisition({
      employeeId,
      description: body.description,
      items: body.items,
    });

    this.gateway.notifyCreated(requisition);
    return requisition;
  }

  // ───────────────────────────────────
  // GET ALL STOCK REQUISITIONS
  // ───────────────────────────────────
  @Get()
  async findAll(@Req() req: RequestWithAuth) {
    if (req.admin) {
      return this.service.findAll();
    }
    if (req.employee) {
      return this.service.findByEmployee(req.employee.id);
    }
    throw new UnauthorizedException('Authentication required');
  }

  // ───────────────────────────────────
  // GET ONE STOCK REQUISITION
  // ───────────────────────────────────
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ───────────────────────────────────
  // GET RECEIVING SUMMARY
  // ───────────────────────────────────
  @Get(':id/receiving-summary')
  async getReceivingSummary(@Param('id') id: string) {
    return this.service.getReceivingSummary(id);
  }

  // ───────────────────────────────────
  // UPDATE STOCK REQUISITION (Employee Only)
  // ───────────────────────────────────
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: RequestWithAuth,
  ) {
    const employeeId = req.employee?.id;

    if (!employeeId) {
      throw new UnauthorizedException('Only employees can update requisitions');
    }

    const updated = await this.service.updateStockRequisition(id, employeeId, body);

    this.gateway.notifyUpdated(updated);
    return updated;
  }

  // ───────────────────────────────────
  // APPROVE STOCK REQUISITION
  // ───────────────────────────────────
  @Put(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: RequestWithAuth,
  ) {
    if (!req.admin && !req.employee) {
      throw new UnauthorizedException('Authorization required to approve requisitions');
    }

    const approved = await this.service.approveStockRequisition(id, body);

    this.gateway.notifyApproved(approved);
    return approved;
  }

  // ───────────────────────────────────
  // RECEIVE ITEMS
  // ───────────────────────────────────
  @Put(':id/receive')
  async receiveItems(
    @Param('id') id: string,
    @Body()
    body: {
      items: {
        itemId: string;
        receivedQty: number;
        note?: string;
      }[];
    },
    @Req() req: RequestWithAuth,
  ) {

    if (!req.employee?.id) {
      throw new UnauthorizedException('Authentication required to receive items');
    }

    const receivedById = req.employee?.id || req.admin?.id;

    if (!receivedById) {
      throw new UnauthorizedException('Authentication required to receive items');
    }

    const updated = await this.service.receiveItems(id, receivedById, body.items);

    this.gateway.notifyReceived(updated);
    return updated;
  }

  // ───────────────────────────────────
  // REJECT STOCK REQUISITION
  // ───────────────────────────────────
  @Put(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: RequestWithAuth,
  ) {
    if (!req.admin && !req.employee) {
      throw new UnauthorizedException('Authorization required to reject requisitions');
    }

    const rejected = await this.service.rejectStockRequisition(id, reason);

    this.gateway.notifyRejected(rejected);
    return rejected;
  }

  // ───────────────────────────────────
  // DELETE STOCK REQUISITION
  // ───────────────────────────────────
  @Delete(':id')
  async delete(@Param('id') id: string) {
    const deleted = await this.service.delete(id);

    this.gateway.notifyDeleted(id);
    return deleted;
  }
}