-- CreateTable
CREATE TABLE `Requisition` (
    `id` VARCHAR(191) NOT NULL,
    `requisitionNumber` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_FULFILLED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `partnerNote` VARCHAR(191) NULL,
    `approvalSummary` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Requisition_requisitionNumber_key`(`requisitionNumber`),
    INDEX `Requisition_partnerId_status_idx`(`partnerId`, `status`),
    INDEX `Requisition_createdAt_idx`(`createdAt`),
    INDEX `Requisition_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequisitionItem` (
    `id` VARCHAR(191) NOT NULL,
    `requisitionId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_FULFILLED', 'FULFILLED') NOT NULL DEFAULT 'PENDING',
    `itemName` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `qtyRequested` INTEGER NOT NULL,
    `qtyApproved` INTEGER NULL,
    `approvalNote` VARCHAR(191) NULL,
    `stockInId` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `unitPriceAtApproval` DECIMAL(10, 2) NULL,
    `priceOverride` DECIMAL(10, 2) NULL,
    `priceOverriddenAt` DATETIME(3) NULL,
    `qtyDelivered` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RequisitionItem_requisitionId_idx`(`requisitionId`),
    INDEX `RequisitionItem_stockInId_idx`(`stockInId`),
    INDEX `RequisitionItem_status_idx`(`status`),
    INDEX `RequisitionItem_approvedById_idx`(`approvedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequisitionItemDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `requisitionItemId` VARCHAR(191) NOT NULL,
    `qtyDelivered` INTEGER NOT NULL,
    `deliveryNote` VARCHAR(191) NULL,
    `confirmedByPartnerId` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `partnerNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NOT NULL,

    INDEX `RequisitionItemDelivery_requisitionItemId_idx`(`requisitionItemId`),
    INDEX `RequisitionItemDelivery_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Requisition` ADD CONSTRAINT `Requisition_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `Partner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisitionItem` ADD CONSTRAINT `RequisitionItem_requisitionId_fkey` FOREIGN KEY (`requisitionId`) REFERENCES `Requisition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisitionItem` ADD CONSTRAINT `RequisitionItem_stockInId_fkey` FOREIGN KEY (`stockInId`) REFERENCES `StockIn`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisitionItem` ADD CONSTRAINT `RequisitionItem_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisitionItemDelivery` ADD CONSTRAINT `RequisitionItemDelivery_requisitionItemId_fkey` FOREIGN KEY (`requisitionItemId`) REFERENCES `RequisitionItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisitionItemDelivery` ADD CONSTRAINT `RequisitionItemDelivery_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisitionItemDelivery` ADD CONSTRAINT `RequisitionItemDelivery_confirmedByPartnerId_fkey` FOREIGN KEY (`confirmedByPartnerId`) REFERENCES `Partner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
