import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { AdminJwtAuthGuard } from 'src/guards/adminGuard.guard';
import { EmployeeJwtAuthGuard } from 'src/guards/employeeGuard.guard';
import { RequestWithEmployee } from 'src/common/interfaces/employee.interface';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get('feature/:feature')
  @UseGuards(AdminJwtAuthGuard)
  async getMatrixForFeature(@Param('feature') feature: string) {
    return await this.permissionService.getMatrixForFeature(feature);
  }

  @Get('counts')
  @UseGuards(AdminJwtAuthGuard)
  async getFeatureAccessCounts() {
    return await this.permissionService.getFeatureAccessCounts();
  }

  @Put()
  @UseGuards(AdminJwtAuthGuard)
  async upsertPermission(
    @Body()
    body: {
      employeeId: string;
      feature: string;
      access?: boolean;
      viewOwn?: boolean;
      viewAll?: boolean;
      create?: boolean;
      update?: boolean;
      delete?: boolean;
    },
  ) {
    const { employeeId, feature, ...data } = body;
    return await this.permissionService.upsertPermission(
      employeeId,
      feature,
      data,
    );
  }

  @Get('employee/me')
  @UseGuards(EmployeeJwtAuthGuard)
  async getOwnPermissions(@Req() req: RequestWithEmployee) {
    const employeeId = req.employee?.id as string;
    return await this.permissionService.getPermissionsForEmployee(employeeId);
  }
}
