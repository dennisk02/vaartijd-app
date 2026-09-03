-- ProjectRentmanLink.rentmanBusinessUnit (2 sep 2026, zie HANDOVER §10.8):
-- EVENTO / M&R Kampen / M&R Utrecht, zelfde afleiding als het financiële
-- dashboard (§10.5) -- nodig om de juiste AFAS-Projectgroep te kiezen bij
-- projectaanmaak (PtProject, connectors/afas/projectSync.ts).

-- AlterTable
ALTER TABLE "ProjectRentmanLink" ADD COLUMN     "rentmanBusinessUnit" TEXT;
