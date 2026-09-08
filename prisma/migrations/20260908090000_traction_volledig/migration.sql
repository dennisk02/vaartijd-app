-- Volledige uitbreiding Traction (§10.9, 7-8 sep 2026): doorzetten (carry
-- forward) op Rock, en de modellen voor Doelen/Kernwaarden/organisatie-
-- instellingen/jaren, om de volledige functionaliteit + huidige data uit het
-- oorspronkelijke VBB Traction Organizer-bestand over te nemen.

-- AlterTable
ALTER TABLE "Rock" ADD COLUMN     "carriedFromId" TEXT,
ALTER COLUMN "status" SET DEFAULT '';

-- CreateTable
CREATE TABLE "TractionOrg" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "company" TEXT NOT NULL DEFAULT '',
    "tagline" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TractionOrg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TractionYear" (
    "year" INTEGER NOT NULL,

    CONSTRAINT "TractionYear_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "CoreValue" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "meaning" TEXT[],
    "measurement" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CoreValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalStatusOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GoalStatusOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalCategoryGroup" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GoalCategoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GoalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoalStatusOption_label_key" ON "GoalStatusOption"("label");

-- CreateIndex
CREATE INDEX "GoalCategoryGroup_year_category_idx" ON "GoalCategoryGroup"("year", "category");

-- CreateIndex
CREATE INDEX "GoalItem_groupId_idx" ON "GoalItem"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Rock_carriedFromId_key" ON "Rock"("carriedFromId");

-- AddForeignKey
ALTER TABLE "Rock" ADD CONSTRAINT "Rock_carriedFromId_fkey" FOREIGN KEY ("carriedFromId") REFERENCES "Rock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalItem" ADD CONSTRAINT "GoalItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GoalCategoryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

