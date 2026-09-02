-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UNPAID', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "ElectricityBill" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "billingMonth" INTEGER NOT NULL,
    "billingYear" INTEGER NOT NULL,
    "unitsConsumed" DOUBLE PRECISION,
    "energyCharge" DECIMAL(12,2) NOT NULL,
    "serviceCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "customerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectricityBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElectricityBill_billNumber_key" ON "ElectricityBill"("billNumber");

-- CreateIndex
CREATE INDEX "ElectricityBill_customerId_idx" ON "ElectricityBill"("customerId");

-- CreateIndex
CREATE INDEX "ElectricityBill_createdById_idx" ON "ElectricityBill"("createdById");

-- CreateIndex
CREATE INDEX "ElectricityBill_status_idx" ON "ElectricityBill"("status");

-- CreateIndex
CREATE INDEX "ElectricityBill_dueDate_idx" ON "ElectricityBill"("dueDate");

-- CreateIndex
CREATE INDEX "ElectricityBill_billingYear_billingMonth_idx" ON "ElectricityBill"("billingYear", "billingMonth");

-- CreateIndex
CREATE INDEX "ElectricityBill_createdAt_idx" ON "ElectricityBill"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ElectricityBill_customerId_billingMonth_billingYear_key" ON "ElectricityBill"("customerId", "billingMonth", "billingYear");

-- AddForeignKey
ALTER TABLE "ElectricityBill" ADD CONSTRAINT "ElectricityBill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBill" ADD CONSTRAINT "ElectricityBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
