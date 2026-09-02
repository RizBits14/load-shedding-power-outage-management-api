-- CreateEnum
CREATE TYPE "AreaPriority" AS ENUM ('NORMAL', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "priority" "AreaPriority" NOT NULL DEFAULT 'NORMAL',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "feederId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_code_key" ON "Area"("code");

-- CreateIndex
CREATE INDEX "Area_feederId_idx" ON "Area"("feederId");

-- CreateIndex
CREATE INDEX "Area_priority_idx" ON "Area"("priority");

-- CreateIndex
CREATE INDEX "Area_deletedAt_idx" ON "Area"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Area_feederId_name_key" ON "Area"("feederId", "name");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
