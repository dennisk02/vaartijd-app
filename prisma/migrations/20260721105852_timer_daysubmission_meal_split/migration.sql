/*
  Warnings:

  - You are about to drop the column `personCount` on the `ShipOccupancy` table. All the data in the column will be lost.
  - You are about to drop the `MealLog` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `crewCount` to the `ShipOccupancy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passengerCount` to the `ShipOccupancy` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Language" AS ENUM ('NL', 'EN');

-- CreateEnum
CREATE TYPE "TimeEntryMode" AS ENUM ('TIMER', 'MANUAL');

-- DropForeignKey
ALTER TABLE "MealLog" DROP CONSTRAINT "MealLog_createdById_fkey";

-- DropForeignKey
ALTER TABLE "MealLog" DROP CONSTRAINT "MealLog_shipId_fkey";

-- AlterTable
ALTER TABLE "Ship" ADD COLUMN     "capacity" INTEGER;

-- AlterTable
ALTER TABLE "ShipOccupancy" DROP COLUMN "personCount",
ADD COLUMN     "crewCount" INTEGER NOT NULL,
ADD COLUMN     "passengerCount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "breakMinutes" INTEGER,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "mode" "TimeEntryMode" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "startTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "language" "Language" NOT NULL DEFAULT 'NL';

-- DropTable
DROP TABLE "MealLog";

-- CreateTable
CREATE TABLE "ActiveTimer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shipId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiveTimer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealCount" (
    "id" TEXT NOT NULL,
    "shipId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" "MealType" NOT NULL,
    "countServed" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodWaste" (
    "id" TEXT NOT NULL,
    "shipId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" "MealType" NOT NULL,
    "kg" DECIMAL(6,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodWaste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaySubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DaySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActiveTimer_userId_key" ON "ActiveTimer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MealCount_shipId_date_mealType_key" ON "MealCount"("shipId", "date", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "FoodWaste_shipId_date_mealType_key" ON "FoodWaste"("shipId", "date", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "DaySubmission_userId_date_key" ON "DaySubmission"("userId", "date");

-- AddForeignKey
ALTER TABLE "ActiveTimer" ADD CONSTRAINT "ActiveTimer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveTimer" ADD CONSTRAINT "ActiveTimer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveTimer" ADD CONSTRAINT "ActiveTimer_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealCount" ADD CONSTRAINT "MealCount_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealCount" ADD CONSTRAINT "MealCount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodWaste" ADD CONSTRAINT "FoodWaste_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodWaste" ADD CONSTRAINT "FoodWaste_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaySubmission" ADD CONSTRAINT "DaySubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
