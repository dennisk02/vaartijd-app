# Vaartijd

Registratie van uren op projecten, scheepsbezetting per dag/nacht en maaltijden/afval, met een koppeling naar AFAS Profit voor uren.

> **Neem je onderhoud/verdere ontwikkeling van deze app over?** Lees eerst
> [`HANDOVER.md`](HANDOVER.md) — volledige technische handleiding, architectuur, datamodel,
> integraties (incl. openstaande punten) en deployment-instructies.

## Starten (lokale ontwikkeling)

1. Kopieer `.env.example` naar `.env` en vul in:
   - `DATABASE_URL` / `DATABASE_URL_UNPOOLED` — een eigen Postgres-database (bv. een nieuw Neon-project, los van andere apps).
   - `SESSION_SECRET` — genereer met `openssl rand -base64 32`.
   - De `AFAS_*`-variabelen mogen leeg blijven om te beginnen; de app werkt dan gewoon door, met uren die op "Wacht op sync" blijven staan.
2. Installeer dependencies en zet de database op (past de bestaande, meegecommite migraties toe --
   gebruik `migrate dev` alleen als je zelf een nieuwe schemawijziging aan het maken bent, zie
   [`HANDOVER.md` §12](HANDOVER.md#12-database--migraties)):
   ```bash
   npm install
   npx prisma migrate deploy
   npm run seed
   ```
   De seed maakt een beheerder-account (`admin@kuipersbeheerbv.nl`, wachtwoord zie console-output, of stel `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in voordat je `npm run seed` draait).
3. Start de app:
   ```bash
   npm run dev
   ```
4. Log in als beheerder, maak onder "Beheer" minstens één project, één schip en de eerste medewerker-accounts aan.

## AFAS-koppeling activeren

De uren-registraties staan standaard op status "Wacht op sync". Zodra de AFAS App Connector-gegevens bekend zijn:

1. Vul `AFAS_ENVIRONMENT_ID`, `AFAS_TOKEN` en `AFAS_HOURS_CONNECTOR` in `.env` in.
2. Zorg dat medewerkers een `afasEmployeeNumber` hebben en projecten een `afasProjectCode` (via de beheerpagina's).
3. Pas de payload-mapping aan in [`lib/afas/hoursSync.ts`](lib/afas/hoursSync.ts) (functie `mapTimeEntryToAfas`) zodra de exacte veldnamen van de AFAS UpdateConnector bekend zijn — dat is de enige plek die hiervoor aangepast hoeft te worden.
4. Test de verbinding en start een synchronisatie via `/admin/afas`.

## Projectstructuur, integraties, deployment

Zie [`HANDOVER.md`](HANDOVER.md) — daar staat de volledige, actuele projectstructuur (§4),
uitleg per integratie (AFAS/Rentman/Shiftbase, §10) en de deploy-workflow (§13). Dat bestand
wordt bijgehouden als centrale bron; deze README houdt bewust alleen de lokale-opstart-stappen
hierboven bij om dubbele/verouderde documentatie te voorkomen.
