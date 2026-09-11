-- Annuleringsreden (Rentman custom-veld "Reden annulering" op Project) --
-- 11 sep 2026.

-- AlterTable
ALTER TABLE "RentmanSubprojectSnapshot" ADD COLUMN "cancellationReason" TEXT;
