-- AlterEnum
ALTER TYPE "TimeEntryMode" ADD VALUE 'SHIFTBASE_IMPORT';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "shiftbaseDepartmentId" TEXT;

-- AlterTable
ALTER TABLE "Ship" ADD COLUMN     "shiftbaseDepartmentId" TEXT,
ADD COLUMN     "shiftbaseDepartmentName" TEXT;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "shiftbaseTimesheetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_shiftbaseDepartmentId_key" ON "Project"("shiftbaseDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Ship_shiftbaseDepartmentId_key" ON "Ship"("shiftbaseDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_shiftbaseTimesheetId_key" ON "TimeEntry"("shiftbaseTimesheetId");

-- CreateIndex
CREATE UNIQUE INDEX "User_shiftbaseEmployeeId_key" ON "User"("shiftbaseEmployeeId");

