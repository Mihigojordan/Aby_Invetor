import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { RequisitionStatus } from '@prisma/client';

// Adjust these imports based on your auth setup
import { DualAuthGuard, RequestWithAuth } from 'src/guards/dual-auth.guard';



@Controller('requisition')
@UseGuards(DualAuthGuard) // Uncomment when you have your auth guard
export class RequisitionController {
  constructor(private readonly service: RequisitionService) {}

  // ============================================================================
  // PARTNER ENDPOINTS
  // ============================================================================

  /**
   * CREATE REQUISITION
   * POST /requisition
   * Body: { partnerId, partnerNote?, items: [{ itemName, qtyRequested, note? }] }
   */
  @Post()
  async create(@Body() body: any, @Req() req: RequestWithAuth) {
    const partnerId = req.partner?.id || body.partnerId;

    if (!partnerId) {
      throw new UnauthorizedException('Partner ID required');
    }

    return this.service.createRequisition({
      partnerId,
      partnerNote: body.partnerNote,
      items: body.items,
    });
  }

  /**
   * UPDATE PENDING REQUISITION (Partner only)
   * PUT /requisition/:id
   * Body: { partnerNote?, items?: [{ id?, itemName?, qtyRequested?, note?, remove? }] }
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: RequestWithAuth
  ) {
    const partnerId = req.partner?.id;

    if (!partnerId) {
      throw new UnauthorizedException('Only partners can update requisitions');
    }

    return this.service.updateRequisition(id, partnerId, body);
  }

  /**
   * CANCEL REQUISITION (Partner only)
   * PUT /requisition/:id/cancel
   */
  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const partnerId = req.partner?.id;

    if (!partnerId) {
      throw new UnauthorizedException('Only partners can cancel requisitions');
    }

    return this.service.cancelRequisition(id, partnerId);
  }

  /**
   * CONFIRM DELIVERY RECEIPT (Partner only)
   * PUT /requisition/delivery/:deliveryId/confirm
   * Body: { partnerNote? }
   */
  @Put('delivery/:deliveryId/confirm')
  async confirmReceipt(
    @Param('deliveryId') deliveryId: string,
    @Body('partnerNote') partnerNote: string,
    @Req() req: RequestWithAuth
  ) {
    const partnerId = req.partner?.id;

    if (!partnerId) {
      throw new UnauthorizedException('Only partners can confirm receipts');
    }

    return this.service.confirmReceipt(deliveryId, partnerId, partnerNote);
  }

  // ============================================================================
  // EMPLOYEE ENDPOINTS
  // ============================================================================

  /**
   * APPROVE ITEMS (Employee only)
   * PUT /requisition/:id/approve
   * Body: { items: [{ itemId, qtyApproved, stockInId?, approvalNote? }] }
   */
  @Put(':id/approve')
  async approveItems(
    @Param('id') id: string,
    @Body() body: { items: any[] },
    @Req() req: RequestWithAuth
  ) {
    const employeeId = req.employee?.id ;

    if (!employeeId) {
      throw new UnauthorizedException('Only employees can approve items');
    }

    return this.service.approveItems(id, employeeId, body.items);
  }

  /**
   * REJECT REQUISITION (Employee only)
   * PUT /requisition/:id/reject
   * Body: { reason: string }
   */
  @Put(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: RequestWithAuth
  ) {
    const employeeId = req.employee?.id;

    if (!employeeId) {
      throw new UnauthorizedException('Only employees can reject requisitions');
    }

    return this.service.rejectRequisition(id, employeeId, reason);
  }

  /**
   * DELIVER ITEMS (Employee only)
   * PUT /requisition/:id/deliver
   * Body: { deliveries: [{ itemId, qtyDelivered, deliveryNote? }] }
   */
  @Put(':id/deliver')
  async deliverItems(
    @Param('id') id: string,
    @Body() body: { deliveries: any[] },
    @Req() req: RequestWithAuth
  ) {
    const employeeId = req.employee?.id;

    if (!employeeId) {
      throw new UnauthorizedException('Only employees can deliver items');
    }

    return this.service.deliverItems(id, employeeId, body.deliveries);
  }

  /**
   * OVERRIDE PRICE (Admin/Employee only)
   * PUT /requisition/item/:itemId/price
   * Body: { priceOverride: number }
   */
  @Put('item/:itemId/price')
  async overridePrice(
    @Param('itemId') itemId: string,
    @Body('priceOverride') priceOverride: number,
    @Req() req: RequestWithAuth
  ) {
    if (!req.admin) {
      throw new UnauthorizedException('Only admin can override prices');
    }

    return this.service.overridePrice(itemId, priceOverride);
  }

  // ============================================================================
  // QUERY ENDPOINTS (Both Partner and Employee)
  // ============================================================================

  /**
   * GET ALL REQUISITIONS
   * GET /requisition
   * Query params: ?status=PENDING&partnerId=xxx
   */
  @Get()
  async findAll(@Query() query: any, @Req() req: RequestWithAuth) {
    // If partner is logged in, show only their requisitions
    if (req.partner) {
      return this.service.findByPartner(req.partner.id);
    }

    // If employee/admin, show all or filtered
    if (req.employee || req.admin) {
      return this.service.findAll({
        partnerId: query.partnerId,
        status: query.status as RequisitionStatus,
      });
    }

    throw new UnauthorizedException('Authentication required');
  }

  /**
   * GET ONE REQUISITION
   * GET /requisition/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /**
   * GET DELIVERY SUMMARY
   * GET /requisition/:id/delivery-summary
   */
  @Get(':id/delivery-summary')
  async getDeliverySummary(@Param('id') id: string) {
    return this.service.getDeliverySummary(id);
  }

  /**
   * GET MY REQUISITIONS (Partner)
   * GET /requisition/my/list
   */
  @Get('my/list')
  async getMyRequisitions(@Req() req: RequestWithAuth) {
    const partnerId = req.partner?.id;

    if (!partnerId) {
      throw new UnauthorizedException('Only partners can view their requisitions');
    }

    return this.service.findByPartner(partnerId);
  }

  // ============================================================================
  // DELETE (Only PENDING requisitions)
  // ============================================================================

  /**
   * DELETE REQUISITION
   * DELETE /requisition/:id
   * Only works for PENDING status
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: RequestWithAuth) {
    if (!req.partner && !req.employee) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.service.delete(id);
  }
}