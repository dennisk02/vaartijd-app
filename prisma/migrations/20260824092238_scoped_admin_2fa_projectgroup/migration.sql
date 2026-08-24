-- CreateEnum
CREATE TYPE "AdminScope" AS ENUM ('PROJECTS', 'SHIPS', 'USERS', 'RENTMAN', 'RENTMAN_FINANCIEEL', 'SHIFTBASE', 'AFAS', 'RAPPORTAGES');

-- AlterEnum
-- ProjectGroup gaat van 3 waarden (ALL/EVENTS/EVENTO) naar 2 (EVENTS_EVENTO/RIVER_ROOTS).
-- Een simpele tekst-cast zou falen (geen van de oude waarden bestaat letterlijk in het
-- nieuwe enum) -- daarom expliciet mappen: alle 3 oude waarden -> EVENTS_EVENTO, want
-- RIVER_ROOTS is een compleet nieuw concept waar nog geen bestaande medewerker toe behoorde.
BEGIN;
CREATE TYPE "ProjectGroup_new" AS ENUM ('EVENTS_EVENTO', 'RIVER_ROOTS');
ALTER TABLE "User" ALTER COLUMN "projectGroup" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "projectGroup" TYPE "ProjectGroup_new" USING ('EVENTS_EVENTO'::"ProjectGroup_new");
ALTER TYPE "ProjectGroup" RENAME TO "ProjectGroup_old";
ALTER TYPE "ProjectGroup_new" RENAME TO "ProjectGroup";
DROP TYPE "ProjectGroup_old";
ALTER TABLE "User" ALTER COLUMN "projectGroup" SET DEFAULT 'EVENTS_EVENTO';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminScopes" "AdminScope"[] NOT NULL DEFAULT ARRAY[]::"AdminScope"[],
ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "totpSecretPending" TEXT;
