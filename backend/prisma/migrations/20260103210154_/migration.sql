-- AlterTable
ALTER TABLE `requisition` ADD COLUMN `transactionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `requisitionitemdelivery` ADD COLUMN `stockoutId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `RequisitionItemDelivery` ADD CONSTRAINT `RequisitionItemDelivery_stockoutId_fkey` FOREIGN KEY (`stockoutId`) REFERENCES `StockOut`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
