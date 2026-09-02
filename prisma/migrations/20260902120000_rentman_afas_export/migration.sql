-- Rentman -> AFAS overzicht/wachtrij, losse pagina /admin/rentman-afas
-- (2 sep 2026, zie HANDOVER.md §17-18):
-- - ProjectRentmanLink krijgt echte sync-statusvelden voor de (nog niet
--   geautoriseerde) AFAS-projectaanmaak-connector, naast de bestaande
--   afasCreateRequestedAt-checklist.
-- - Nieuwe tabel RentmanInvoiceExport voor het verkoopfacturen-overzicht +
--   PDF-koppeling + dezelfde checklist/sync-statuspatroon.

-- AlterTable
ALTER TABLE "ProjectRentmanLink" ADD COLUMN     "afasCreateError" TEXT,
ADD COLUMN     "afasCreateStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "afasCreateSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RentmanInvoiceExport" (
    "id" TEXT NOT NULL,
    "rentmanInvoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "amountExclVat" DECIMAL(12,2),
    "amountInclVat" DECIMAL(12,2),
    "rentmanProjectNumber" TEXT,
    "projectName" TEXT,
    "customerName" TEXT,
    "pdfFileId" TEXT,
    "afasCreateRequestedAt" TIMESTAMP(3),
    "afasCreateStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "afasCreateSyncedAt" TIMESTAMP(3),
    "afasCreateError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentmanInvoiceExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentmanInvoiceExport_rentmanInvoiceId_key" ON "RentmanInvoiceExport"("rentmanInvoiceId");

-- CreateIndex
CREATE INDEX "RentmanInvoiceExport_invoiceDate_idx" ON "RentmanInvoiceExport"("invoiceDate");
