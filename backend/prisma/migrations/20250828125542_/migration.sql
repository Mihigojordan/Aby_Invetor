-- AlterTable
ALTER TABLE `stockout` ADD COLUMN `backorderId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `BackOrder` (
    `id` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NULL,
    `quantity` INTEGER NULL,
    `soldPrice` INTEGER NULL,
    `adminId` VARCHAR(191) NULL,
    `employeeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StockOut` ADD CONSTRAINT `StockOut_backorderId_fkey` FOREIGN KEY (`backorderId`) REFERENCES `BackOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BackOrder` ADD CONSTRAINT `BackOrder_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BackOrder` ADD CONSTRAINT `BackOrder_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
