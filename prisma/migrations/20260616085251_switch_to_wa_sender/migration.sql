/*
  Warnings:

  - You are about to drop the column `accessToken` on the `WhatsAppConfig` table. All the data in the column will be lost.
  - You are about to drop the column `instanceName` on the `WhatsAppConfig` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumberId` on the `WhatsAppConfig` table. All the data in the column will be lost.
  - You are about to drop the column `wabaId` on the `WhatsAppConfig` table. All the data in the column will be lost.
  - You are about to drop the column `webhookSecret` on the `WhatsAppConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WhatsAppConfig" DROP COLUMN "accessToken",
DROP COLUMN "instanceName",
DROP COLUMN "phoneNumberId",
DROP COLUMN "wabaId",
DROP COLUMN "webhookSecret",
ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "sessionId" INTEGER;
