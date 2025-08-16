-- AlterTable
ALTER TABLE `salesreturn` ALTER COLUMN `createdAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `stockout` ADD COLUMN `paymentMethod` ENUM('MOMO', 'CARD', 'CASH') NULL;
