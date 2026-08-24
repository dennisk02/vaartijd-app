-- DropTable
DROP TABLE "RentmanMonthlySnapshot";

-- DropTable
DROP TABLE "RentmanPendingProject";

-- CreateTable
CREATE TABLE "RentmanSubprojectSnapshot" (
    "id" TEXT NOT NULL,
    "rentmanSubprojectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rentmanProjectNumber" TEXT,
    "status" TEXT NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL,
    "invoiced" DECIMAL(12,2) NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "planperiodStart" TIMESTAMP(3),
    "planperiodEnd" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentmanSubprojectSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentmanSubprojectSnapshot_rentmanSubprojectId_key" ON "RentmanSubprojectSnapshot"("rentmanSubprojectId");

-- CreateIndex
CREATE INDEX "RentmanSubprojectSnapshot_month_idx" ON "RentmanSubprojectSnapshot"("month");

-- CreateIndex
CREATE INDEX "RentmanSubprojectSnapshot_status_idx" ON "RentmanSubprojectSnapshot"("status");

