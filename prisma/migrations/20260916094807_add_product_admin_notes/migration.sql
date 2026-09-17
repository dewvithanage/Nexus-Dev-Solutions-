/*
  Warnings:

  - You are about to drop the column `resetToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetTokenExpiry` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_resetToken_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "adminNotes" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "resetToken",
DROP COLUMN "resetTokenExpiry";
