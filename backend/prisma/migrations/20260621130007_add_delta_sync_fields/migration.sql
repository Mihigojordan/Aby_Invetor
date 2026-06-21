/*
  Warnings:

  - Added the required column `updatedAt` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Made the column `createdAt` on table `product` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `SalesReturn` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: backfill existing rows with current timestamp before adding NOT NULL constraint
ALTER TABLE `category` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `product` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `salesreturn` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `IdempotencyKey` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `response` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IdempotencyKey_key_key`(`key`),
    INDEX `IdempotencyKey_key_idx`(`key`),
    INDEX `IdempotencyKey_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Product_updatedAt_idx` ON `Product`(`updatedAt`);

-- CreateIndex
CREATE INDEX `StockIn_createdAt_idx` ON `StockIn`(`createdAt`);

-- CreateIndex
CREATE INDEX `StockOut_transactionId_idx` ON `StockOut`(`transactionId`);

-- CreateIndex
CREATE INDEX `StockOut_createdAt_idx` ON `StockOut`(`createdAt`);

