-- CreateTable
CREATE TABLE "RentmanMonthlySnapshot" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "projectCount" INTEGER NOT NULL,
    "totalRevenue" DECIMAL(12,2) NOT NULL,
    "totalInvoiced" DECIMAL(12,2) NOT NULL,
    "statusBreakdown" JSONB NOT NULL,
    "cancelledCount" INTEGER NOT NULL,
    "cancelledRevenue" DECIMAL(12,2) NOT NULL,
    "topCancelledName" TEXT,
    "topCancelledNumber" TEXT,
    "topCancelledAmount" DECIMAL(12,2),
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentmanMonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentmanInvoicedMonthly" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "invoicedExclVat" DECIMAL(12,2) NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentmanInvoicedMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentmanPendingProject" (
    "id" TEXT NOT NULL,
    "rentmanSubprojectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rentmanProjectNumber" TEXT,
    "status" TEXT NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL,
    "planperiodStart" TIMESTAMP(3),
    "month" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentmanPendingProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentmanManualMonthlyEntry" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "revenueTotal" DECIMAL(12,2),
    "deliveryRevenue" DECIMAL(12,2),
    "pickupRevenue" DECIMAL(12,2),
    "newRequests" INTEGER,
    "inOption" INTEGER,
    "confirmed" INTEGER,
    "cancelled" INTEGER,
    "note" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentmanManualMonthlyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentmanMonthlySnapshot_month_key" ON "RentmanMonthlySnapshot"("month");

-- CreateIndex
CREATE UNIQUE INDEX "RentmanInvoicedMonthly_month_key" ON "RentmanInvoicedMonthly"("month");

-- CreateIndex
CREATE UNIQUE INDEX "RentmanPendingProject_rentmanSubprojectId_key" ON "RentmanPendingProject"("rentmanSubprojectId");

-- CreateIndex
CREATE UNIQUE INDEX "RentmanManualMonthlyEntry_month_location_key" ON "RentmanManualMonthlyEntry"("month", "location");

-- AddForeignKey
ALTER TABLE "RentmanManualMonthlyEntry" ADD CONSTRAINT "RentmanManualMonthlyEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

