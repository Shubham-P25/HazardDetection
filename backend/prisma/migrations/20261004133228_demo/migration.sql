/*
  Warnings:

  - You are about to drop the column `acknowledged` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `riskScore` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `sensor` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `Incident` table. All the data in the column will be lost.
  - Added the required column `peakValue` to the `Incident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sensorField` to the `Incident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `severity` to the `Incident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thresholdCrossed` to the `Incident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `Incident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zone` to the `Incident` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Incident_createdAt_idx";

-- DropIndex
DROP INDEX "Incident_resolvedAt_idx";

-- AlterTable
ALTER TABLE "Incident" DROP COLUMN "acknowledged",
DROP COLUMN "createdAt",
DROP COLUMN "message",
DROP COLUMN "riskScore",
DROP COLUMN "sensor",
DROP COLUMN "type",
DROP COLUMN "value",
ADD COLUMN     "acknowledgedByClerkId" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "peakValue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sensorField" TEXT NOT NULL,
ADD COLUMN     "severity" TEXT NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "thresholdCrossed" TEXT NOT NULL,
ADD COLUMN     "unit" TEXT NOT NULL,
ADD COLUMN     "zone" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "notifyEmail" TEXT,
    "notifyTelegramChatId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAlert" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "IncidentAlert_incidentId_idx" ON "IncidentAlert"("incidentId");

-- CreateIndex
CREATE INDEX "Incident_startedAt_idx" ON "Incident"("startedAt");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_sensorField_status_idx" ON "Incident"("sensorField", "status");

-- AddForeignKey
ALTER TABLE "IncidentAlert" ADD CONSTRAINT "IncidentAlert_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
