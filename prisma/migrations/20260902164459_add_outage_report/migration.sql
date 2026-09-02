-- CreateEnum
CREATE TYPE "OutageReportStatus" AS ENUM ('PENDING', 'VERIFIED', 'LINKED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OutageIssueType" AS ENUM ('TOTAL_OUTAGE', 'PARTIAL_OUTAGE', 'VOLTAGE_FLUCTUATION', 'OTHER');

-- CreateTable
CREATE TABLE "OutageReport" (
    "id" TEXT NOT NULL,
    "issueType" "OutageIssueType" NOT NULL,
    "description" TEXT,
    "status" "OutageReportStatus" NOT NULL DEFAULT 'PENDING',
    "customerId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutageReport_customerId_idx" ON "OutageReport"("customerId");

-- CreateIndex
CREATE INDEX "OutageReport_areaId_idx" ON "OutageReport"("areaId");

-- CreateIndex
CREATE INDEX "OutageReport_status_idx" ON "OutageReport"("status");

-- CreateIndex
CREATE INDEX "OutageReport_issueType_idx" ON "OutageReport"("issueType");

-- CreateIndex
CREATE INDEX "OutageReport_reportedAt_idx" ON "OutageReport"("reportedAt");

-- AddForeignKey
ALTER TABLE "OutageReport" ADD CONSTRAINT "OutageReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutageReport" ADD CONSTRAINT "OutageReport_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
