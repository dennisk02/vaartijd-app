-- Voegt trackingvelden toe voor het "recent bevestigd, nog naar AFAS"-overzicht
-- (§10.4/§17): wanneer een Rentman-project echt van status wisselde, en of een
-- beheerder het heeft geselecteerd als "klaar om door te zetten naar AFAS"
-- (puur een wachtrij/checklist, geen echte AFAS-aanroep -- er is nog geen
-- geautoriseerde UpdateConnector voor projectaanmaak).
ALTER TABLE "ProjectRentmanLink" ADD COLUMN     "afasCreateRequestedAt" TIMESTAMP(3),
ADD COLUMN     "rentmanStatusChangedAt" TIMESTAMP(3);
