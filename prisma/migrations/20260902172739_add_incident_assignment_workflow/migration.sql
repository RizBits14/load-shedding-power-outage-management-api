-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'COMPLETED', 'REASSIGNED', 'CANCELLED');

-- AlterTable
ALTER TABLE "OutageIncident" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "IncidentAssignment" (
    "id" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "note" TEXT,
    "incidentId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "workStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reassignedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentAssignment_incidentId_idx" ON "IncidentAssignment"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentAssignment_operatorId_idx" ON "IncidentAssignment"("operatorId");

-- CreateIndex
CREATE INDEX "IncidentAssignment_assignedById_idx" ON "IncidentAssignment"("assignedById");

-- CreateIndex
CREATE INDEX "IncidentAssignment_status_idx" ON "IncidentAssignment"("status");

-- CreateIndex
CREATE INDEX "IncidentAssignment_assignedAt_idx" ON "IncidentAssignment"("assignedAt");

-- AddForeignKey
ALTER TABLE "IncidentAssignment" ADD CONSTRAINT "IncidentAssignment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "OutageIncident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAssignment" ADD CONSTRAINT "IncidentAssignment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAssignment" ADD CONSTRAINT "IncidentAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
