-- Splitst alle Rentman/AFAS/Shiftbase-koppelvelden van User/Project/Ship/
-- TimeEntry naar eigen 1-op-1-koppeltabellen (§10.6 in HANDOVER.md). Toegepast
-- op een database die vlak daarvoor al leeggetrokken en opnieuw gesynchroniseerd
-- was (27 aug 2026, app nog niet in echt gebruik) -- geen data-migratie nodig,
-- de kolommen worden na deze migratie opnieuw gevuld door lib/rentman/sync.ts,
-- lib/shiftbase/sync.ts en lib/afas/hoursSync.ts (allen in dezelfde ronde
-- aangepast om naar de nieuwe tabellen te schrijven).

-- DropIndex
DROP INDEX "Project_rentmanSubprojectId_key";

-- DropIndex
DROP INDEX "Project_shiftbaseDepartmentId_key";

-- DropIndex
DROP INDEX "Ship_shiftbaseDepartmentId_key";

-- DropIndex
DROP INDEX "TimeEntry_afasSyncStatus_idx";

-- DropIndex
DROP INDEX "TimeEntry_shiftbaseSyncStatus_idx";

-- DropIndex
DROP INDEX "TimeEntry_shiftbaseTimesheetId_key";

-- DropIndex
DROP INDEX "User_shiftbaseEmployeeId_key";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "afasProjectCode",
DROP COLUMN "rentmanEndsAt",
DROP COLUMN "rentmanProjectName",
DROP COLUMN "rentmanProjectNumber",
DROP COLUMN "rentmanStartsAt",
DROP COLUMN "rentmanStatus",
DROP COLUMN "rentmanSubprojectId",
DROP COLUMN "shiftbaseDepartmentId";

-- AlterTable
ALTER TABLE "Ship" DROP COLUMN "shiftbaseDepartmentId",
DROP COLUMN "shiftbaseDepartmentName";

-- AlterTable
ALTER TABLE "TimeEntry" DROP COLUMN "afasError",
DROP COLUMN "afasSyncStatus",
DROP COLUMN "afasSyncedAt",
DROP COLUMN "shiftbaseError",
DROP COLUMN "shiftbaseSyncStatus",
DROP COLUMN "shiftbaseSyncedAt",
DROP COLUMN "shiftbaseTimesheetId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "afasEmployeeNumber",
DROP COLUMN "shiftbaseEmployeeId";

-- CreateTable
CREATE TABLE "ProjectRentmanLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rentmanSubprojectId" TEXT NOT NULL,
    "rentmanProjectNumber" TEXT,
    "rentmanProjectName" TEXT,
    "rentmanStatus" TEXT,
    "rentmanStartsAt" TIMESTAMP(3),
    "rentmanEndsAt" TIMESTAMP(3),

    CONSTRAINT "ProjectRentmanLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAfasLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "afasProjectCode" TEXT NOT NULL,

    CONSTRAINT "ProjectAfasLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectShiftbaseLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shiftbaseDepartmentId" TEXT NOT NULL,

    CONSTRAINT "ProjectShiftbaseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipShiftbaseLink" (
    "id" TEXT NOT NULL,
    "shipId" TEXT NOT NULL,
    "shiftbaseDepartmentId" TEXT NOT NULL,
    "shiftbaseDepartmentName" TEXT,

    CONSTRAINT "ShipShiftbaseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAfasLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "afasEmployeeNumber" TEXT NOT NULL,

    CONSTRAINT "UserAfasLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserShiftbaseLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftbaseEmployeeId" TEXT NOT NULL,

    CONSTRAINT "UserShiftbaseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryAfasLink" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "syncedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "TimeEntryAfasLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryShiftbaseImport" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,

    CONSTRAINT "TimeEntryShiftbaseImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryShiftbaseExport" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "syncedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "TimeEntryShiftbaseExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRentmanLink_projectId_key" ON "ProjectRentmanLink"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRentmanLink_rentmanSubprojectId_key" ON "ProjectRentmanLink"("rentmanSubprojectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAfasLink_projectId_key" ON "ProjectAfasLink"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectShiftbaseLink_projectId_key" ON "ProjectShiftbaseLink"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectShiftbaseLink_shiftbaseDepartmentId_key" ON "ProjectShiftbaseLink"("shiftbaseDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipShiftbaseLink_shipId_key" ON "ShipShiftbaseLink"("shipId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipShiftbaseLink_shiftbaseDepartmentId_key" ON "ShipShiftbaseLink"("shiftbaseDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAfasLink_userId_key" ON "UserAfasLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserShiftbaseLink_userId_key" ON "UserShiftbaseLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserShiftbaseLink_shiftbaseEmployeeId_key" ON "UserShiftbaseLink"("shiftbaseEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryAfasLink_timeEntryId_key" ON "TimeEntryAfasLink"("timeEntryId");

-- CreateIndex
CREATE INDEX "TimeEntryAfasLink_syncStatus_idx" ON "TimeEntryAfasLink"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryShiftbaseImport_timeEntryId_key" ON "TimeEntryShiftbaseImport"("timeEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryShiftbaseImport_timesheetId_key" ON "TimeEntryShiftbaseImport"("timesheetId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryShiftbaseExport_timeEntryId_key" ON "TimeEntryShiftbaseExport"("timeEntryId");

-- CreateIndex
CREATE INDEX "TimeEntryShiftbaseExport_syncStatus_idx" ON "TimeEntryShiftbaseExport"("syncStatus");

-- AddForeignKey
ALTER TABLE "ProjectRentmanLink" ADD CONSTRAINT "ProjectRentmanLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAfasLink" ADD CONSTRAINT "ProjectAfasLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectShiftbaseLink" ADD CONSTRAINT "ProjectShiftbaseLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipShiftbaseLink" ADD CONSTRAINT "ShipShiftbaseLink_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAfasLink" ADD CONSTRAINT "UserAfasLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShiftbaseLink" ADD CONSTRAINT "UserShiftbaseLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryAfasLink" ADD CONSTRAINT "TimeEntryAfasLink_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryShiftbaseImport" ADD CONSTRAINT "TimeEntryShiftbaseImport_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryShiftbaseExport" ADD CONSTRAINT "TimeEntryShiftbaseExport_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

