/*
  Warnings:

  - You are about to alter the column `totalPrice` on the `stockin` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `stockin` MODIFY `totalPrice` INTEGER NULL;
