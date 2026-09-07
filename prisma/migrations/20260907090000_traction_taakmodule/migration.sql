-- Taak/toewijzingsmodule "Traction" (§10.9, 7 sep 2026): nieuwe AdminScope
-- TRACTION + de modellen Colleague/RockStatusOption/Rock/RockUpdate.

-- AlterEnum
ALTER TYPE "AdminScope" ADD VALUE 'TRACTION';

-- CreateTable
CREATE TABLE "Colleague" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Colleague_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RockStatusOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RockStatusOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rock" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "task" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RockUpdate" (
    "id" TEXT NOT NULL,
    "rockId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RockUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RockStatusOption_label_key" ON "RockStatusOption"("label");

-- CreateIndex
CREATE INDEX "Rock_year_month_idx" ON "Rock"("year", "month");

-- CreateIndex
CREATE INDEX "Rock_ownerId_idx" ON "Rock"("ownerId");

-- CreateIndex
CREATE INDEX "RockUpdate_rockId_idx" ON "RockUpdate"("rockId");

-- AddForeignKey
ALTER TABLE "Rock" ADD CONSTRAINT "Rock_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Colleague"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockUpdate" ADD CONSTRAINT "RockUpdate_rockId_fkey" FOREIGN KEY ("rockId") REFERENCES "Rock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockUpdate" ADD CONSTRAINT "RockUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
