-- AlterTable
ALTER TABLE `activity` ALTER COLUMN `doneAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `salesReturn` (
    `id` VARCHAR(191) NOT NULL,
    `stockoutId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `salesReturn` ADD CONSTRAINT `salesReturn_stockoutId_fkey` FOREIGN KEY (`stockoutId`) REFERENCES `StockOut`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
