-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "OutageSchedule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "areaId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OutageSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutageSchedule_areaId_idx" ON "OutageSchedule"("areaId");

-- CreateIndex
CREATE INDEX "OutageSchedule_createdById_idx" ON "OutageSchedule"("createdById");

-- CreateIndex
CREATE INDEX "OutageSchedule_status_idx" ON "OutageSchedule"("status");

-- CreateIndex
CREATE INDEX "OutageSchedule_startTime_idx" ON "OutageSchedule"("startTime");

-- CreateIndex
CREATE INDEX "OutageSchedule_endTime_idx" ON "OutageSchedule"("endTime");

-- CreateIndex
CREATE INDEX "OutageSchedule_deletedAt_idx" ON "OutageSchedule"("deletedAt");

-- AddForeignKey
ALTER TABLE "OutageSchedule" ADD CONSTRAINT "OutageSchedule_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutageSchedule" ADD CONSTRAINT "OutageSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
