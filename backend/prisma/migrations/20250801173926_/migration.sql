/*
  Warnings:

  - You are about to drop the column `sku` on the `stockout` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `activity` ALTER COLUMN `doneAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `stockout` DROP COLUMN `sku`,
    ADD COLUMN `transactionId` VARCHAR(191) NULL;
