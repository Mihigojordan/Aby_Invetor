-- AlterTable
ALTER TABLE `category` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `product` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `salesreturn` ALTER COLUMN `updatedAt` DROP DEFAULT;
