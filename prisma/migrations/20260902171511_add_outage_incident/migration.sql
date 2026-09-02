-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESTORED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "OutageReport" ADD COLUMN     "incidentId" TEXT;

-- CreateTable
CREATE TABLE "OutageIncident" (
    "id" TEXT NOT NULL,
    "incidentCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "areaId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "restoredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OutageIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutageIncident_incidentCode_key" ON "OutageIncident"("incidentCode");

-- CreateIndex
CREATE INDEX "OutageIncident_areaId_idx" ON "OutageIncident"("areaId");

-- CreateIndex
CREATE INDEX "OutageIncident_createdById_idx" ON "OutageIncident"("createdById");

-- CreateIndex
CREATE INDEX "OutageIncident_status_idx" ON "OutageIncident"("status");

-- CreateIndex
CREATE INDEX "OutageIncident_severity_idx" ON "OutageIncident"("severity");

-- CreateIndex
CREATE INDEX "OutageIncident_priorityScore_idx" ON "OutageIncident"("priorityScore");

-- CreateIndex
CREATE INDEX "OutageIncident_startedAt_idx" ON "OutageIncident"("startedAt");

-- CreateIndex
CREATE INDEX "OutageIncident_deletedAt_idx" ON "OutageIncident"("deletedAt");

-- CreateIndex
CREATE INDEX "OutageReport_incidentId_idx" ON "OutageReport"("incidentId");

-- AddForeignKey
ALTER TABLE "OutageReport" ADD CONSTRAINT "OutageReport_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "OutageIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutageIncident" ADD CONSTRAINT "OutageIncident_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutageIncident" ADD CONSTRAINT "OutageIncident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
