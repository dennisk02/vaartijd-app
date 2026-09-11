-- Ziekte/verlof (AbsenceEntry) en gepland rooster (RosterEntry) uit
-- Shiftbase (§ vervolg op de vaarbemanning-koppeling, 11 sep 2026).

-- CreateTable
CREATE TABLE "AbsenceEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "isSick" BOOLEAN NOT NULL,
    "optionLabel" TEXT NOT NULL,
    "shiftbaseAbsenteeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shipId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "shiftbaseOccurrenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceEntry_shiftbaseAbsenteeId_date_key" ON "AbsenceEntry"("shiftbaseAbsenteeId", "date");

-- CreateIndex
CREATE INDEX "AbsenceEntry_userId_date_idx" ON "AbsenceEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RosterEntry_shiftbaseOccurrenceId_key" ON "RosterEntry"("shiftbaseOccurrenceId");

-- CreateIndex
CREATE INDEX "RosterEntry_userId_date_idx" ON "RosterEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "RosterEntry_shipId_date_idx" ON "RosterEntry"("shipId", "date");

-- AddForeignKey
ALTER TABLE "AbsenceEntry" ADD CONSTRAINT "AbsenceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
