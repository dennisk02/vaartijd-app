-- Bron aanvraag (Rentman custom-veld "Bron aanvraag" op Project) -- 11 sep 2026.

-- AlterTable
ALTER TABLE "RentmanSubprojectSnapshot" ADD COLUMN "requestSource" TEXT;
