/*
  Warnings:

  - Made the column `productId` on table `stockin` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `stockin` DROP FOREIGN KEY `StockIn_productId_fkey`;

-- DropIndex
DROP INDEX `StockIn_productId_fkey` ON `stockin`;

-- AlterTable
ALTER TABLE `salesreturn` ALTER COLUMN `createdAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `stockin` MODIFY `productId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `StockIn` ADD CONSTRAINT `StockIn_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
