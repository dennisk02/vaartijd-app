# Integratielaag — Rentman / AFAS / Shiftbase

Deze map bundelt alle code die met de drie externe koppelingen praat:
Rentman (projectimport + financieel dashboard), AFAS (urenexport) en
Shiftbase (vaarbemanning-import + urenexport, laatste nog geblokkeerd).

**Waarom een eigen map:** dit is stap 2 van de ontkoppelingsinschatting
(zie de gepubliceerde "Ontkoppelingsinschatting"-artifact en HANDOVER.md
§10.6/§10.7) — optie A, een echte codegrens binnen dezelfde repo/deploy,
zodat onderhoud aan de koppeling geen reden meer geeft om in de rest van de
app te zitten. Stap 1 (de databaselaag loskoppelen naar eigen koppeltabellen)
is al gedaan; deze map is de voortzetting daarvan.

## De regel

**Als iets hier `@/lib/dal.ts`, `@/lib/session.ts`, `@/lib/assignments.ts` of
rechtstreeks medewerkersgegevens nodig lijkt te hebben, klopt er iets niet
aan de scope van die wijziging.** De enige toegestane weg naar de kernlaag is
`requireAdminScope(...)` uit `@/lib/dal.ts`, aangeroepen door de server
actions in `actions/` — dat is een bewuste, minimale grens, geen ongelukje.

Concreet betekent dat:
- Nooit een `User`/`ShipOccupancy`/`MealCount`/`FoodWaste`/`DaySubmission`-rij
  breder lezen dan strikt nodig (zie `ENTRY_SELECT` in `afas/hoursSync.ts`
  en `shiftbase/hoursSync.ts` als voorbeeld — een gerichte `select`, geen
  `include: { user: true }`).
- Wachtwoorden, 2FA-secrets en dergelijke komen hier nooit in beeld.

## Indeling

```
integrations/
  rentman/
    client.ts              # REST-wrapper (alleen lezend)
    sync.ts                # Project-import
    dashboardSync.ts        # Financieel-dashboard-snapshot (losstaand van sync.ts)
    dashboardAggregate.ts   # Pure aggregatiefuncties voor het dashboard
  afas/
    client.ts               # OAuth2 client-credentials + REST-wrapper
    hoursSync.ts             # TimeEntry -> AFAS PtRealisation
  shiftbase/
    client.ts                # REST-wrapper + verkenner-endpoint
    sync.ts                  # Vaarbemanning-import (schepen/projecten/medewerkers/uren)
    hoursSync.ts              # TimeEntry -> Shiftbase (nog geblokkeerd/ongeverifieerd)
  actions/
    rentman.ts, rentman-dashboard.ts, afas.ts, shiftbase.ts,
    shiftbase-crew.ts, shiftbase-sync.ts   # "use server"-acties, 1 per koppeling/richting
```

De bijbehorende admin-pagina's (`/admin/rentman`, `/admin/rentman-financieel`,
`/admin/afas`, `/admin/shiftbase`) en hun UI-componenten blijven in
`app/admin/*` resp. `components/admin/*` staan — Next.js' routing vereist dat
pagina's onder `app/` staan, en de UI zelf heeft geen kennis van externe
systemen (ze krijgt platte data doorgegeven).

## Niet (meer) in scope van deze stap

Een eigen `package.json`, aparte deploy, eigen databasecredential, of een
API-contract met de rest van Vaartijd — dat is optie B uit de
ontkoppelingsinschatting, en volgt pas ná de twee prioriteitskoppelingen
(Rentman-offerte → AFAS-project, Rentman-factuur → AFAS-verkoopboeking + PDF),
zie HANDOVER.md §10.4/§10.7.
