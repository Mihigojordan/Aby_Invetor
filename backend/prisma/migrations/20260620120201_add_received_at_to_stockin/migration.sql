-- AlterTable
ALTER TABLE `stockin` ADD COLUMN `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Backfill: existing rows should reflect their original creation date, not the migration run time
UPDATE `stockin` SET `receivedAt` = `createdAt`;
