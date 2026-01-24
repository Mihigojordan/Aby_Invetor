-- AlterTable
ALTER TABLE `credit` ADD COLUMN `reportId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Credit` ADD CONSTRAINT `Credit_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
