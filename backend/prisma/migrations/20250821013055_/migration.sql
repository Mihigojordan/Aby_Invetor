-- DropForeignKey
ALTER TABLE `expense` DROP FOREIGN KEY `Expense_reportId_fkey`;

-- DropForeignKey
ALTER TABLE `transaction` DROP FOREIGN KEY `Transaction_reportId_fkey`;

-- DropIndex
DROP INDEX `Expense_reportId_fkey` ON `expense`;

-- DropIndex
DROP INDEX `Transaction_reportId_fkey` ON `transaction`;

-- AlterTable
ALTER TABLE `salesreturn` ALTER COLUMN `createdAt` DROP DEFAULT;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
