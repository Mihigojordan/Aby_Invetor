import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { PartnerService } from './partner.service';

@Controller('partner')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  // Create Partner
  @Post('create')
  async createPartner(@Body() data: { name: string; email: string; phone?: string; address?: string }) {
    return this.partnerService.createPartner(data);
  }

  // Get all partners
  @Get('all')
  async getAllPartners() {
    return this.partnerService.getAllPartners();
  }

  // Get single partner
  @Get('getone/:id')
  async getPartnerById(@Param('id') id: string) {
    return this.partnerService.getPartnerById(id);
  }

  // Update partner
  @Put('update/:id')
  async updatePartner(
    @Param('id') id: string,
    @Body() data: { name?: string; email?: string; password?: string; phone?: string; address?: string },
  ) {
    return this.partnerService.updatePartner(id, data);
  }

  // Delete partner
  @Delete('delete/:id')
  async deletePartner(@Param('id') id: string) {
    return this.partnerService.deletePartner(id);
  }
}
