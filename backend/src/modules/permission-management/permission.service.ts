import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type PermissionAction =
  | 'access'
  | 'viewOwn'
  | 'viewAll'
  | 'create'
  | 'update'
  | 'delete';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async getMatrixForFeature(feature: string) {
    const [employees, permissions] = await Promise.all([
      this.prisma.employee.findMany({
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          status: true,
        },
      }),
      this.prisma.permission.findMany({ where: { feature } }),
    ]);

    const permissionByEmployeeId = new Map(
      permissions.map((p) => [p.employeeId, p]),
    );

    return employees.map((employee) => {
      const permission = permissionByEmployeeId.get(employee.id);
      return {
        employee,
        feature,
        access: permission?.access ?? false,
        viewOwn: permission?.viewOwn ?? false,
        viewAll: permission?.viewAll ?? false,
        create: permission?.create ?? false,
        update: permission?.update ?? false,
        delete: permission?.delete ?? false,
      };
    });
  }

  async getFeatureAccessCounts(): Promise<Record<string, number>> {
    const grouped = await this.prisma.permission.groupBy({
      by: ['feature'],
      where: { access: true },
      _count: { _all: true },
    });
    return grouped.reduce((acc, row) => {
      acc[row.feature] = row._count._all;
      return acc;
    }, {} as Record<string, number>);
  }

  async getPermissionsForEmployee(employeeId: string) {
    return this.prisma.permission.findMany({ where: { employeeId } });
  }

  async upsertPermission(
    employeeId: string,
    feature: string,
    data: Partial<{
      access: boolean;
      viewOwn: boolean;
      viewAll: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    }>,
  ) {
    return this.prisma.permission.upsert({
      where: { employeeId_feature: { employeeId, feature } },
      create: { employeeId, feature, ...data },
      update: { ...data },
    });
  }

  async employeeHasPermission(
    employeeId: string,
    feature: string,
    action: PermissionAction,
  ): Promise<boolean> {
    const permission = await this.prisma.permission.findUnique({
      where: { employeeId_feature: { employeeId, feature } },
    });
    return permission?.[action] ?? false;
  }
}
