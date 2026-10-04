-- AlterTable
ALTER TABLE "AlertLog" ADD COLUMN     "error" TEXT,
ADD COLUMN     "incidentId" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "riskScore" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "AlertLog_createdAt_idx" ON "AlertLog"("createdAt");

-- CreateIndex
CREATE INDEX "Incident_createdAt_idx" ON "Incident"("createdAt");

-- CreateIndex
CREATE INDEX "Incident_resolvedAt_idx" ON "Incident"("resolvedAt");
