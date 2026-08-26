-- Voegt businessUnit/category/city toe aan RentmanSubprojectSnapshot (v6.1
-- "BV & Categorie"-sectie, zie HANDOVER.md §10.5). businessUnit/category
-- krijgen een tijdelijke DEFAULT zodat bestaande rijen niet breken op de
-- NOT NULL-constraint -- de eerstvolgende nachtelijke sync overschrijft
-- toch alle rijen met de echte, berekende waarde. Geen DEFAULT in
-- schema.prisma zelf, want nieuwe rijen worden altijd expliciet gevuld door
-- dashboardSync.ts.
ALTER TABLE "RentmanSubprojectSnapshot"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "businessUnit" TEXT NOT NULL DEFAULT 'M&R Kampen',
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Overig';

ALTER TABLE "RentmanSubprojectSnapshot" ALTER COLUMN "businessUnit" DROP DEFAULT;
ALTER TABLE "RentmanSubprojectSnapshot" ALTER COLUMN "category" DROP DEFAULT;
