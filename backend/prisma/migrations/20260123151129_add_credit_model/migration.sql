-- CreateTable
CREATE TABLE `Credit` (
    `id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `totalAmount` DOUBLE NOT NULL,
    `payments` JSON NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `employeeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Credit` ADD CONSTRAINT `Credit_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
