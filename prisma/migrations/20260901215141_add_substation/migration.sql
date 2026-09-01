-- CreateEnum
CREATE TYPE "InfrastructureStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Substation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" "InfrastructureStatus" NOT NULL DEFAULT 'ACTIVE',
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Substation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Substation_code_key" ON "Substation"("code");

-- CreateIndex
CREATE INDEX "Substation_zoneId_idx" ON "Substation"("zoneId");

-- CreateIndex
CREATE INDEX "Substation_status_idx" ON "Substation"("status");

-- CreateIndex
CREATE INDEX "Substation_deletedAt_idx" ON "Substation"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Substation_zoneId_name_key" ON "Substation"("zoneId", "name");

-- AddForeignKey
ALTER TABLE "Substation" ADD CONSTRAINT "Substation_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
