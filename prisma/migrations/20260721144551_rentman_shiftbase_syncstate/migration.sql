-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "rentmanEndsAt" TIMESTAMP(3),
ADD COLUMN     "rentmanProjectName" TEXT,
ADD COLUMN     "rentmanProjectNumber" TEXT,
ADD COLUMN     "rentmanStartsAt" TIMESTAMP(3),
ADD COLUMN     "rentmanStatus" TEXT,
ADD COLUMN     "rentmanSubprojectId" TEXT;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "shiftbaseError" TEXT,
ADD COLUMN     "shiftbaseSyncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "shiftbaseSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shiftbaseEmployeeId" TEXT;

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncState_key_key" ON "SyncState"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Project_rentmanSubprojectId_key" ON "Project"("rentmanSubprojectId");

-- CreateIndex
CREATE INDEX "TimeEntry_shiftbaseSyncStatus_idx" ON "TimeEntry"("shiftbaseSyncStatus");

