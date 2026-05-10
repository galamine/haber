/*
  Warnings:

  - You are about to drop the column `createdAt` on the `tokens` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `tokens` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isEmailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `user_id` to the `tokens` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- Migrate existing roles before dropping column
UPDATE "users" SET "role" = 'super_admin' WHERE "role" = 'admin';
UPDATE "users" SET "role" = 'staff' WHERE "role" = 'user';

-- Clear tokens (type column cannot be cast; old token types resetPassword/verifyEmail are removed)
DELETE FROM "tokens";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'clinic_admin', 'therapist', 'staff');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('access', 'refresh');

-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('login', 'invite');

-- DropForeignKey
ALTER TABLE "tokens" DROP CONSTRAINT "tokens_userId_fkey";

-- DropIndex
DROP INDEX "tokens_token_idx";

-- DropIndex
DROP INDEX "tokens_userId_type_idx";

-- AlterTable
ALTER TABLE "tokens" DROP COLUMN "createdAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "device_id" TEXT,
ADD COLUMN     "family_id" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "TokenType" NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "isEmailVerified",
DROP COLUMN "password",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tenant_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'staff';

-- CreateTable
CREATE TABLE "otp_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hashed_otp" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "type" "OtpType" NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tokens_user_id_type_idx" ON "tokens"("user_id", "type");

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_records" ADD CONSTRAINT "otp_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
