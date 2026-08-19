-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canLogMeals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canLogOccupancy" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canLogWaste" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "defaultProjectId" TEXT,
ADD COLUMN     "useDefaultProject" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultProjectId_fkey" FOREIGN KEY ("defaultProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
