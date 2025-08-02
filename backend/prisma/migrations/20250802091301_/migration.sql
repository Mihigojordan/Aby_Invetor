/*
  Warnings:

  - You are about to drop the column `stockoutId` on the `salesreturn` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `salesreturn` DROP FOREIGN KEY `salesReturn_stockoutId_fkey`;

-- DropIndex
DROP INDEX `salesReturn_stockoutId_fkey` ON `salesreturn`;

-- AlterTable
ALTER TABLE `salesreturn` DROP COLUMN `stockoutId`,
    ADD COLUMN `transactionId` VARCHAR(191) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `SalesReturnItem` (
    `id` VARCHAR(191) NOT NULL,
    `salesReturnId` VARCHAR(191) NOT NULL,
    `stockoutId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SalesReturnItem` ADD CONSTRAINT `SalesReturnItem_stockoutId_fkey` FOREIGN KEY (`stockoutId`) REFERENCES `StockOut`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReturnItem` ADD CONSTRAINT `SalesReturnItem_salesReturnId_fkey` FOREIGN KEY (`salesReturnId`) REFERENCES `SalesReturn`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
