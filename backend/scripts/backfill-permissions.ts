/**
 * One-time backfill: translates today's Task-keyword based capabilities into
 * equivalent starting rows in the new Permission table, so employees don't
 * lose access the moment consumers switch from reading Task keywords to
 * reading Permission rows.
 *
 * Run once with: npx ts-node scripts/backfill-permissions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mirrors the keyword checks previously in EmployeeDashboard.jsx / Sidebar.jsx / report.service.ts
const TASK_KEYWORD_GRANTS: {
  keywords: string[];
  feature: string;
  field: 'access' | 'viewAll';
}[] = [
  { keywords: ['receiving', 'stockin'], feature: 'stockin', field: 'access' },
  { keywords: ['saling', 'selling', 'sales', 'stockout'], feature: 'stockout-movement', field: 'access' },
  { keywords: ['returning', 'return'], feature: 'sales-returns', field: 'access' },
  { keywords: ['report'], feature: 'employee-report', field: 'viewAll' },
];

async function main() {
  const employees = await prisma.employee.findMany({ include: { tasks: true } });

  let grantsApplied = 0;

  for (const employee of employees) {
    const taskNames = (employee.tasks || [])
      .map((t) => t.taskname?.toLowerCase() || '')
      .filter(Boolean);

    for (const grant of TASK_KEYWORD_GRANTS) {
      const hasMatch = taskNames.some((name) =>
        grant.keywords.some((keyword) => name.includes(keyword)),
      );
      if (!hasMatch) continue;

      await prisma.permission.upsert({
        where: {
          employeeId_feature: { employeeId: employee.id, feature: grant.feature },
        },
        create: {
          employeeId: employee.id,
          feature: grant.feature,
          [grant.field]: true,
        },
        update: {
          [grant.field]: true,
        },
      });
      grantsApplied++;
      console.log(
        `Granted ${grant.field}=true on "${grant.feature}" to ${employee.firstname || ''} ${employee.lastname || ''} (${employee.id})`,
      );
    }
  }

  console.log(`\nDone. ${grantsApplied} permission grant(s) applied across ${employees.length} employee(s).`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
