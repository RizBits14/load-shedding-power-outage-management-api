-- AlterTable
ALTER TABLE "OutageReport" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "OutageReport_reviewedById_idx" ON "OutageReport"("reviewedById");

-- AddForeignKey
ALTER TABLE "OutageReport" ADD CONSTRAINT "OutageReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
