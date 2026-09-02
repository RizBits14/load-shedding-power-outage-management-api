-- CreateTable
CREATE TABLE "Feeder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "capacityMw" DOUBLE PRECISION,
    "status" "InfrastructureStatus" NOT NULL DEFAULT 'ACTIVE',
    "substationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Feeder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feeder_code_key" ON "Feeder"("code");

-- CreateIndex
CREATE INDEX "Feeder_substationId_idx" ON "Feeder"("substationId");

-- CreateIndex
CREATE INDEX "Feeder_status_idx" ON "Feeder"("status");

-- CreateIndex
CREATE INDEX "Feeder_deletedAt_idx" ON "Feeder"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Feeder_substationId_name_key" ON "Feeder"("substationId", "name");

-- AddForeignKey
ALTER TABLE "Feeder" ADD CONSTRAINT "Feeder_substationId_fkey" FOREIGN KEY ("substationId") REFERENCES "Substation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
