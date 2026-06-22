-- AlterTable
ALTER TABLE `category` ADD COLUMN `subcategory` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `product` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `salesreturn` ALTER COLUMN `updatedAt` DROP DEFAULT;
