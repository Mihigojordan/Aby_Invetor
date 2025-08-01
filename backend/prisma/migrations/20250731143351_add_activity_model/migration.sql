/*
  Warnings:

  - You are about to drop the column `activityAt` on the `activity` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `activity` table. All the data in the column will be lost.
  - Added the required column `adminId` to the `Activity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `activity` DROP COLUMN `activityAt`,
    DROP COLUMN `userId`,
    ADD COLUMN `adminId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
