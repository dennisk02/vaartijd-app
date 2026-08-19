-- CreateEnum
CREATE TYPE "ProjectGroup" AS ENUM ('ALL', 'EVENTS', 'EVENTO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "projectGroup" "ProjectGroup" NOT NULL DEFAULT 'ALL';

