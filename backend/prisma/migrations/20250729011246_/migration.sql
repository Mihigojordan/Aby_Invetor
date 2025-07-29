/*
  Warnings:

  - A unique constraint covering the columns `[adminEmail]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Admin_adminEmail_key` ON `Admin`(`adminEmail`);
