-- CreateEnum
CREATE TYPE "FoodWasteSource" AS ENUM ('CREW', 'IMPORT');

-- AlterTable
ALTER TABLE "FoodWaste" DROP COLUMN "kg",
ADD COLUMN     "dataQualityFlag" TEXT,
ADD COLUMN     "foodUsedKg" DECIMAL(7,2) NOT NULL,
ADD COLUMN     "kitchenWasteKg" DECIMAL(6,2) NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "passengerWasteKg" DECIMAL(6,2) NOT NULL,
ADD COLUMN     "prepWasteKg" DECIMAL(6,2) NOT NULL DEFAULT 0,
ADD COLUMN     "source" "FoodWasteSource" NOT NULL DEFAULT 'CREW',
ADD COLUMN     "sourceFile" TEXT;
