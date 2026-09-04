# Vaartijd — Technische handleiding & overdrachtsdocument

**Voor:** de partij die onderhoud en verdere ontwikkeling van deze app overneemt.
**Opdrachtgever:** Kuipers Beheer BV ([info@kuipersbeheerbv.nl](mailto:info@kuipersbeheerbv.nl))
**Laatst bijgewerkt:** 2 september 2026
**Productie-URL:** https://vaartijd-app.vercel.app

Dit document is de centrale referentie voor iedereen die na de initiële bouw aan deze app
verder werkt. Het beschrijft de architectuur, het datamodel, de integraties, hoe je lokaal
ontwikkelt en deployt, en — belangrijk — wat er nog *niet* af is.

---

## 1. Wat is Vaartijd?

Een mobile-first PWA voor een maritiem/evenementenbedrijf (rederij + verhuur-/cateringtak
"Evento") waarmee medewerkers:

- uren registreren op projecten (timer of handmatige start/eind-tijd),
- scheepsbezetting bijhouden (passagiers + bemanning, per dag/nacht),
- maaltijden (aantallen) en voedselverspilling (kg) registreren per schip,
- hun dag "indienen" (vergrendelt die dag's eigen registraties),

en waarmee beheerders (volledig, of scoped tot losse onderdelen — zie §6):

- medewerkers, projecten en schepen beheren,
- per medewerker instellen welke onderdelen zichtbaar zijn en of ze een vast project hebben,
- rapportages bekijken (uren, bezetting, maaltijden, afval — met periodekeuze),
- de koppelingen met AFAS Profit (uren-export), Rentman (projectimport, read-only) en
  Shiftbase (vaarbemanning-import + verkenner, read-only) beheren,
- het financiële Rentman-dashboard bekijken (omzet, facturatie, annuleringen, openstaande
  opties/aanvragen — draait elke nacht automatisch mee met de Rentman-sync). Zie §10.5.

Alle gebruikers loggen in met wachtwoord + verplichte TOTP-2FA (authenticator-app). Zie §6.

De twee bedrijfsonderdelen "Events" (administratie 02) en "Evento" (administratie 21) worden
in de hele app uit elkaar gehouden op basis van een naamconventie: een project dat uit Rentman
komt en waarvan de naam begint met `"EVENTO - "` hoort bij Evento; alle andere projecten horen
bij Events. Zie [§10.2](#102-rentman-read-only-projectimport) en `EVENTO_PREFIX` in
`integrations/rentman/sync.ts`. Dit is een aparte regel van de gebruikers-zichtbaarheidskeuze hieronder.

Daarnaast is er een **aparte groep**: de vaarbemanning van de River Roots-vloot (~270 mensen,
Kitchen/Housekeeping/Management-rollen per schip), die niet in Rentman zit maar in Shiftbase
wordt bijgehouden en sinds 21 aug 2026 automatisch wordt geïmporteerd (§10.3). Sinds 24 aug 2026
is dit ook de gebruikers-zichtbaarheidskeuze zelf: `User.projectGroup` is
`EVENTS_EVENTO` (Rentman-projecten, Events+Evento samen) of `RIVER_ROOTS` (deze vaarbemanning),
zie §6.

---

## 2. Techstack

| Laag | Keuze |
|---|---|
| Framework | **Next.js 16** (App Router, Server Components, Server Actions) — ⚠️ zie [§3](#3-belangrijk-dit-is-niet-de-nextjs-uit-je-trainingsdata) |
| Taal | TypeScript, strict mode |
| UI | React 19, Tailwind CSS v4, handgeschreven componenten (`components/ui.tsx`) — geen component-library |
| Database | PostgreSQL via **Neon** (serverless Postgres) |
| ORM | **Prisma 5.22** |
| Auth | Eigen, stateless sessie-implementatie: JWT (HS256) via **jose**, in een `httpOnly` cookie. Geen NextAuth/Clerk/etc. |
| Wachtwoorden | **bcryptjs** |
| 2FA | **otpauth** (TOTP) + **qrcode** (QR als SVG, geen native canvas-dependency) — zie §6 |
| Grafieken | **Recharts** |
| Hosting | **Vercel** (project `vaartijd-app`, team/scope `dennis-k`) |
| Cron | Vercel Cron (`vercel.json`) — Hobby-plan, dus **max. 1x/dag** per cron |

Geen testframework aanwezig (geen Jest/Vitest/Playwright). Validatie gebeurt nu via
`tsc --noEmit`, `eslint` en handmatige/browser-verificatie — zie [§16](#16-testen--verificatie).

---

## 3. Belangrijk: dit is niet de Next.js uit je trainingsdata

Next.js 16 heeft breaking changes t.o.v. oudere versies die in veel trainingsdata/documentatie
nog niet verwerkt zijn. Concreet in **deze codebase** gestuit op:

- **`middleware.ts` bestaat niet meer** — heet nu **`proxy.ts`** (root van de repo). Zelfde
  functie (route-guard op basis van de sessie-cookie), andere bestandsnaam en export-vorm
  (`export default async function proxy(req) { ... }`).
- Next.js 16 gebruikt **Turbopack** standaard voor `dev` én `build`.

**Advies aan de nieuwe partij:** controleer bij elke Next.js-gerelateerde wijziging eerst
`node_modules/next/dist/docs/` in plaats van te vertrouwen op algemene kennis over Next.js —
vooral bij routing, caching, `use cache`, of andere App Router-mechanismen. Overweeg een
`AGENTS.md`/`CLAUDE.md` toe te voegen aan de repo-root met deze waarschuwing, zodat ook
toekomstige AI-coding-assistenten die hier niet automatisch tegenaan lopen.

---

## 4. Projectstructuur

```
app/                          # App Router — pagina's + API routes
  admin/                      # Beheerscherm (guard per pagina: requireAdminScope(), zie §6)
    afas/ projects/ rapportages/ rentman/ rentman-financieel/ ships/ shiftbase/ users/
  2fa-instellen/  2fa-verify/  # Verplichte TOTP-instel- resp. inlog-verificatiepagina, zie §6
  api/
    afas/sync/route.ts            # Externe trigger (cron/secret) voor AFAS-export
    rentman/sync/route.ts         # Externe trigger (cron/secret) voor Rentman-import
                                   # + het financiële dashboard (piggyback, zie §10.5/§14)
    shiftbase/crew-import/route.ts # Externe trigger voor Shiftbase-vaarbemanning-import (lezend, werkend)
    shiftbase/sync/route.ts       # Externe trigger voor Shiftbase-urenexport (schrijvend, nog geblokkeerd)
  uren/ scheepsbezetting/ maaltijden/ afval/ geschiedenis/ dag-indienen/  # Medewerkerschermen
  login/  page.tsx (home-dashboard)  layout.tsx (root)
  forbidden.tsx  unauthorized.tsx

components/
  ui.tsx                      # Card, Field, Input, Select, TextArea, Button, CheckboxGroup, ...
  nav.tsx                     # NavBar (taal, uitloggen, navigatie)
  project-picker.tsx          # Doorzoekbare projectkeuze (naam + Rentman-nummer)
  searchable-checkbox-group.tsx
  totp-setup-form.tsx         # Client-formulier voor de 2FA-instelpagina
  timer-widget.tsx  hours-entry.tsx  time-entry-form.tsx
  ship-occupancy-form.tsx  meal-count-form.tsx  food-waste-form.tsx
  admin/                      # Beheer-specifieke componenten (project-list, reports/*,
                               # rentman-dashboard/* — de 5 tabs van het financiële dashboard +
                               # colors.ts/kpi-card.tsx als gedeelde bouwstenen)

lib/
  session.ts  dal.ts          # Sessiebeheer (jose/JWT, incl. 2FA-tussenstap-cookie) + Data
                               # Access Layer (requireAdmin, requireAdminScope, getUser) -- §6
  totp.ts                     # TOTP-2FA-kernlogica (otpauth + qrcode), zie §6
  prisma.ts                   # Prisma-client singleton
  assignments.ts              # Welke projecten/schepen mag een medewerker kiezen (projectGroup)
  daily-summary.ts            # Dagoverzicht (home, geschiedenis, dag-indienen) — batched i.p.v. N+1
  day-submission.ts           # isDateSubmitted() — of een dag al "ingediend" is
  reports.ts                  # Periode-utility voor rapportages
  timer.ts  dates.ts  definitions.ts  i18n.ts
  actions/                    # "use server" — kernmutaties (auth.ts + twofactor.ts: login/
                               # 2FA-verificatie/-instellen, admin.ts, time-entries.ts, timer.ts,
                               # ship-occupancy.ts, meal-counts.ts, food-waste.ts, ...)

integrations/                 # Rentman/AFAS/Shiftbase, losgemaakt van de kernlaag (§10.6/§10.7 —
                               # "optie A" uit de ontkoppelingsinschatting). Zie integrations/README.md
                               # voor de grensregel; enige toegestane import terug naar de kernlaag
                               # is requireAdminScope() uit lib/dal.ts.
  rentman/                    # client.ts + sync.ts (projectimport) + dashboardSync.ts +
                               # dashboardAggregate.ts (financieel dashboard, zie §10.5)
  afas/                       # AFAS Profit REST-koppeling (client + hoursSync)
  shiftbase/                  # client.ts (verkenner) + sync.ts (vaarbemanning-import, lezend,
                               # werkend) + hoursSync.ts (urenexport, schrijvend, nog geblokkeerd)
  actions/                    # "use server" voor deze drie koppelingen: rentman.ts,
                               # rentman-dashboard.ts, afas.ts, shiftbase.ts, shiftbase-crew.ts,
                               # shiftbase-sync.ts

prisma/
  schema.prisma                # Datamodel — zie §5
  migrations/                  # Elke migratie in een eigen map met migration.sql
  seed.ts                      # Maakt 1 beheerder-account
  seed-demo.ts                 # Vult demo-medewerkers/projecten/schepen + een jaar demodata

public/
  manifest.json  icon-*.png  apple-touch-icon.png  icon-source.svg  sw.js
```

---

## 5. Datamodel

Volledige bron: [`prisma/schema.prisma`](prisma/schema.prisma). Kernpunten per model:

- **`User`** — rol (`EMPLOYEE`/`ADMIN`), taal, per-onderdeel zichtbaarheid
  (`canLogOccupancy/Meals/Waste`), optioneel een vast project (`useDefaultProject` +
  `defaultProjectId`), `projectGroup` (`EVENTS_EVENTO`/`RIVER_ROOTS`, bepaalt welke projecten
  én schepen iemand standaard ziet — zie §6), `adminScopes` (`AdminScope[]`, welke
  admin-onderdelen deze gebruiker mag beheren zonder volledig beheerder te zijn, zie §6),
  TOTP-2FA-velden (`totpEnabled`/`totpSecret`/`totpSecretPending`, zie §6), koppelvelden voor
  AFAS (`afasEmployeeNumber`) en Shiftbase (`shiftbaseEmployeeId`).
- **`Project`** — kan handmatig aangemaakt zijn, uit Rentman komen
  (`rentmanSubprojectId` e.a. `rentman*`-velden gevuld), of automatisch aangemaakt zijn als
  "vaarbemanning"-project bij een Shiftbase-schip (`shiftbaseDepartmentId`, uniek — zie §10.3).
  `active` bepaalt of een project kiesbaar is bij urenregistratie.
- **`Ship`** — optioneel een `capacity` (Int?) voor de capaciteitsbalk bij bezetting. Kan ook
  uit Shiftbase komen (`shiftbaseDepartmentId` + `shiftbaseDepartmentName`, uniek — §10.3).
- **`TimeEntry`** — één urenregistratie. `mode` is `TIMER`, `MANUAL` of `SHIFTBASE_IMPORT`
  (geïmporteerd vanuit Shiftbase, herkenbaar aan een gevuld `shiftbaseTimesheetId`, uniek, dat
  dubbele import bij herhaald syncen voorkomt). Aparte syncstatus-velden voor **zowel** AFAS
  als Shiftbase (`afasSyncStatus`/`shiftbaseSyncStatus`, elk met `SyncedAt`/`Error`), zodat de
  twee koppelingen onafhankelijk van elkaar hun status bijhouden.
- **`ActiveTimer`** — server-side "lopende dienst"; 1 per gebruiker (`userId @unique`). Bij
  stoppen wordt hieruit een `TimeEntry` gemaakt en de rij verwijderd.
- **`ShipOccupancy`** — passagiers + bemanning per schip/datum/dagdeel. Uniek per
  `(shipId, date, dayPart)` — dat is de "1x per schip per dag(deel)"-regel.
- **`MealCount`** / **`FoodWaste`** — bewust **gesplitst** (verschillende eenheden: aantallen
  vs. kg — zie de dataviz-conventie "nooit twee eenheden op één as"). Beide uniek per
  `(shipId, date, mealType)`.
- **`DaySubmission`** — of een medewerker een dag heeft "ingediend"; zodra dat zo is,
  blokkeren alle create-acties voor die medewerker/datum (`isDateSubmitted()` in
  `lib/day-submission.ts`, aangeroepen aan het begin van elke create-server-action).
- **`SyncState`** — generieke key/value-tabel; nu gebruikt voor het laatste Rentman
  `modified`-watermark (incrementele sync).
- **`RentmanSubprojectSnapshot`** — de ruwe brontabel voor het financiële Rentman-dashboard
  (§10.5): één rij per Rentman-subproject, jaargescoped, elke run **volledig herberekend**
  (upsert + opschoning van rijen buiten de huidige jaarscope — geen incrementele sync). Naast de
  financiële velden ook `city`/`businessUnit`/`category` (voor de "Locatie"-kolommen resp. de
  "BV & Categorie"-sectie, zie §10.5). Alle KPI's/grafieken/tabellen van de 5 tabbladen worden hier
  bij paginaopbouw uit afgeleid (`integrations/rentman/dashboardAggregate.ts`) i.p.v. los
  vooraf-geaggregeerd te worden.
- **`RentmanInvoicedMonthly`** — apart van `RentmanSubprojectSnapshot` omdat dit op
  **factuurdatum** groepeert i.p.v. aanmaakdatum (voor de Maandoverleg-sectie op het
  Overzicht-tabblad/AFAS-aansluiting).
- **`RentmanInvoiceExport`** — één rij per Rentman-verkoopfactuur (§10.8, `/admin/rentman-afas`),
  incl. gekoppelde PDF (`pdfFileId`) en checklist-/AFAS-sync-status. Losstaand van
  `RentmanInvoicedMonthly` hierboven (dat blijft een maandaggregaat).

> **Let op:** de bovenstaande beschrijving van `User`/`Project`/`Ship`/`TimeEntry` dateert van
> vóór §10.6 (27 aug 2026) — de genoemde koppelvelden (`afasEmployeeNumber`,
> `rentmanSubprojectId`, `afasSyncStatus`, `shiftbaseTimesheetId`, ...) staan inmiddels niet meer
> op deze kernmodellen zelf, maar in de 8 losse 1-op-1-koppeltabellen uit §10.6
> (`ProjectRentmanLink`, `TimeEntryAfasLink`, enz.). Deze sectie is destijds niet meegewerkt —
> zie `prisma/schema.prisma` voor de actuele, juiste vorm.

**Indexen:** naast de voor de hand liggende unieke constraints staan er `@@index`'en op
`TimeEntry(userId, date)`, `TimeEntry(afasSyncStatus)`, `TimeEntry(shiftbaseSyncStatus)` en op
`ShipOccupancy/MealCount/FoodWaste(createdById, date)` — dat laatste stel is toegevoegd omdat
elke dashboard-/geschiedenispagina daar exact op filtert. Verder zijn `Ship.shiftbaseDepartmentId`,
`Project.shiftbaseDepartmentId`, `User.shiftbaseEmployeeId` en `TimeEntry.shiftbaseTimesheetId`
allemaal uniek — dat zijn de sleutels waarop de Shiftbase-vaarbemanning-import upsert (zie
§10.3), net zoals `Project.rentmanSubprojectId` dat voor Rentman doet.

---

## 6. Authenticatie & autorisatie

Geen externe auth-provider — bewust eenvoudig gehouden, uitgebreid op 24 aug 2026 met
scoped admin-rechten en verplichte TOTP-2FA.

1. **`lib/session.ts`** — JWT (HS256, ondertekend met `SESSION_SECRET`) met
   `{ userId, role, totpEnabled }`, in een `httpOnly`, `sameSite=lax` cookie, 7 dagen geldig.
   `totpEnabled` zit in de sessie zelf (niet alleen in de database) zodat `proxy.ts` 2FA kan
   afdwingen zonder een databasecall per request. Daarnaast een **tweede, kortlevende cookie**
   (`2fa_pending`, ~5 minuten, payload `{ userId }` zonder `role`) voor de tussenstap
   "wachtwoord goed, TOTP-code nog nodig" (`createPendingTotpSession` e.a. in `lib/session.ts`).
2. **`proxy.ts`** — redirect naar `/login` als er geen geldige sessie is (`/login` en
   `/2fa-verify` zijn de enige publieke routes); redirect ingelogde gebruikers weg van `/login`;
   **nieuw**: redirect elke sessie met `totpEnabled=false` naar `/2fa-instellen` (behalve die
   pagina zelf) — 2FA is verplicht voor alle accounts, geen uitzondering per persoon.
3. **`lib/dal.ts`** (Data Access Layer) — `getUser()` (React `cache()`-gewrapt) haalt de actuele
   gebruiker op. Autorisatiehelpers:
   - `requireAdmin()` — **volledige** beheerder (`role === "ADMIN"`), ongewijzigd, gebruikt voor
     de paar acties die bewust niet delegeerbaar zijn (nieuwe accounts aanmaken, rollen/
     admin-scopes van anderen wijzigen, 2FA van iemand resetten).
   - `requireAdminScope(scope: AdminScope)` — **nieuw**: toegang tot één specifiek admin-
     onderdeel. Volledige beheerders omzeilen dit altijd; overige gebruikers moeten `scope`
     expliciet toegewezen hebben via `User.adminScopes`. Gebruikt door elke `/admin/<sectie>`-
     pagina zelf (niet meer alleen de gedeelde layout) en de bijbehorende server actions.
   - `requireAnyAdminScope()` — toegang tot de admin-shell (`app/admin/layout.tsx`): minstens
     één onderdeel toegewezen (of volledig beheerder).
   - `userHasAdminScope(userId, scope)` — niet-gooiende variant voor de externe
     cron/secret-trigger-routes (`app/api/*/sync`, `.../crew-import`), die hun secret als
     primaire auth gebruiken en een ingelogde-sessie-check alleen als terugval.

   **Belangrijk gat gevonden en gefixt tijdens het bouwen van deze feature:** `forbidden()`
   (gebruikt door alle bovenstaande helpers) vereist `experimental.authInterrupts: true` in
   `next.config.ts` — stond nooit aan, maar dat viel nooit op omdat tot nu toe alleen echte
   volledige beheerders deze guards raakten (dus `forbidden()` werd in de praktijk nooit
   aangeroepen). Met scoped admin-rechten wordt dat pad nu wél echt bereikt door
   niet-geautoriseerde gebruikers, en gaf zonder de config-vlag een kale 500 i.p.v. de
   403-pagina. Nu aangezet, zie `next.config.ts`.

### Scoped admin-rechten (`User.adminScopes`, `AdminScope`-enum)

Een medewerker kan, zonder volledig beheerder (`role: ADMIN`) te zijn, toegang krijgen tot één
of meer van de 8 admin-onderdelen (`PROJECTS`/`SHIPS`/`USERS`/`RENTMAN`/`RENTMAN_FINANCIEEL`/
`SHIFTBASE`/`AFAS`/`RAPPORTAGES`) — bv. om alleen Rapportages te mogen inzien, of alleen
Projecten te beheren. Ingesteld via `app/admin/users/[id]/page.tsx` (sectie "Scoped
beheerder-onderdelen", alleen zichtbaar/wijzigbaar voor volledige beheerders zelf — een scoped
Medewerkers-beheerder ziet dit blok niet, en de server-actie (`updateUserAssignments` in
`lib/actions/admin.ts`) valideert dat onafhankelijk nogmaals i.p.v. alleen op de UI te
vertrouwen, om zelf-escalatie te voorkomen). `app/admin/layout.tsx` filtert de tabbladen op wat
de ingelogde gebruiker mag zien; elke individuele `/admin/<sectie>`-pagina heeft daarnaast zijn
eigen `requireAdminScope(...)`-guard (nodig omdat de gedeelde layout nu ook niet-volledige
beheerders doorlaat, gefilterd op tabs — directe URL-navigatie naar een niet-toegewezen sectie
moet alsnog een 403 geven).

**Bewuste grens (afgesproken met de klant):** een scoped Medewerkers-beheerder (`USERS`-scope,
niet volledig beheerder) kan bestaande medewerkers bewerken (toewijzingen, projectgroep,
onderdelen aan/uit), maar **niet** nieuwe accounts aanmaken en **niet** iemands admin-scopes of
rol wijzigen — dat blijft aan volledige beheerders voorbehouden.

**Kijktoegang zonder wijzigingsrechten (`User.adminViewOnly`, 27 aug 2026):** los van *welke*
onderdelen iemand ziet (`adminScopes`), regelt dit vlagje *of* diegene daarbinnen iets mag
wijzigen. `requireAdminScope(scope)` (paginaguards, en de handvol puur-lezende acties zoals de
Shiftbase-verkenner/AFAS-verbindingstest) checkt alleen `adminScopes`, ongeacht `adminViewOnly` —
zo blijft kijken altijd mogelijk. Elke *muterende* server-actie (aanmaken/bewerken/
(de)activeren/synchroniseren) gebruikt in plaats daarvan `requireAdminScopeWrite(scope)`
(resp. `userHasAdminScopeWrite()` voor de externe cron/secret-routes), die daarbovenop weigert
als `adminViewOnly` aan staat. Ingesteld via dezelfde "Scoped beheerder-onderdelen"-sectie als
`adminScopes` (alleen volledige beheerders, zelfde zelf-escalatie-bescherming). Voorbeeld:
Renko van Bodegraven heeft alle 8 scopes (ziet dus alles) + `adminViewOnly: true` (kan nergens
iets wijzigen of een sync starten) — Niels/Henry hebben alleen `RENTMAN_FINANCIEEL`, zonder
`adminViewOnly`, en mogen dus wel op dat ene scherm herberekenen/de AFAS-checklist aanvinken.

**Rechtstreeks naar het dashboard na login:** `app/page.tsx` (het medewerker-thuisscherm)
stuurt een gebruiker met **uitsluitend** `adminScopes: ["RENTMAN_FINANCIEEL"]` (en geen volledig
beheerder) meteen door naar `/admin/rentman-financieel` — dat thuisscherm heeft toch niets te
bieden voor iemand die alleen het financiële dashboard mag zien. Geldt zowel vlak na
inloggen/2FA (die landen sowieso eerst op "/") als bij elke latere navigatie naar "/". Renko valt
hier **niet** onder (heeft alle 8 scopes, niet uitsluitend deze ene), dus die ziet het normale
beheerscherm met alle tabbladen (allemaal kijkalleen).

### TOTP-2FA (verplicht voor alle accounts)

Authenticator-app-gebaseerd (Google/Microsoft Authenticator e.d.), 6 cijfers, 30 seconden,
SHA1 — de universeel ondersteunde combinatie. Nieuwe dependencies: `otpauth` (TOTP-kernlogica,
zero-dep) en `qrcode` (QR-rendering, **als SVG-string** i.p.v. PNG/canvas om elke native
dependency te vermijden — relevant gezien de Windows/Prisma-DLL-valkuil elders in dit project).
Module: `lib/totp.ts`.

- **`User.totpEnabled`/`totpSecret`/`totpSecretPending`** — drie velden i.p.v. twee, zodat de
  status nooit dubbelzinnig is: geen van beide secret-velden = nooit gestart; alleen
  `totpSecretPending` = QR getoond maar nog niet bevestigd; `totpSecret` + `totpEnabled` =
  volledig ingesteld.
- **Inlogflow** (`lib/actions/auth.ts`): na een geslaagde wachtwoordcheck —
  - `totpEnabled=true` → een tussenstap-cookie (`createPendingTotpSession`, geen volledige
    sessie) + redirect naar `/2fa-verify`, waar `verifyTotpLogin` de code checkt en pas dan de
    echte sessie aanmaakt.
  - `totpEnabled=false` → wél meteen een volledige sessie (er is nog niets om tegen te
    verifiëren), maar `proxy.ts` dwingt vervolgens `/2fa-instellen` af totdat de
    instelprocedure is afgerond.
- **`app/2fa-instellen/page.tsx`** — verplichte instelpagina: genereert bij eerste bezoek een
  onbevestigd secret (`totpSecretPending`) en toont de QR + een tekst-fallback voor handmatige
  invoer; `confirmTotpSetup` (`lib/actions/twofactor.ts`) zet het secret bij een geldige code
  definitief vast.
- **2FA resetten** — knop op `app/admin/users/[id]/page.tsx`, actie `resetUserTotp` in
  `lib/actions/admin.ts`, **bewust `requireAdmin()` (vol, niet scoped)** omdat het in feite een
  beveiligingsreset is. Voor als iemand zijn telefoon kwijtraakt — zet `totpEnabled=false` en
  wist beide secret-velden, waarna de medewerker bij de volgende login 2FA opnieuw moet
  instellen. Geen self-service "2FA uitzetten" — dat zou de verplichting ondermijnen.
- **Niet gebouwd (bewust, buiten scope):** rate-limiting op foutieve codes, en een
  "back-up codes"-mechanisme voor het geval iemand zowel zijn telefoon als een beheerder
  kwijt is (niet van toepassing hier, een beheerder kan altijd resetten).

Wachtwoorden: bcryptjs, 10 rounds. Nog steeds geen "wachtwoord vergeten"-flow voor medewerkers
zelf — een beheerder kan wel een tijdelijk wachtwoord instellen bij het aanmaken van een account
(`components/admin/user-form.tsx`). Zie [§17](#17-bekende-openstaande-punten).

---

## 7. Functionaliteit per rol

### Medewerker
| Pagina | Doel |
|---|---|
| `/` | Dashboard: dagoverzicht, checklist per onderdeel, timer-chip, "dag indienen"-banner |
| `/uren` | Timer óf handmatige invoer (project + schip + start/eind/pauze); doorzoekbare projectkeuze |
| `/scheepsbezetting` | Passagiers/bemanning per schip, dag/nacht, capaciteitsbalk |
| `/maaltijden` | Aantal geserveerde maaltijden per type |
| `/afval` | Kg voedselverspilling per maaltijdtype |
| `/geschiedenis` | Week/maand-overzicht van eigen registraties, ingediend-status |
| `/dag-indienen` | Bevestig en vergrendel de dag |

Zichtbaarheid van bezetting/maaltijden/afval is per medewerker uit te zetten door een
beheerder (`User.canLogOccupancy/Meals/Waste`). Een gewone medewerker kan daarnaast, via
`adminScopes`, toegang tot één of meer admin-onderdelen krijgen zonder beheerder te zijn — zie
[§6](#6-authenticatie--autorisatie).

### Beheerder — volledig of scoped (`/admin/*`, guard per pagina: `requireAdminScope`)
Elk van deze 8 onderdelen is los toe te wijzen (`AdminScope`-enum, zie §6). Volledige
beheerders (`role: ADMIN`) zien en mogen ze allemaal; wie geen volledige beheerder is, ziet
alleen de tabbladen waarvoor `adminScopes` iets bevat.

| Pagina | Onderdeel (`AdminScope`) | Doel |
|---|---|---|
| `/admin/rapportages` | `RAPPORTAGES` | 4 grafieken (uren, bezetting, maaltijden, afval) met periodekeuze |
| `/admin/projects` | `PROJECTS` | Overzicht + (de)activeren + AFAS-projectcode instellen, doorzoekbare lijst — **geen aanmaakformulier meer** (27 aug 2026): projecten komen altijd via Rentman of Shiftbase binnen |
| `/admin/ships` | `SHIPS` | Overzicht + (de)activeren — **geen aanmaakformulier meer** (27 aug 2026): schepen komen altijd via Shiftbase binnen, en komen sinds die datum al direct actief binnen |
| `/admin/users` → `/admin/users/[id]` | `USERS` | Medewerkers aanmaken (**volledige beheerders only**); per medewerker: projectgroep, specifieke project-/scheepstoewijzing (doorzoekbaar), zichtbare onderdelen, vast project, Shiftbase-ID, admin-scopes (**volledige beheerders only**), 2FA resetten (**volledige beheerders only**) |
| `/admin/rentman` | `RENTMAN` | Rentman-syncstatus, handmatige sync-trigger, **tabelweergave** (27 aug 2026, was een kaartenlijst) van alle gesyncte projecten met zoekveld + statusfilter |
| `/admin/rentman-financieel` | `RENTMAN_FINANCIEEL` | Financieel dashboard, zie §10.5 |
| `/admin/afas` | `AFAS` | AFAS-syncstatus (pending/synced/error-tellingen + foutmeldingen) |
| `/admin/shiftbase` | `SHIFTBASE` | Vaarbemanning-import (River Roots, werkend) + read-only API-verkenner + (ongeverifieerde, geblokkeerde) urenexport-status |

---

## 8. Vertalingen (i18n)

`lib/i18n.ts` — een handgeschreven systeem (geen `next-intl`/`react-i18next`):

- `AppLanguage = "NL" | "EN" | "UK" | "AR"`, opgeslagen per gebruiker (`User.language`).
- Eén `Dictionary`-interface (~90 velden) met vier complete implementaties (`nl`, `en`, `uk`,
  `ar`). **Belangrijk:** de interface expliciet typeren (niet `typeof nl`) voorkomt dat TS de
  Engelse/Oekraïense/Arabische strings dwingt tot de Nederlandse literal-types — die valkuil
  is al eerder geraakt, zie de git-historie.
- `getDictionary(lang)`, `dirFor(lang)` (RTL voor Arabisch), `htmlLangFor(lang)`,
  `localeFor(lang)` (voor `Intl`-opmaak), `tFormat(str, vars)` voor `{placeholder}`-vervanging.
- **Beheerpagina's (`/admin/*`) zijn bewust alleen Nederlands** — dat is nooit vertaald, was
  een expliciete keuze tijdens de bouw ("apart, mechanisch vervolgklusje indien gewenst").
- Taal wisselen: knoppen in `components/nav.tsx`, actie in `lib/actions/language.ts`.

---

## 9. PWA

- `public/manifest.json`, iconen gegenereerd uit `public/icon-source.svg` via **sharp**
  (eenmalig gebruikt om `icon-192.png`/`icon-512.png`/`apple-touch-icon.png` te renderen —
  niet een runtime-dependency van de app zelf, maar wél aanwezig omdat Next.js 'm optioneel
  gebruikt voor `next/image`-optimalisatie als dat ooit wordt ingezet).
- Huisstijlkleur: rood (`#b91c1c`) — zie `app/layout.tsx` (`themeColor`) en
  `manifest.json`/`icon-source.svg`. **Groene badges zijn bewust behouden** als
  status-indicator (bv. "Gesynchroniseerd", "Actief") — dat is losstaand van de huisstijlkleur,
  dus niet per ongeluk terugveranderen bij een volgende kleurwijziging.

---

## 10. Integraties

### 10.1 AFAS Profit (uren-export) — **connector bevestigd, velden nog niet live geverifieerd**

- Module: `integrations/afas/client.ts` (REST-wrapper, **OAuth2 client-credentials**, zie onder) +
  `integrations/afas/hoursSync.ts` (mapt een `TimeEntry` naar de AFAS `PtRealisation`-UpdateConnector-
  payload).
- **OAuth2 i.p.v. statische token (24 aug 2026, ingericht door Royaal/Willem van Melis):** het
  eerdere statische-`AfasToken`-mechanisme (`AFAS_TOKEN`) is vervangen door een echte OAuth2
  client-credentials-flow, de door AFAS aanbevolen aanpak voor systeem-naar-systeem-koppelingen.
  `getAccessToken()` wisselt `AFAS_OAUTH_CLIENT_ID`/`AFAS_OAUTH_CLIENT_SECRET` in bij
  `https://<omgevingsnummer>.rest.afas.online/profitrestservices/oauth/token` (standaard OAuth2
  `grant_type=client_credentials`, form-urlencoded) voor een ~1 uur geldig access-token,
  in-memory gecached per serverinstance. Live geverifieerd (24 aug 2026): dit request-formaat
  wordt door AFAS geaccepteerd (een echte, betekenisvolle foutrespons kwam terug, geen
  transport-/formaatfout — zie hieronder).
  - **Omgevingscode vs. omgevingsnummer:** `AFAS_ENVIRONMENT_ID` bevat de volledige
    AFAS-omgevingscode zoals in de inlog-URL (bv. `T36369AA` — voorvoegsel
    `O`=Productie/`T`=Test/`A`=Acceptatie, gevolgd door het eigenlijke omgevingsnummer, gevolgd
    door een suffix). De REST-hostname gebruikt **alleen de cijfers** uit die code, niet de
    volledige code met voorvoegsel/suffix. `getAfasConfig()` haalt dit zelf uit elkaar
    (`environmentNumber = environmentCode.replace(/\D/g, "")`).
  - **Hostname-segment verschilt per omgevingstype (live ontdekte valkuil, opgelost 27 aug
    2026):** het voorvoegsel bepaalt niet alleen het omgevingstype voor logging, maar ook **welk
    hostname-segment** gebruikt moet worden — `O` (Productie) → `rest.afas.online`, `T` (Test) →
    **`resttest.afas.online`**. Dit was aanvankelijk altijd hardcoded op `rest.afas.online`,
    ongeacht omgevingstype — voor deze Test-omgeving (`T36369AA`) leidde dat tot aankloppen bij de
    verkeerde (Productie-)hostnaam. Ontdekt door een cURL-voorbeeld te vergelijken op AFAS' eigen
    testtool (`connect.afas.nl/tools/restget`, door de klant zelf ingevuld en gedeeld als
    screenshot), dat expliciet `resttest.afas.online` toonde. `restHostFor()` in
    `integrations/afas/client.ts` regelt dit nu (alleen `O`/`T` bevestigd; andere voorvoegsels vallen terug
    op `rest` met een waarschuwing, niet gefabriceerd). **Dit was de daadwerkelijke oorzaak** van
    de hieronder beschreven `unauthorized_client`-fout, niet een AFAS-zijdig connector-probleem
    zoals aanvankelijk gedacht.
  - **Verkeerde connectornaam, opgelost (27 aug 2026):** met de juiste hostname slaagt de
    OAuth-token-aanvraag, maar `metainfo/update/PtRealisation` gaf een schijnbaar AFAS-zijdige
    autorisatiefout (`HTTP 500`, `"Deze connector wordt niet ondersteund of de gebruiker is niet
    geautoriseerd."`). Het eigen, alleen-lezende `metainfo`-endpoint van AFAS (zonder
    connectornaam erbij) laat precies zien welke connectors "Skrepr" mag gebruiken — en dat is
    **`PtRealization`** (Amerikaanse spelling), niet `PtRealisation` (Brits, wat Royaal's
    e-mail en dus ook onze env-variabele gebruikte). Dat verklaarde de fout volledig; geen
    AFAS-zijdig autorisatieprobleem. `AFAS_HOURS_CONNECTOR` staat nu op `PtRealization`.
  - **Veldnamen nu rechtstreeks bevestigd via AFAS zelf, niet meer via een aangeleverd
    voorbeeld:** `metainfo/update/PtRealization` (hetzelfde endpoint als hierboven, dit keer mét
    connectornaam) geeft de **volledige, geautoriseerde velden-definitie** van deze connector
    terug — inclusief welke velden verplicht zijn. Dat bracht twee echte fouten in de eerdere
    `mapTimeEntryToAfas()` aan het licht: het aantal-uren-veld heet **`Qu`**, niet `QuD1` (dat
    veld bestaat niet eens in deze connector); en **`VaIt`** ("Type item") is verplicht en
    ontbrak volledig (`"1"` = Werksoort, de juiste waarde voor gewerkte uren). `PrId` (Project)
    en `StId` (Urensoort) bleken wél te kloppen met de eerdere aanname. Als bonus zijn ook
    `StTi`/`EnTi` (begin-/eindtijd) nu meegenomen, want de connector ondersteunt ze en
    `TimeEntry` heeft de data al. **Nog steeds niet bevestigd:** de exacte *waarden* voor `ItCd`
    (itemcode) en `StId` (urensoort) voor déze administratie — de veldnamen zijn nu zeker, de
    codes zelf (fallback `"300"`/`"1"`) nog niet.
- Env vars: `AFAS_ENVIRONMENT_ID`, `AFAS_OAUTH_CLIENT_ID`, `AFAS_OAUTH_CLIENT_SECRET`,
  `AFAS_HOURS_CONNECTOR` (`PtRealization`), optioneel `AFAS_HOURS_ITEM_CODE`/
  `AFAS_HOURS_STATUS_ID`, `AFAS_SYNC_SECRET`. Zolang Client ID/Secret ontbreken degradeert de
  app gracieus: uren blijven op `afasSyncStatus = PENDING` staan, er gebeurt verder niets.
- Trigger: `/admin/afas` (handmatig) of `POST/GET /api/afas/sync` (extern, met
  `Authorization: Bearer <AFAS_SYNC_SECRET>`).

### 10.2 Rentman (read-only projectimport) — **werkend**

- Module: `integrations/rentman/client.ts` (`fetchAllSubprojects`, paginering) +
  `integrations/rentman/sync.ts` (`syncRentmanProjects`, mapt Rentman-subprojecten naar `Project`-rijen).
- **Alleen-lezen richting Vaartijd** — Rentman krijgt nooit uren terug via deze route (dat was
  de oorspronkelijke afspraak; zie wél [§10.4](#104-rentman-mcp-server--verkend-niet-afgebouwd) voor een nieuwere,
  nog niet afgeronde uitbreiding).
- **Statusfilter:** alleen subprojecten met status `Bevestigd`, `Klaargezet`, `Op locatie`,
  `Schoonmaken & nakijken` of `Retour ophalen` worden `active: true`; alle overige (Concept,
  Optie, Aanvraag, Geannuleerd, Retour, ...) blijven `active: false` maar staan wél in de
  database (zichtbaar voor beheerders, niet kiesbaar voor medewerkers).
- **Administratie-routing (02 Events / 21 Evento):** puur op naam — begint de projectnaam met
  `"EVENTO - "`, dan Evento, anders Events. Zie `EVENTO_PREFIX` in `integrations/rentman/sync.ts`. Sinds
  24 aug 2026 is dit **losgekoppeld** van de gebruikers-zichtbaarheidskeuze
  (`User.projectGroup`, nu `EVENTS_EVENTO`/`RIVER_ROOTS`, gebaseerd op Shiftbase-herkomst i.p.v.
  naam) — deze Events/Evento-routing blijft puur een interne AFAS-administratieregel.
- **Twee live-getroffen bugs (opgelost, zie git-historie voor context):**
  1. Paginering brak omdat `next_page_url` in de praktijk soms volledig ontbreekt i.p.v.
     `null` — nu gebaseerd op `data.length < limit`.
  2. `project.number` komt van Rentman terug als `number`, niet als `string`, wat een stille
     Prisma-fout gaf — nu expliciet `String()`-gecoerced.
  3. De incrementele filter (`sinceModified`) gebruikte een JSON-gecodeerde `filter=`-param,
     die Rentman afwijst (`400 Unknown property 'filter'`) — moet een **top-level**
     `modified[gte]=...`-queryparameter zijn, niet in `filter` verpakt.
- Env vars: `RENTMAN_API_TOKEN`, `RENTMAN_SYNC_SECRET`, `CRON_SECRET` (Vercel Cron stuurt
  automatisch `Authorization: Bearer <CRON_SECRET>` mee zodra die variabele bestaat — moet dus
  gelijk gezet worden aan `RENTMAN_SYNC_SECRET`, zie `app/api/rentman/sync/route.ts`).
- **Cron:** `vercel.json` → `0 3 * * *` (03:00 UTC, dagelijks). Getest en bevestigd werkend in
  productie.
- **Eenmalige opschoning (19 aug 2026):** op verzoek van de klant is de database eenmalig
  opgeschoond tot alleen 2026-projecten met een toegestane status. Dit is **geen permanente
  restrictie** — de synclogica zelf filtert niet op jaartal, dus toekomstige syncs halen weer
  alle jaren op. Bij een volgende volledige sync komen er dus weer ~1300 rijen bij (waarvan
  ~130 `active`). Dat is verwacht gedrag, geen bug.

### 10.3 Shiftbase — **vaarbemanning-import werkend, urenexport bewust geblokkeerd**

- Modules: `integrations/shiftbase/client.ts` (generieke REST-wrapper + verkenner-endpoint),
  `integrations/shiftbase/sync.ts` (nieuw, de vaarbemanning-import), `integrations/shiftbase/hoursSync.ts` (oud,
  urenexport-scaffold, nog geblokkeerd).
- **Authenticatie (19 aug 2026, opgelost):** Shiftbase verwacht `Authorization: API <sleutel>`
  (letterlijk het woord `API` als prefix, bevestigd via developer.shiftbase.com) -- de client
  stuurde eerder een `Api-Key`-header, wat altijd een 401 gaf. Nu gefixt en geverifieerd (echte
  data opgehaald via de verkenner).

**Belangrijke context:** dit Shiftbase-account bevat **twee compleet gescheiden groepen** die
niets met elkaar te maken hebben:
- ~270 horeca-achtige medewerkers (Kitchen/Housekeeping/Management/Bediening/...) verdeeld over
  18 "departments" genaamd "Moods & Roots I" t/m "XIII" (plus een paar niet-schepen: "Kantoor",
  "Quality", "Locatie Utrecht", "Moods&Roots | Events") -- dit is **de vaarbemanning van de
  River Roots-vloot** (bevestigd door de klant). Sinds de volledige reset van 27 aug 2026 (zie
  §12) zijn dit ook meteen **alle** `Ship`-records in Vaartijd -- er zijn geen handmatig
  aangemaakte schepen meer naast deze Shiftbase-departments.
- Verder niets -- er is geen "project"-concept in Shiftbase; uren zijn gekoppeld aan een
  gebruiker + een department/team, niet aan een project zoals AFAS/Rentman dat kennen.

#### Vaarbemanning-import (`/admin/shiftbase`, sectie "Vaarbemanning importeren")

Leest (alleen lezend) Shiftbase-departments, -gebruikers en goedgekeurde uren van de laatste 35
dagen in, en legt ze vast in Vaartijd:

- Elke Shiftbase-**department** → een `Ship` (`ShipShiftbaseLink.shiftbaseDepartmentId`, uniek)
  **plus** een bijbehorend `Project` genaamd `"Vaarbemanning <departmentnaam>"`
  (`ProjectShiftbaseLink.shiftbaseDepartmentId`, uniek) -- dat project ontvangt de uren, want
  `TimeEntry` vereist altijd een `projectId`. **Schepen komen sinds 27 aug 2026 direct actief
  binnen** (op klantverzoek — voorheen inactief, omdat er geen betrouwbare naamregel is om een
  echt schip (bv. "Moods&Roots I (Krimpen)") te onderscheiden van een niet-schip ("Kantoor",
  "Quality"); de klant accepteert nu dat ook die laatste als "actief schip" verschijnen, in ruil
  voor het schrappen van de handmatige review-stap). De bijbehorende "Vaarbemanning …"-projecten
  komen nog wel **inactief** binnen (ongewijzigd) — activeren kan via `/admin/projects`.
- Elke Shiftbase-**gebruiker** → een Vaartijd `User` (`User.shiftbaseEmployeeId`, uniek). Deze
  accounts zijn **niet bedoeld om mee in te loggen** (`active = false`, willekeurig
  wachtwoord dat nergens wordt vastgelegd) -- puur om uren aan te kunnen koppelen. Er wordt
  bewust **geen gevoelige data** overgenomen (geen BSN, geboortedatum, adres, loon) -- alleen
  naam, e-mailadres en het Shiftbase-ID. Als het e-mailadres ontbreekt of al in gebruik is,
  valt de sync terug op een placeholder-adres.
- Elke goedgekeurde (`status: "Approved"`), niet-verwijderde Shiftbase-**timesheet** → een
  `TimeEntry` met `mode = SHIFTBASE_IMPORT` en een uniek `shiftbaseTimesheetId` (voorkomt
  dubbele import bij herhaald draaien). Deze rijen stromen automatisch mee in de bestaande
  AFAS-exportpipeline (`afasSyncStatus` start op `PENDING`, zoals elke andere `TimeEntry`) --
  zodra de AFAS-koppeling echt werkt (zie §10.1) hebben de bijbehorende "Vaarbemanning
  ..."-projecten dus wel eerst een `afasProjectCode` nodig, net als bij Rentman-projecten.
- **Performance-valkuil (ondervonden en opgelost):** een eerste, naïeve opzet deed een losse
  `findUnique`+`upsert` per Shiftbase-rij (270+ medewerkers, duizenden uren-regels) en liep
  daardoor vast op tientallen seconden tot minuten. De huidige opzet haalt alles in bulk op in
  Maps en gebruikt `createMany`, en draait in een paar seconden. Hou dit patroon aan bij
  vergelijkbare bulk-syncs.
- Trigger: de "Nu importeren"-knop op `/admin/shiftbase`, of extern via
  `POST/GET /api/shiftbase/crew-import` (secret: `SHIFTBASE_IMPORT_SECRET`, of admin-sessie).
  **Nog geen cron ingesteld** -- draait alleen handmatig totdat bewust gekozen wordt dit ook
  dagelijks te automatiseren (zie §14 voor de Vercel Hobby-cronlimiet).

#### Urenexport (nog steeds geblokkeerd, ongewijzigd)

`/admin/shiftbase` heeft daarnaast nog het oorspronkelijke, **tegenovergestelde**-richting
onderdeel: uren van Vaartijd náár Shiftbase schrijven (`/timesheets` als schrijfdoel). Endpoint
en veldnamen daarvoor zijn **nooit bevestigd** tegen de echte API (overgenomen uit een
architectuurvoorstel). Nu de authenticatie werkt, zou een klik op "Nu synchroniseren" ook
daadwerkelijk bij Shiftbase aankomen -- mogelijk met een verkeerde payload. Daarom blijft dit
pad **hard geblokkeerd**, zowel de knop in de UI als de server action
(`integrations/actions/shiftbase-sync.ts`) als de externe trigger-route
(`app/api/shiftbase/sync/route.ts`), totdat `SHIFTBASE_HOURS_EXPORT_ENABLED=true` expliciet
gezet wordt. Zet die pas aan nadat je via de verkenner het echte `/timesheets`-endpoint en de
veldnamen hebt bevestigd én `mapTimeEntryToShiftbase()` daarop is aangepast.

- Env vars: `SHIFTBASE_API_KEY`, `SHIFTBASE_BASE_URL` (optioneel), `SHIFTBASE_SYNC_SECRET`,
  `SHIFTBASE_HOURS_EXPORT_ENABLED` (default uit), `SHIFTBASE_IMPORT_SECRET` (voor de
  vaarbemanning-import hierboven -- andere richting, ander secret).

### 10.4 Rentman MCP-server — **verkend, niet afgebouwd**

Dit is de **belangrijkste openstaande uitbreiding** voor de nieuwe partij om op te pakken.

De klant wil: Rentman-verkoopfacturen automatisch als verkoopboeking (mét PDF-bijlage) in AFAS
laten landen, in de juiste administratie (02 Events / 21 Evento, zelfde naamconventie als
hierboven), en zodra AFAS een betaling registreert, die betaalstatus terugzetten naar Rentman.

**Wat al is uitgezocht/bevestigd:**
- Rentman heeft naast de REST-API ook een **MCP-server**
  (`https://mcp.rentman.net/mcp`, in Rentman: Instellingen → API → MCP (AI-assistenten)) die
  inlogt als een echte Rentman-gebruiker i.p.v. via een scope-beperkt API-token. Deze is via
  de "Connectors"-instellingen van de gebruikte Claude-omgeving gekoppeld en gaf tools zoals
  `invoices`, `invoicelines`, `payments`, `files`, `projects`, `subprojects`, etc.
- **Factuur-PDF ophalen werkt**: via de `files`-resource, gefilterd op
  `file_item = <invoice id>` + `file_itemtype = "Factuur"` → een tijdelijk getekende S3-URL.
  **Correctie (2 sep 2026):** eerder stond hier dat dit alleen via de MCP-weg werkte en de
  platte REST-API met een los token een 403 gaf — dat bleek onjuist. De 403 kwam door verkeerde
  filter-syntax (`filter[file_item]=...`, wat een 400 "Wrong syntax in query" geeft); met platte
  querysleutels (`file_item=<id>&file_itemtype=Factuur`, zelfde patroon als `modified[gte]`
  elders) werkt dit gewoon met `RENTMAN_API_TOKEN`, bevestigd met een live testaanroep die ook de
  PDF-bytes (via de teruggegeven getekende S3-URL) daadwerkelijk downloadde. Zie §10.8 voor de
  module die dit gebruikt (`integrations/rentman/client.ts`: `fetchAllInvoiceFilesSince`/`fetchInvoiceFileUrl`).
- **Betaling terugschrijven naar Rentman** kan via `invoices` → actie `create_payments`
  (velden: `moment`, `amount`, `description`, `payment_import_source`), of via de losse
  `payments`-resource (`update`-actie). **Nog niet getest** — dat raakt echte financiële data
  in Rentman, dus bewust niet zomaar geprobeerd.
- **AFAS-kant voor verkoopfacturen staat nog niet aan**: de nu bevestigde OAuth-koppeling
  (§10.1) is alleen voor de `PtRealisation`-uren-connector — een verkoopboeking + bijlage
  wegschrijven vereist een **aparte, nog niet afgesproken** UpdateConnector (dagboek/
  grootboek/btw-code per administratie, en hoe een bijlage precies wordt meegestuurd) — dat
  moet nog worden uitgezocht (via AFAS' eigen `metainfo`-endpoints, of navragen bij Willem van
  Melis/Royaal, de AFAS-consultant van de klant).

**Afgesproken regels (bevestigd door de klant, niet zelf verzinnen):**
- Administratie-routing: naam begint met `"EVENTO - "` → 21 (Evento), anders → 02 (Events).
- Betaal-terugkoppeling: dagelijks, meeliftend op dezelfde cron als de Rentman-projectsync.
- **Elke schrijfactie richting Rentman of AFAS eerst expliciet voorleggen** aan de klant voordat
  ze wordt uitgevoerd — dat is een uitdrukkelijke afspraak uit de bouwfase, geen technische
  beperking. Dus: bouw het, maar laat een testrun op één niet-kritieke factuur eerst goedkeuren.

**Nog te doen:**
1. AFAS-token laten aanleveren door de klant, connectors verkennen. *(Deels gedaan: de
   uren-connector is bevestigd en werkt, §10.1 — een verkoopboekings-connector is nog niet
   geautoriseerd.)*
2. ~~Prisma-model(len) voor "welke Rentman-facturen zijn al naar AFAS geëxporteerd"~~ **gedaan**
   (`RentmanInvoiceExport`, §10.8).
3. ~~Sync-module: facturen ophalen (MCP of REST), PDF ophalen~~ **gedaan** (via het gewone
   REST-token, zie de correctie hierboven; §10.8) — **nog niet gedaan:** het daadwerkelijke
   "AFAS UpdateConnector-payload bouwen + boeken" (de payload-functie bestaat al als
   beste-inschatting, maar er is nog geen connector om 'm tegenaan te testen).
4. Betaal-terugkoppeling: AFAS-kant lezen (welke boekingen zijn betaald sinds vorige run) →
   `invoices.create_payments` in Rentman. *(Nog niet opgepakt.)*
5. ~~Cron-route + admin-dashboardpagina~~ **gedaan** (`/admin/rentman-afas`, §10.8) — wél zonder
   werkende AFAS-koppeling, puur klaargezet.

### 10.5 Rentman financieel dashboard (`/admin/rentman-financieel`) — **werkend**

Pixel-voor-pixel herbouw van een door de klant zelf gemaakt statisch HTML-dashboard
(`rentman_dashboard_v4.html`, Chart.js, aangeleverd als referentie) als een echt, elke nacht
ververst onderdeel van de app — inclusief volledige paginabreedte (zie onder). Alleen lezend
richting Rentman, net als §10.2 — dit voegt geen nieuwe schrijfrichting toe.

**Architectuur:** één ruwe brontabel, geen vooraf-geaggregeerde tussentabellen. `RentmanSubprojectSnapshot`
bevat één rij per Rentman-subproject (jaargescoped, elke nacht volledig ververst — rijen buiten
scope worden verwijderd). Alle KPI's/grafieken/tabellen van de 5 tabbladen worden hieruit
*bij het opbouwen van de pagina* afgeleid via pure functies in `integrations/rentman/dashboardAggregate.ts`
(`overviewKpis`, `monthlySeries`, `statusByMonth`, `openByStatus`, `bvStats`/`omzetBvMaand`/
`omzetPerCategorie`/`catGroupMaand`, `monthDetail`, `cancelledKpis`, `cancelledByMonth`/
`cancelledInMonth`, `pendingKpis`/`pendingByMonth`, `followUpKpis`/`followUpByMonth`)
— bij ~800 rijen is dat in-memory triviaal snel, en het voorkomt dat elke nieuwe doorsnede een
eigen precomputed tabel nodig heeft (eerdere opzet met `RentmanMonthlySnapshot`+`RentmanPendingProject`
is hierom vervangen, migratie `20260824065117_rentman_subproject_snapshot`). `RentmanInvoicedMonthly`
(factuurdatum-groepering, voor de Maandoverleg-sectie op het Overzicht-tabblad) blijft wel een
losse tabel.

Naast de financiële velden bevat elke snapshot-rij ook `city`, `businessUnit` en `category`
(migratie `20260825120000_rentman_bv_categorie_locatie`, toegevoegd bij de v6.1-vergelijking
hieronder) — alle drie afgeleid in `dashboardSync.ts` (`cityOf`/`businessUnitOf`/`categoryOf`):
- `city`: `location.visit_city` (val terug op `mailing_city`) van het subproject — puur voor
  weergave ("Locatie"-kolom), speelt geen rol in aggregaties.
- `businessUnit`: `"EVENTO"` als de projectnaam daarmee begint; anders via het magazijn
  (`asset_location_from`, bv. `/stocklocations/4`): `/stocklocations/4` → `"M&R Utrecht"`,
  anders (incl. `/stocklocations/1` en onbekend/leeg, bv. oude projecten van vóór de
  magazijn-koppeling) → `"M&R Kampen"` (fallback). Rechtstreeks overgenomen uit het
  referentiedashboard v6.1, waar dit expliciet als correcte fallback bevestigd stond.
- `category`: sleutelwoord-classificatie op de naam van het Rentman project-type
  (`project.project_type.name`, expand `project.project_type`) — bevat "foodtruck" → Foodtruck,
  "bbq" → BBQ, "food"/"buffet" → Catering, "verhuur" → Verhuur, anders (of ontbrekend
  project-type) → Overig. Er is geen expliciet categorie-veld in Rentman; deze regel is een
  benadering, maar bij een live vergelijking (25 aug 2026) kwamen BBQ/Overig/Foodtruck-aantallen
  exact overeen met het referentiedashboard en Verhuur/Catering op een paar procent na (verklaarbaar
  door dataverschil tussen de "gisteren"-snapshot van de referentie en live data).

- Module: `integrations/rentman/dashboardSync.ts` (`syncRentmanDashboard()`), gebruikt twee fetch-functies
  in `integrations/rentman/client.ts`: `fetchAllSubprojectsFinancial(year)` en `fetchAllInvoicesForDashboard(year)`.
- **Jaarscope (live ontdekte bug — 24 aug 2026 opgelost):** beide fetch-functies filteren op
  `year` (`created[gte]`/`created[lt]` resp. `date[gte]`/`date[lt]`, top-level queryparams —
  zelfde patroon als `modified[gte]` in §10.2). **Zonder** deze filter haalt Rentman de
  **volledige historie** op (destijds 1446 subprojecten sinds juli 2023 i.p.v. de verwachte ~800
  voor het lopende jaar), wat de KPI's opblies en tot onzinnige facturatiepercentages (tot 400%)
  leidde door prijscorrecties op allang afgesloten oude projecten. `syncRentmanDashboard()` geeft
  `new Date().getUTCFullYear()` door aan beide functies, en ruimt na elke sync rijen buiten de
  verse jaarscope expliciet op (`deleteMany` met `notIn`, alleen als de fetch daadwerkelijk
  resultaten opleverde).
- **`number` en `project_type` zitten op het Project, niet op het Subproject** (zelfde valkuil als
  §10.2) — daarom `expand: "project.project_type,status,location"` en toegang via
  `sp.project?.number` resp. `sp.project?.project_type?.name`. **Let op:** Rentman filtert `fields=`
  niet door naar geëxpandeerde relaties — `project` en `location` komen dus als volledige, geneste
  objecten terug (niet beperkt tot de gevraagde velden), merkbaar zwaarder dan voorheen maar bij
  ~800 subprojecten/jaar nog ruim binnen de 5MB-responslimiet.
- **"Gederfde omzet" voor geannuleerde projecten (live ontdekte bug — 24 aug 2026 opgelost):**
  Rentman zet `project_total_price` op **0** zodra een subproject geannuleerd wordt. De eerste
  opzet gebruikte dat veld overal, waardoor "Gederfde omzet" altijd €0 toonde. Rentman heeft
  echter een apart gegenereerd veld, **`project_total_price_cancelled`**, dat het offertebedrag
  van vóór de annulering behoudt (bevestigd via de Rentman MCP-connector op live data: een
  geannuleerd subproject had `project_total_price=0` maar `project_total_price_cancelled=131694`).
  `RentmanSubprojectSnapshot.cancelledRevenue` bewaart dit apart van `revenue`, zodat gederfde
  omzet nooit meetelt in de actieve omzettotalen. Verwacht dat dit KPI-getal van dag tot dag
  merkbaar springt (elke nieuwe annulering met een groot offertebedrag telt direct mee) — dat is
  correct/gewenst gedrag voor een "live" dashboard, geen bug.
- **5 tabbladen** (exact als het referentiedashboard v6.1 "samengevoegd" — zie onder) —
  bijgewerkt 25 aug 2026
  na vergelijking met een nieuwe referentie-export (`rentman_dashboard_v6_1.html`), die zelf ook
  "Maandoverleg" niet meer als apart tabblad had en een nieuwe "BV & Categorie"-sectie toevoegde:
  1. **Overzicht** — 5 KPI's (Projecten, Projectomzet, Gefactureerd %, In optie, Direct opvolgen),
     4 grafieken (omzet vs. gefactureerd, facturatiegraad, omzet per status per maand gestapeld,
     open omzet per status als donut); daaronder twee samengevoegde subsecties (niet langer eigen
     tabbladen):
     - **Maandoverleg — op factuurdatum:** KPI "Totaal gefactureerd (factuurdatum)" + grafiek +
       toelichting. De handmatige-invoersectie (per-locatie cijfers, model
       `RentmanManualMonthlyEntry`) is op verzoek van de klant al op 24 aug 2026 verwijderd
       (migratie `20260824085516_drop_rentman_manual_entry`) en blijft verwijderd — dit is puur
       Rentman-afgeleide factuurdatumcijfers.
     - **BV & Categorie:** 3 KPI-kaarten (EVENTO/M&R Kampen/M&R Utrecht, met projectaantal, omzet
       en facturatiegraad), 2 gestapelde maandgrafieken (omzet per BV; Verhuur/Catering/Overig),
       en 2 tabellen (omzet per BV per maand, omzet per categorie). Zie hierboven voor de
       BV/categorie-afleidingsregels.
  2. **Projecten per maand** — opent met een grafiek die alle maanden in één oogopslag toont
     (omzet per status, gestapeld, dezelfde `statusByMonth()`-aggregatie als tabblad 1); daaronder
     een maandkiezer met per maand 2 KPI's, een statuslijst met voortgangsbalken, een donut, en
     per status een kleurkoptabel met individuele projecten (#, Project, Locatie, Periode, Omzet,
     Gefact., Open, %) — de Locatie-kolom is nieuw (25 aug 2026, gebruikt het nieuwe `city`-veld).
  3. **Opvolging** — regels **1-op-1 overgenomen** uit het referentiedashboard v6.1 (niet langer
     best-effort — de exacte regels stonden als toelichtingstekst op dat dashboard):
     filter (ongeacht status) omzet > 0, omzet − gefactureerd > 1, gefactureerd ≥ −0,01;
     🔵 **Doorlopend** = naam bevat "wekelijkse" (eerst getoetst); 🔴 **Direct opvolgen** = periode
     (planperiod_end) verstreken; 🟡 **Toekomstig** = periode nog niet verstreken of onbekend.
     Gegroepeerd per aanmaakmaand (subtabs), elke sectie gesorteerd op hoogste openstaand bedrag.
     Zie `followUpByMonth()`/`followUpKpis()` in `dashboardAggregate.ts`.
  4. **In optie & aanvraag** — alle projecten met status Optie/Aanvraag, per aanmaakmaand (subtabs)
     in twee parallelle kolommen (net als v6.1's `buildColumn`), met Locatie en BV-kolom, rood
     gemarkeerd wanneer de periode al verlopen is. Zie `pendingByMonth()`.
  5. **Geannuleerd** — 4 KPI's (incl. gederfde omzet, grootste annulering), 2 grafieken,
     maandkiezer met tabel van geannuleerde projecten (#, Project, Locatie, Reden annulering,
     Gederfde omzet) gesorteerd op offertebedrag. "Reden annulering" toont altijd "niet bekend"
     (net als v6.1) — geen custom veld in Rentman, zie de Callout op dit tabblad.
  *(Een 6e tabblad, "🏗️ Naar AFAS", stond hier tussen 27 aug en 2 sep 2026 — op uitdrukkelijk
  verzoek van de klant verplaatst naar een losse pagina, zie §10.8.)*
- **Donker thema (25 aug 2026)** — de klant leverde een tweede stijlgids aan
  (`instructie_dashboardstijl_vaartijden.md`) met een donker kleurenschema (`--bg #0f1115`,
  panelen `#171a21`/`#1e222b`, 4 semantische kleuren blauw/groen/oranje/rood) en vroeg dit
  scherm daarnaar om te zetten. `components/admin/rentman-dashboard/colors.ts` is herschreven
  naar deze donkere tokenset (bewust een aparte, dashboard-specifieke set — niet de generieke
  `components/admin/reports/palette.ts`, die licht blijft voor de rest van de admin-
  rapportages). De 9 Rentman-statussen zijn allemaal afgeleid van de 4 basiskleuren in
  verschillende tinten (zie `STATUS_COLORS`) i.p.v. nieuwe, niet-verwante kleuren te
  introduceren — zo blijven ze onderscheidbaar in gestapelde/donut-grafieken zonder van de
  stijlgids af te wijken. De stijlgids schreef ook Chart.js en een losse HTML-bestand-aanpak
  voor; dat is **niet** overgenomen (bewust, na overleg) — alleen het visuele ontwerp is
  toegepast, gebouwd met de bestaande Recharts + React-componentstructuur van deze app. Een
  eigen, donker-thema tooltip-component (`chart-tooltip.tsx`, lokaal in deze map) vervangt de
  gedeelde lichte `components/admin/reports/chart-tooltip.tsx` binnen dit scherm.
- **Volledige paginabreedte:** `app/admin/layout.tsx` beperkt alle admin-pagina's tot `max-w-2xl`.
  Dit scherm breekt daar bewust uit via een CSS "full-bleed"-truc
  (`relative left-1/2 w-screen -translate-x-1/2`, gevolgd door een eigen `max-w-[1700px]`) i.p.v.
  de gedeelde layout aan te passen — geen ander admin-scherm is geraakt.
- Trigger: "Nu herberekenen" op `/admin/rentman-financieel`, of automatisch 's nachts —
  piggybackt op de bestaande Rentman-cron (`app/api/rentman/sync/route.ts` roept na
  `syncRentmanProjects()` ook `syncRentmanDashboard()` aan, onafhankelijk try/catch zodat een
  fout in de een de ander niet blokkeert). Bewust **geen eigen cron-job** — zie de
  Vercel Hobby-cronlimiet in §14.
- Geen nieuwe env vars nodig — hergebruikt `RENTMAN_API_TOKEN` (en `CRON_SECRET`/
  `RENTMAN_SYNC_SECRET` voor de externe trigger) uit §10.2.

### 10.6 Integratiekoppelingen losgemaakt van de kernmodellen (27 aug 2026)

Naar aanleiding van een inschattingsverzoek over het ooit loskoppelen van Rentman/AFAS/
Shiftbase tot een eigen integratielaag (zie de gepubliceerde "Ontkoppelingsinschatting"-
artifact) is de eerste, voorbereidende stap **al uitgevoerd**: alle Rentman-/AFAS-/Shiftbase-
koppelvelden zijn van `User`/`Project`/`Ship`/`TimeEntry` áf gehaald en staan nu in 8 eigen
1-op-1-koppeltabellen. Dit was mogelijk zonder databasemigratie-risico omdat de app op dat
moment nog niet in echt gebruik was (zie de "Volledige reset"-paragraaf hierboven) — de
tabellen zijn na de schemawijziging gewoon opnieuw gevuld via een verse sync.

**Nieuwe modellen** (migratie `20260827100000_integratie_koppeltabellen`):
`ProjectRentmanLink`, `ProjectAfasLink`, `ProjectShiftbaseLink`, `ShipShiftbaseLink`,
`UserAfasLink`, `UserShiftbaseLink`, `TimeEntryAfasLink`, `TimeEntryShiftbaseImport`
(herkomst: geïmporteerd uit Shiftbase) en `TimeEntryShiftbaseExport` (bestemming: export
náár Shiftbase, nog geblokkeerd/ongeverifieerd, zie §10.3) — bewust twee aparte modellen,
want import en export zijn onafhankelijke richtingen die nooit dezelfde rij vullen.

**Waarom dit meer was dan de sync-modules herschrijven:** een grep op de te verplaatsen
veldnamen liet zien dat ook echte kernlogica (niet alleen `integrations/rentman|afas|shiftbase/*`) er
rechtstreeks op las:
- `lib/assignments.ts` — `projectGroupWhere()`/`shipGroupWhere()` (bepalen EVENTS_EVENTO vs.
  RIVER_ROOTS) filterden op `shiftbaseDepartmentId`, nu op `shiftbaseLink: { isNot: null }`.
- `lib/actions/time-entries.ts` (`deleteTimeEntry`) — de guard die voorkomt dat een medewerker
  al-geëxporteerde uren verwijdert, keek naar `afasSyncStatus`, nu naar `afasLink.syncStatus`.

Beide zijn functioneel ongewijzigd, alleen de queryvorm is anders (relatie i.p.v. platte
kolom) — geverifieerd met een tijdelijk testaccount: het project-kiesscherm op `/uren` toont
nog steeds de juiste Rentman-projectnummers, en het aanmaken van een urenregistratie boekt
nog steeds op het juiste project met een correcte `afasLink`/`shiftbaseExport`-koppelrij.

**Nieuwe schrijfregel:** elke `TimeEntry` krijgt bij aanmaak (in `lib/actions/time-entries.ts`,
`lib/actions/timer.ts` én `integrations/shiftbase/sync.ts`) meteen een `afasLink` (en, behalve bij
Shiftbase-import, een `shiftbaseExport`) met `syncStatus: PENDING` — dat verving het oude
`@default(PENDING)` dat rechtstreeks op de kolom stond.

**Ook meegenomen:** `integrations/afas/hoursSync.ts` en `integrations/shiftbase/hoursSync.ts` gebruiken nu een
gerichte `select` in plaats van `include: { user: true, project: true }` — dat laatste haalde
ongemerkt de **volledige** User-/Project-rij op (incl. bv. `passwordHash`) enkel om één of twee
velden te gebruiken. Relevant voor een toekomstige losse dienst (optie B in de
ontkoppelingsinschatting): die hoeft zo nooit meer dan `afasEmployeeNumber`/`afasProjectCode`
te zien.

**Nog niet gedaan (toen):** een eigen map-structuur/toegangslaag (optie A) — zie §10.7, inmiddels
wel gedaan — of een losse, apart gedeployde dienst (optie B, nog niet gedaan).

### 10.7 Optie A afgerond: eigen `integrations/`-map (27 aug 2026)

Vervolg op §10.6 — stap 2 uit het 4-stappenplan dat volgde op de ontkoppelingsinschatting.
`lib/rentman/*`, `lib/afas/*`, `lib/shiftbase/*` en hun bijbehorende server actions
(`lib/actions/{rentman,rentman-dashboard,afas,shiftbase,shiftbase-crew,shiftbase-sync}.ts`) zijn
verplaatst naar een eigen top-level map, **`integrations/`** (zie
[`integrations/README.md`](integrations/README.md) voor de volledige grensregel en indeling) —
puur een `git mv` + import-paden bijwerken, geen logicawijziging.

- **Wat wél verhuisde:** de vier koppelmodules zelf + hun server actions.
- **Wat expliciet niet verhuisde:** de admin-pagina's (`app/admin/{rentman,rentman-financieel,
  afas,shiftbase}/page.tsx` — Next.js vereist dat pagina's onder `app/` staan) en hun
  UI-componenten (`components/admin/rentman-dashboard/*`, `*-controls.tsx`,
  `shiftbase-explorer.tsx`) — die bevatten geen kennis van de externe systemen zelf, ze krijgen
  platte data doorgegeven.
- **De grens is een conventie, geen technische afdwinging** (geen aparte package, geen
  lint-regel, geen CODEOWNERS) — bewust, want dat hoort pas bij optie B. De regel staat expliciet
  uitgeschreven in `integrations/README.md`: alles hier mag alleen via `requireAdminScope()` uit
  `lib/dal.ts` de kernlaag raken, nooit rechtstreeks `User`/`ShipOccupancy`/etc.
- **Nog niet gedaan:** optie B (eigen `package.json`, aparte deploy, eigen database-credential,
  API-contract met de rest van Vaartijd) — volgt pas ná de twee prioriteitskoppelingen (§10.4),
  zoals het 4-stappenplan voorschrijft.

### 10.8 Rentman → AFAS overzicht/wachtrij (`/admin/rentman-afas`) — **klaargezet, wacht op connectors**

Losse pagina (2 sep 2026), bewust **niet** onderdeel van het financiële dashboard (§10.5) — op
uitdrukkelijk verzoek van de klant ("niet in het dashboard"). Twee tabbladen, allebei met
dezelfde opzet: een checklist ("klaar voor AFAS") + een al aangesloten verzendknop die pas echt
iets naar AFAS stuurt zodra de bijbehorende UpdateConnector bestaat — tot die tijd zet
"Verzenden" elke poging op `PENDING` met een duidelijke uitlegtekst, in plaats van een echte
AFAS-aanroep te doen (zelfde voorzichtige patroon als overal elders in deze integratie).

**Tabblad 1 — Projecten:** projecten die de **afgelopen week** (niet meer een maand, zoals de
voormalige dashboard-tab) naar Rentman-status "Bevestigd" gingen. Hergebruikt
`ProjectRentmanLink.rentmanStatusChangedAt`/`afasCreateRequestedAt` (§10.5/migratie
`20260827180000_rentman_afas_create_tracking`) en voegt drie sync-statusvelden toe
(`afasCreateStatus`/`afasCreateSyncedAt`/`afasCreateError`, migratie
`20260902120000_rentman_afas_export`). Verzendlogica: `integrations/afas/projectSync.ts`
(`sendProjectToAfas`/`sendSelectedProjectsToAfas`), env `AFAS_PROJECT_CONNECTOR`.

**Tabblad 2 — Verkoopfacturen:** nieuw, er bestond nog geen per-factuur-opslag
(`RentmanInvoicedMonthly`, §10.5, is een maandaggregaat). Nieuw model `RentmanInvoiceExport`
(zelfde migratie), gevuld door `integrations/rentman/invoiceExportSync.ts`
(`syncRecentRentmanInvoices()`, venster van 60 dagen als veiligheidsmarge — de pagina zelf
toont alleen de laatste week), die op zijn beurt twee nieuwe client-functies gebruikt
(`integrations/rentman/client.ts`): `fetchRecentInvoicesForExport` (facturen incl. geëxpandeerd
project/klant) en `fetchAllInvoiceFilesSince` (gekoppelde PDF's). Draait automatisch mee op de
bestaande Rentman-cron (`app/api/rentman/sync/route.ts`, los try/catch) én via een "Facturen nu
bijwerken"-knop op de pagina zelf.
- **Correctie van een eerdere aanname (§10.4):** de factuur-PDF blijkt gewoon ophaalbaar met het
  gewone `RENTMAN_API_TOKEN` — de eerder aangenomen 403/MCP-only-beperking kwam door verkeerde
  filter-syntax, niet door een tokenscope-probleem. Bevestigd met een live testaanroep
  (`file_item=<id>&file_itemtype=Factuur`, platte querysleutels — geen `filter[...]`-wrapper) die
  ook daadwerkelijk de PDF-bytes downloadde via de teruggegeven getekende S3-URL.
  `fetchInvoiceFileUrl(fileId)` haalt bij elke download een verse URL op (die is maar ~10 uur
  geldig) — de PDF-knop in de UI linkt naar `/api/rentman-afas/invoice-pdf/[id]`, een kleine
  route die opzoekt/doorverwijst i.p.v. de URL zelf op te slaan.
- Verzendlogica: `integrations/afas/invoiceSync.ts` (`sendInvoiceToAfas`/
  `sendSelectedInvoicesToAfas`), env `AFAS_DELIVERY_NOTE_CONNECTOR`. Haalt bij verzending de PDF
  op en zet 'm om naar base64.

**2 sep 2026 — antwoord van Willem van Melis/Royaal, connectornamen + aanpak bevestigd:**
- **Projecten → `PtProject`** (enkelvoud — Willems eigen tekst schreef "PtProjects", maar de
  daadwerkelijk geautoriseerde connectornaam is `PtProject`, bevestigd via `metainfo` die dit
  keer wél 200 gaf i.p.v. de eerdere 500 — zelfde soort spellingsvalkuil als eerder bij
  `PtRealization`/`PtRealisation`, §10.1). **Volledige veldenlijst nu bevestigd** (niet meer een
  aanname): `Ds` (Omschrijving, tekst), `PrGp` (Projectgroep, tekst, **verplicht** — geen vaste
  waardenlijst in AFAS zelf), `PrId` (Project/projectnummer, tekst, niet verplicht — leeg laten
  laat AFAS zelf nummeren). `mapProjectToAfas()` gebruikt deze drie. `Projectgroep` wordt afgeleid
  met de al bestaande, door de klant bevestigde administratie-routing (§10.4/§10.2: naam begint
  met "EVENTO - " → 21, anders → 02) — een aanname dat die twee dingen 1-op-1 hetzelfde zijn, nog
  niet apart geverifieerd (AFAS legt zelf niet vast welke Projectgroep-codes geldig zijn).
  **Beslist (2 sep 2026):** het Rentman-projectnummer wordt altijd zelf meegestuurd als `PrId`
  (voor traceerbaarheid/koppeling terug naar Rentman) — geen AFAS-autonummering.
  - **Eerste live testboeking (2 sep 2026, met expliciet akkoord van de klant, één project uit de
    testomgeving):** `Ds`/`PrId` werden geaccepteerd, maar AFAS gaf een 500 terug met een heldere
    `externalMessage`: *"De ingevulde waarde bij 'Projectgroep' bestaat niet."* Dat bevestigde dat
    `PrGp` het juiste veld is, maar weerlegde de aanname dat de Rentman-administratieroutering
    ("02"/"21") ook geldige AFAS-Projectgroep-codes zijn — dat zijn ze niet.
  - Naar aanleiding hiervan is `afasErrorMessage()` toegevoegd (`integrations/afas/client.ts`):
    plakt AFAS' eigen `externalMessage` (indien aanwezig in de foutrespons) achter de generieke
    "HTTP 500"-melding, zodat zulke fouten voortaan direct leesbaar in `afasCreateError` staan
    i.p.v. alleen een statuscode. Gebruikt door zowel `projectSync.ts` als `invoiceSync.ts`.
  - **Projectgroep-codes bevestigd door de klant** (screenshot van AFAS' eigen
    "Projectgroepen"-lijst, 9 rijen: ALG/ALGH/EO/EV/EVU/MR/RR/SC/VV) + de gewenste mapping:
    EVENTO → `EO`, M&R Kampen → `EV`, M&R Utrecht → `EVU`. Om dit te kunnen toepassen kreeg
    `ProjectRentmanLink` een nieuw veld **`rentmanBusinessUnit`** (migratie
    `20260902150000_rentman_project_business_unit`), gevuld door `integrations/rentman/sync.ts`
    met dezelfde `businessUnitFor()`-afleiding als het financiële dashboard (§10.5) — die functie
    is verplaatst van `dashboardSync.ts` naar `integrations/rentman/client.ts` zodat beide syncs 'm
    delen i.p.v. dupliceren. Eenmalig teruggevuld voor alle bestaande links (1474 van de 1477
    rijen; de resterende 3 zijn oude, niet-Bevestigde/geannuleerde projecten en irrelevant voor
    deze koppeling). `projectGroupFor()` in `projectSync.ts` gebruikt nu deze drie bevestigde
    codes (met "EV" als vangnet voor een onverwachte/lege waarde).
  - **Herhaalde testboeking (2 sep 2026, zelfde project): geslaagd.** Met de juiste
    Projectgroep-code (`EV`, want M&R Kampen) accepteerde AFAS het bericht volledig —
    `afasCreateStatus` ging naar `SYNCED`. De PtProject-koppeling werkt dus nu end-to-end voor
    projectaanmaak.

**3 sep 2026 — twee nieuwe, nog openstaande punten na live gebruik door de klant:**

1. **Debiteur-koppeling (BcCo/DbId) -- geblokkeerd, wacht op Willem.** Het eerste écht in AFAS
   aangemaakte testproject miste nog een debiteur. Onderzocht: Rentman-debiteurnummers komen niet
   overeen met AFAS-nummers. Rentman heeft hiervoor wel een bedoeld bruggetje --
   `contacts.accounting_code` ("External identifier used for integrations with accounting
   software") -- maar bleek in de praktijk **vrijwel overal leeg** (49 van 50 recent gewijzigde
   contacten getest, geen enkele had een AFAS-nummer). Ook `commerce_code` (KVK-nummer) en
   `VAT_code` (btw-nummer) staan vaak wel gevuld en zijn bruikbaar als matchsleutel.
   **Afgesproken aanpak, nog te bouwen zodra Willem de benodigde connectors vrijgeeft:**
   - Eenmalige import: AFAS-debiteurenlijst ophalen, matchen tegen Rentman-contacten **alleen op
     KVK-/btw-nummer** (bewust geen naam-matching, te risicovol) en het gevonden AFAS-nummer
     terugschrijven naar `accounting_code` -- dit wordt de **eerste schrijfrichting naar Rentman**
     in deze hele integratie (tot nu toe overal alleen lezend). Rentmans `contacts`-resource
     ondersteunt een gewone `update` op dit veld.
   - Voor klanten zonder match: nieuwe debiteur aanmaken in AFAS (aparte, nog te bevestigen
     UpdateConnector, vermoedelijk `KnOrganisation`/`KnPerson`-achtig).
   - Vraag aan Willem (3 sep 2026, nog geen antwoord): welke connector geeft de debiteurenlijst
     (nummer + KVK/btw/naam) om op te matchen, en welke connector + verplichte velden zijn nodig
     om een nieuwe debiteur aan te maken?
   - **Nog een open subvraag, ontdekt via `metainfo`:** PtProject heeft niet één maar **twee**
     debiteur-achtige velden -- `BcCo` ("Organisatie/Persoon", de basisrelatie) en `DbId`
     ("Verkooprelatie", expliciet dezelfde naam als de kolom in de klant-screenshots). Nog te
     bepalen of alleen `DbId`, alleen `BcCo`, of beide gevuld moeten worden.
2. **Extra PtProject-velden bevestigd via screenshots van de klant** (AFAS' eigen "Alle
   projecten"-overzicht, 3 sep 2026) en toegevoegd aan `mapProjectToAfas()`:
   - `UnFi` (Administratie, **ander veld dan Projectgroep**): EVENTO → 21, M&R Kampen → 2 (bare
     integer, niet "02") -- toevallig de oorspronkelijke 02/21-aanname die eerder abusievelijk op
     Projectgroep werd toegepast; die hoorde dus bij dit veld. **M&R Utrecht bevestigd door de
     klant (3 sep 2026): ook 2**, zelfde als M&R Kampen.
   - `DaSt` (Begindatum) ← Rentmans `rentmanStartsAt`, `DtGp` (Datum gereed planning) ←
     `rentmanEndsAt`. `DtGw` (Werkelijke datum gereed) bewust leeg gelaten (geen bruikbare bron
     bij aanmaak, alleen relevant als het project echt is afgerond).
   - `Ch`/`Inst`/`DeRe`/`InPr`/`RePr` (Doorbelasten/Termijnfacturen/Pakbonnen naar nacalculatie/
     twee factuurvoorstel-vlaggen) -- op alle geziene voorbeeldprojecten stonden deze uit,
     expliciet op `false` gezet.
   - `TeId` (Team) -- **bevestigd en werkend.** De eerste twee pogingen (volledige omschrijvingen
     "Evento Event Rentals"/"Moods & Roots Events B.V.", en later de letterlijke, langere tekst uit
     een screenshot van de Team-kolom) werden allebei afgewezen -- net als bij Projectgroep bleek
     de zichtbare omschrijving een aparte, kortere code te hebben. De klant leverde een screenshot
     van AFAS' eigen Teams-lijst (3 sep 2026): "Evento event Rentals B.V. - Projecten" → code
     **`EVO-PRJ`**, "Moods & Roots Events B.V. - Projecten" → code **`MRE-PRJ`** (voor zowel M&R
     Kampen als M&R Utrecht). Getest met twee nieuwe testprojecten (één EVENTO, één M&R Utrecht):
     beide `SYNCED`.
   - **Nog niet gevuld:** `EmId`/`CdPl` (Projectleider) -- op de meeste voorbeeldrijen ook leeg,
     dus niet als verplicht beschouwd; zou eventueel uit Rentmans `project.account_manager`
     afgeleid kunnen worden, maar dat is een aparte, nog niet aangevraagde
     Rentman-crew-naar-AFAS-medewerker-koppeling.
   - **Geverifieerd (3 sep 2026):** meerdere nieuwe testprojecten met de volledige, huidige
     payload (incl. Team) werden probleemloos geaccepteerd (`afasCreateStatus: SYNCED`).
3. **"Bestaat het al?"-check toegevoegd (3 sep 2026) -- ontdekking, geen nieuwe aanvraag nodig.**
   De klant wil dit uiteindelijk elke nacht automatisch laten draaien (zie punt 4 hieronder), en
   vroeg daarbij expliciet om eerst te checken of een project al bestaat. Bleek al mogelijk: de
   al-geautoriseerde GetConnector **`VPLAN_Project`** (ontdekt bij het uitproberen van de twee
   bestaande leesconnectors, niet aangevraagd bij Willem) geeft een volledige lijst van bestaande
   AFAS-projecten terug (`name` = projectnummer, `description` = naam, aanmaak-/wijzigdatum,
   afgemeld-vlag). Nieuwe functie `fetchExistingAfasProjectNumbers()`
   (`integrations/afas/client.ts`, paginering via `skip`/`take`) haalt alle projectnummers op;
   `sendProjectToAfas()`/`sendSelectedProjectsToAfas()` (`projectSync.ts`) checken hiertegen vóór
   het versturen -- bestaat het al, dan wordt de rij gewoon op `SYNCED` gezet zonder opnieuw naar
   AFAS te schrijven (voorkomt de "waarde komt al voor"-fout). Getest: een al aangemaakt
   testproject werd correct herkend en oversloeg de AFAS-aanroep; twee nieuwe testprojecten (die
   eerder op het Team-veld faalden) werden nu, met Team uitgeschakeld, gewoon aangemaakt.
4. **Geplande automatisering (nog niet gebouwd, expliciet pas ná een korte testperiode van
   handmatig doorzetten):** de klant wil dat het aanmaken van projecten in AFAS uiteindelijk elke
   nacht automatisch gebeurt, net als de andere Rentman-syncs. Zodra gewenst: één regel toevoegen
   aan `app/api/rentman/sync/route.ts` die `sendSelectedProjectsToAfas()` aanroept (los try/catch,
   zelfde patroon als de al bestaande drie stappen daar) -- de bestaan-check hierboven maakt dat
   veilig herhaalbaar. Vereist eerst wel dat `AFAS_PROJECT_CONNECTOR` staat + debiteur/Team-vragen
   zijn opgelost, anders faalt/mist elke nacht dezelfde velden.

- **Verkoopfacturen → geen directe factuur-connector, maar `FbDeliveryNote`** (nog niet
  geautoriseerd, gaf op 2 sep 2026 nog een 500). Willems
  voorkeursmethode: een gereed gemelde **pakbon** aanmaken (met de factuur-PDF als bijlage
  toegevoegd), die AFAS zelf omzet naar een verkoopfactuur — vandaar de hernoeming van
  `AFAS_INVOICE_CONNECTOR` naar **`AFAS_DELIVERY_NOTE_CONNECTOR`** (2 sep 2026). `mapInvoiceToAfas()`
  gebruikt voorlopig `OrNu`/`Date`/`ExternalProjectId`/`Reported` + regels — eveneens **niet**
  bevestigd via `metainfo`.
  - Willem vroeg expliciet: *"hebben we meer zicht nodig op hoe Rentman de data aanbiedt: is er
    iets bekend van de API van Rentman?"* — **beantwoord** (2 sep 2026, zie
    `integrations/rentman/client.ts` en hierboven): Rentman levert per factuur wél een los,
    los-op-te-halen PDF (via `files`, bevestigd werkend), maar de `invoicelines`-resource geeft
    **geen** product-/dienstregels zoals op de PDF — dat zijn gegenereerde **grootboek-/
    btw-samenvattingsregels** (bv. "Omzet verhuurde materialen"/grootboek 8060, 21% btw,
    "Omzet transport"/8064, "Verzekering"/8068 zonder btw), rechtstreeks bereikbaar via
    `/invoices/{id}/invoicelines` (`fetchInvoiceLines()`, nieuw). Dat sluit juist goed aan bij
    een boeking (elke regel heeft al een grootboekcode + btw-tarief) — de productdetails blijven
    zichtbaar via de bijgevoegde PDF, niet via de API.
  - **Nog niet bevestigd:** of het `FileName`/`FileStream`-bijlagepatroon in `mapInvoiceToAfas()`
    ook echt geldt voor `FbDeliveryNote` (dat is AFAS' gebruikelijke generieke manier om een
    bestand aan een UpdateConnector-element te hangen, maar niet apart voor déze connector
    geverifieerd) — controleer via `metainfo/update/FbDeliveryNote` zodra beschikbaar.

**Toegang:** gated op `AdminScope.AFAS` (niet een nieuwe scope-waarde) — bewuste keuze omdat dit
feitelijk de Rentman→AFAS-brug is. Gevolg: Niels/Henry/Renko (§17) die alleen
`RENTMAN_FINANCIEEL` hebben, zien deze nieuwe pagina niet vanzelf — een beheerder moet ze
desgewenst ook de scope "AFAS-koppeling" geven via `/admin/users/[id]`.

**Status per 3 sep 2026:**
- **Projecten (`PtProject`): alle velden op debiteur na bevestigd en werkend, end-to-end
  getest.** Connector geautoriseerd, veldnamen (`Ds`/`PrGp`/`PrId`/`UnFi`/`TeId`/`DaSt`/`DtGp`/
  `Ch`/`Inst`/`DeRe`/`InPr`/`RePr`) en Projectgroep-/Administratie-/Team-codes bevestigd voor alle
  drie business units, projectnummer-vraag beslist, "bestaat-het-al?"-check (`VPLAN_Project`)
  toegevoegd, en meerdere testboekingen succesvol afgerond (inclusief hertest van eerder gefaalde
  projecten). **Nog geblokkeerd/open, in volgorde van impact:**
  1. Debiteur (`BcCo`/`DbId`) -- wacht op Willems antwoord over de debiteuren-connectors (zie
     hierboven); zonder dit mist elk aangemaakt project nog een verkooprelatie. **Enige
     resterende blokkade voor volledig gebruik.**
  2. `AFAS_PROJECT_CONNECTOR=PtProject` pas echt aanzetten voor algemeen gebruik (nu nog leeg) —
     dat activeert de "Verzenden"-knop op `/admin/rentman-afas` voor alle beheerders, dus eerst
     met de klant afstemmen wanneer dat moment is (waarschijnlijk pas ná punt 1 hierboven).
  3. Daarna, expliciet pas ná een korte testperiode van handmatig doorzetten: automatisch elke
     nacht laten meelopen op de bestaande Rentman-cron (zie punt 4 hierboven) -- technisch al
     klaar, wacht op een go van de klant.
- **Verkoopfacturen (`FbDeliveryNote`):** nog niet geautoriseerd (metainfo gaf op 2 sep 2026 nog
  een 500) — wacht nog op Willem. Zodra dat wel zo is: `mapInvoiceToAfas()`-payload verifiëren/
  aanpassen aan de echte `metainfo` (velden én het bijlage-patroon), dan
  `AFAS_DELIVERY_NOTE_CONNECTOR` invullen. Verder is er geen codewijziging nodig, de UI/wachtrij/
  sync-statuslogica staat al.

---

## 11. Environment variables

Volledige, actuele lijst — zie ook [`.env.example`](.env.example).

| Variabele | Verplicht | Omschrijving |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon Postgres, pooled connection |
| `DATABASE_URL_UNPOOLED` | ✅ | Neon Postgres, direct (nodig voor Prisma migraties) |
| `SESSION_SECRET` | ✅ | Random string voor JWT-ondertekening (`openssl rand -base64 32`) |
| `AFAS_ENVIRONMENT_ID` | optioneel | AFAS-omgevingscode — **al ingevuld in productie** |
| `AFAS_OAUTH_CLIENT_ID` | optioneel | OAuth2 client-credentials, aangeleverd door Royaal (24 aug 2026) |
| `AFAS_OAUTH_CLIENT_SECRET` | optioneel | Idem — behandel als wachtwoord, nooit loggen |
| `AFAS_HOURS_CONNECTOR` | optioneel | Naam van de AFAS UpdateConnector voor uren (`PtRealization`, Amerikaanse spelling — zie §10.1) |
| `AFAS_HOURS_ITEM_CODE` / `AFAS_HOURS_STATUS_ID` | optioneel | Vaste ItCd/StId-waarden, zie §10.1 — fallback `"300"`/`"1"` |
| `AFAS_SYNC_SECRET` | optioneel | Secret voor externe trigger van `/api/afas/sync` |
| `AFAS_PROJECT_CONNECTOR` | optioneel | Naam van de AFAS UpdateConnector voor projectaanmaak — geautoriseerd: `PtProject`, zie §10.8 (nog niet ingesteld, wacht op akkoord voor een eerste testboeking) |
| `AFAS_DELIVERY_NOTE_CONNECTOR` | optioneel | Naam van de (nog niet geautoriseerde) AFAS UpdateConnector voor gereed gemelde pakbonnen (waaruit AFAS verkoopfacturen maakt) — bevestigd: `FbDeliveryNote`, zie §10.8 |
| `SHIFTBASE_API_KEY` | optioneel | Shiftbase API-sleutel — **ingevuld in productie, lezen werkt** |
| `SHIFTBASE_BASE_URL` | optioneel | Override van de standaard Shiftbase-basis-URL |
| `SHIFTBASE_SYNC_SECRET` | optioneel | Secret voor externe trigger van `/api/shiftbase/sync` |
| `SHIFTBASE_HOURS_EXPORT_ENABLED` | optioneel | Moet letterlijk `true` zijn om de (nog ongeverifieerde) urenexport te laten schrijven — **bewust uit** in productie, zie §10.3 |
| `SHIFTBASE_IMPORT_SECRET` | optioneel | Secret voor externe trigger van `/api/shiftbase/crew-import` (vaarbemanning-import, andere richting dan `SHIFTBASE_SYNC_SECRET`) |
| `RENTMAN_API_TOKEN` | optioneel (maar actief in gebruik) | Rentman API-token — **ingevuld in productie, werkend** |
| `RENTMAN_SYNC_SECRET` | optioneel (maar actief in gebruik) | Secret voor `/api/rentman/sync`, **moet gelijk zijn aan** `CRON_SECRET` |
| `CRON_SECRET` | ja, voor de cron | Vercel Cron stuurt dit automatisch mee als Bearer-token |

**Belangrijke conventie uit de bouwfase (aanhouden!):** secrets worden **nooit** in de chat/PR-
beschrijving/commit-message geplakt. Ze worden direct in `.env` (lokaal) of via
`vercel env add <NAAM> production --force` (productie) gezet, en alleen op *aanwezigheid/lengte*
geverifieerd (nooit de waarde zelf printen/loggen). Voor push naar Vercel: gebruik
`--sensitive`-vars (standaard) voor echte secrets; alleen niet-gevoelige gedeelde
cron-secrets zijn ooit met `--no-sensitive` gezet zodat ze achteraf leesbaar blijven voor
verificatie.

---

## 12. Database & migraties

Standaard Prisma-workflow: wijzig `prisma/schema.prisma`, dan:

```bash
npx prisma migrate dev --name <beschrijving>
```

**Bekende valkuil in sommige (niet-interactieve) omgevingen:** `prisma migrate dev` kan falen
met *"Prisma Migrate has detected that the environment is non-interactive"* zodra Prisma een
waarschuwing wil tonen (bv. bij een nieuwe unique constraint). Workaround die tijdens de bouw
steeds werkte:

```bash
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration.sql
# handmatig wegschrijven naar prisma/migrations/<timestamp>_<naam>/migration.sql
npx prisma migrate deploy   # non-interactief, past 'm toe
```

**Let op (Windows):** met de dev-server actief kan `prisma generate` falen met een
`EPERM`-fout op de query-engine-DLL (bestand in gebruik). Stop de dev-server even, of gebruik
`npx next build` direct (skip `prisma generate` als het schema niet gewijzigd is).

`prisma/seed.ts` maakt alleen een beheerder-account. `prisma/seed-demo.ts` vult daarnaast
demo-medewerkers, -projecten, -schepen en een jaar demodata — **niet draaien tegen de
productiedatabase** tenzij dat expliciet gewenst is (was tijdens de bouwfase eenmalig gebruikt
voor visuele verificatie, niet bedoeld als doorlopend proces).

**Opgeschoond (25 aug 2026):** de door `seed-demo.ts` aangemaakte testdata is uit de
(gedeelde dev/prod-)database verwijderd op verzoek van de klant — 9 demo-medewerkers
(`@demo.vaartijd.nl`), hun ~23.856 synthetische registraties (uren/bezetting/maaltijden/afval),
en de 10 demo-schepen/5 demo-projecten die nooit door een echte medewerker gebruikt zijn. Twee
demo-schepen/projecten (`Alegro`, `Havenwerkzaamheden`) bleken toen wél echte registraties te
hebben en zijn **niet** verwijderd. `seed-demo.ts` zelf staat nog in de repo (voor gebruik tegen
een aparte test-omgeving) maar zou bij het opnieuw draaien tegen déze database dezelfde
demo-medewerkers/-schepen/-projecten weer aanmaken.

**Volledige reset naar alleen Rentman/Shiftbase-data (27 aug 2026):** omdat de app op dat moment
nog niet in echt gebruik was, is op verzoek van de klant de **volledige** inhoud van `User`
(behalve `admin@kuipersbeheerbv.nl`/`jan@kuipersbeheerbv.nl`), `Project`, `Ship`, `TimeEntry`,
`ShipOccupancy`, `MealCount`, `FoodWaste` en `DaySubmission` gewist en opnieuw opgebouwd via een
verse Rentman-projectsync (volledige historie, want het `SyncState`-watermark is ook gewist) +
Rentman-dashboardsync + Shiftbase-vaarbemanning-import (`syncShiftbaseCrew(60)`, ruimer dan de
standaard 35 dagen, als marge). **Let op voor wie hierna verder werkt:** dit verwijderde ook drie
handmatig aangemaakte, niet-Rentman/Shiftbase-records die niet meer terugkomen bij een sync —
schepen `MS Kuiper`/`MS Zeearend`/`Alegro` en projecten `Onderhoud MS Kuiper`/
`Onderhoud MS Zeearend`/`Havenwerkzaamheden`. Dat was op dat moment een fout (had eerst
gecontroleerd moeten worden of alle `Ship`/`Project`-rijen wel écht Rentman/Shiftbase-afkomstig
waren), maar is door de klant achteraf expliciet geaccepteerd ("nee laat er maar uit, ik wil
alleen de data uit Shiftbase en Rentman") — dus **niet** opnieuw aanmaken als je deze regel ooit
tegenkomt. De database bevat sindsdien bewust uitsluitend Rentman-/Shiftbase-afkomstige
`Project`/`Ship`-rijen (plus de twee genoemde losse accounts).

---

## 13. Deployment (Vercel)

- Project: `vaartijd-app`, team/scope `dennis-k` (nodig als `--scope`-argument, anders geeft de
  Vercel CLI soms "Not authorized" terug ondanks een geldige login).
- Handmatig deployen:
  ```bash
  npx vercel --prod --yes --scope dennis-k
  ```
- **`.vercel/project.json`** bevat de gekoppelde `projectId`/`orgId` — niet aanpassen tenzij je
  bewust naar een ander Vercel-project wilt wijzen.
- Environment variables beheren:
  ```bash
  npx vercel env add <NAAM> production --scope dennis-k    # nieuw
  npx vercel env add <NAAM> production --force --scope dennis-k --value "..."  # overschrijven
  npx vercel env ls production --scope dennis-k             # lijst (waarden van "Sensitive"-
                                                              # vars zijn NIET terug te lezen)
  ```
  **Na elke env-var-wijziging opnieuw deployen** — Vercel past nieuwe/gewijzigde variabelen pas
  toe vanaf de eerstvolgende deployment, niet met terugwerkende kracht op een lopende.
- De lokale `DATABASE_URL`/`DATABASE_URL_UNPOOLED` in `.env` wijzen naar **dezelfde**
  Neon-database als productie (geen apart dev/staging-schema) — wees dus voorzichtig met
  destructieve acties tijdens lokaal ontwikkelen/testen.

---

## 14. Cron jobs

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/rentman/sync", "schedule": "0 3 * * *" }
  ]
}
```

Vercel Hobby-plan: **max. 1 cron-run per dag per job**. Elke nieuwe cron-route die je toevoegt
(bv. voor de AFAS-facturen-sync uit §10.4) moet daar rekening mee houden, of vereist een
upgrade naar een betaald Vercel-plan voor vaker draaien.

Het financiële Rentman-dashboard (§10.5) heeft **bewust geen eigen cron-job** gekregen — die
zou de Hobby-limiet overschrijden. In plaats daarvan roept `/api/rentman/sync` na de bestaande
`syncRentmanProjects()` ook `syncRentmanDashboard()` aan (los try/catch, gecombineerde
JSON-respons `{ project, dashboard }`), zodat beide 's nachts meeliften op dezelfde 03:00 UTC
cron-run. Sinds §10.8 (2 sep 2026) doet diezelfde route er een derde, eveneens los try/catch'te
stap bij: `syncRecentRentmanInvoices()` (respons-sleutel `invoiceExport`), voor het
verkoopfacturen-overzicht op `/admin/rentman-afas`.

---

## 15. Secret-handling conventie

Deze regels zijn tijdens de bouw consequent aangehouden en zijn een expliciete afspraak met de
klant — graag aanhouden:

1. De klant plakt **nooit** een secret/token in de chat; die wordt direct in `.env` gezet.
2. Aanwezigheid/geldigheid wordt alleen gecontroleerd via lengte/statuscode van een testcall —
   de waarde zelf wordt nooit geprint of gelogd.
3. Voordat een secret naar Vercel (of enige andere externe plek) gepusht wordt: **expliciet
   toestemming vragen**, ook al is de bewerking daarna routinematig.
4. Schrijfacties naar externe systemen met echte bedrijfsdata (Rentman, AFAS) worden **altijd**
   eerst voorgelegd, ook wanneer de leesrechten/verkenning daarvoor al is goedgekeurd.

---

## 16. Testen & verificatie

Er is geen geautomatiseerde testsuite. De gehanteerde verificatie-flow bij elke wijziging:

```bash
npx tsc --noEmit -p tsconfig.json   # type-check
npm run lint                        # eslint (incl. React-hooks-regels, o.a. set-state-in-effect)
npx next build                      # productie-build (skip "prisma generate" als schema
                                     # ongewijzigd is, i.v.m. de Windows-EPERM-valkuil uit §12)
```

Daarna handmatig/browsermatig verifiëren: inloggen, de gewijzigde flow doorlopen, en bij
server-side wijzigingen de queries direct tegen de database controleren (bv. via een kort
Node-scriptje met `@prisma/client`).

**Aanrader voor de nieuwe partij:** een echte testsuite (bv. Vitest voor de `lib/`-functies,
Playwright voor kritieke flows als inloggen/uren-registreren/dag-indienen) staat nog niet in
de repo. Gezien de hoeveelheid business-logic in `lib/actions/*` (uniek-per-dag-regels,
tijdzone-afhandeling, sync-status) zou dat de volgende investering met het meeste rendement
zijn.

---

## 17. Bekende openstaande punten

Gesorteerd op vermoedelijke prioriteit voor de klant:

1. ~~AFAS-koppeling voor uren: authenticatie/autorisatie geblokkeerd~~ — **opgelost 27 aug
   2026:** zowel de hostname (`rest` → `resttest`) als de connectornaam (`PtRealisation` →
   `PtRealization`, Amerikaanse spelling) waren fout; AFAS' eigen `metainfo`-endpoint bevestigde
   dit en gaf er meteen de volledige velden-definitie bij, wat ook twee veldfouten in de payload
   aan het licht bracht (`Qu` i.p.v. `QuD1`, verplicht `VaIt` ontbrak). Zie §10.1. **Nog niet
   bevestigd:** de exacte *waarden* voor `ItCd`/`StId` voor déze administratie (fallback
   `"300"`/`"1"`) — pas te checken met een echte testboeking. Voor het verkoopfacturen-plan
   (AFAS-kant, §10.4) is nog niets afgestemd, en het **project-aanmaken bij een bevestigde
   Rentman-offerte** (de eerste prioriteitskoppeling uit de ontkoppelingsinschatting) is
   **geblokkeerd**: `metainfo` (zonder connectornaam) toont alle voor "Skrepr" geautoriseerde
   connectors, en daar zit geen enkele UpdateConnector voor het aanmaken van projecten tussen
   (alleen `PtRealization` voor uren) — Willem moet zo'n connector eerst aanmaken en autoriseren
   voordat die koppeling gebouwd kan worden.
2. **Rentman → AFAS verkoopfacturen + PDF-bijlage + betaal-terugkoppeling** — plan is met de
   klant besproken en de Rentman-kant is technisch geverifieerd (MCP), maar er is nog geen
   regel code voor geschreven. Zie §10.4 voor de volledige stand van zaken.
3. **Shiftbase-urenexport ongeverifieerd** — lezen is bevestigd werkend (correcte
   `Authorization: API <key>`-header); schrijven staat bewust hard geblokkeerd achter
   `SHIFTBASE_HOURS_EXPORT_ENABLED` totdat het `/timesheets`-endpoint en de veldnamen zijn
   bevestigd via de verkenner op `/admin/shiftbase`. Zie §10.3.
4. **Shiftbase-vaarbemanning-import: schepen/projecten nog te curaten** — de import zet alle
   18 River Roots-departments als inactieve `Ship`/`Project` klaar (op één na: "Moods&Roots I
   (Krimpen)" is tijdens het testen al geactiveerd als voorbeeld); een beheerder moet de overige
   echte schepen zelf activeren (via Schepen/Projecten) en er een `afasProjectCode` aan hangen
   voordat de bijbehorende uren richting AFAS kunnen. Ook nog geen cron ingesteld -- draait nu
   alleen handmatig. Zie §10.3.
5. **Geen "wachtwoord vergeten"/zelf-wijzigen voor medewerkers** — een beheerder moet nu
   handmatig een nieuw tijdelijk wachtwoord zetten.
6. **Geen geautomatiseerde tests** — zie §16.
7. **Eenmalige Rentman-opschoning is geen blijvend jaarfilter** — een toekomstige volledige
   sync haalt weer alle historische/toekomstige jaren op (bewust zo afgesproken, zie §10.2,
   maar goed om te weten voor wie hier niet bij was).
8. **Rapportagepagina's en admin-schermen zijn Nederlandstalig** — vertaling is nooit
   meegenomen (bewuste keuze, niet vergeten of kapot).
9. ~~Financieel dashboard, Opvolging-tab is best-effort~~ — **opgelost 25 aug 2026:** een nieuwe
   referentie-export (v6.1) bevatte de exacte filter-/classificatieregels (incl. "Doorlopend" =
   naam bevat "wekelijkse") als toelichtingstekst, nu 1-op-1 overgenomen in `followUpByMonth()`.
   Zie §10.5. De categorie-classificatie (Verhuur/Catering/BBQ/Foodtruck/Overig) blijft wel een
   sleutelwoord-benadering op het Rentman project-type, bij gebrek aan een expliciet
   categorie-veld — bij een live steekproef kwamen BBQ/Overig/Foodtruck exact overeen met de
   referentie, Verhuur/Catering op een paar procent na.
10. **2FA: geen rate-limiting op foutieve codes, geen back-up codes** — bewust buiten scope
    gehouden bij het bouwen (24 aug 2026); een volledige beheerder kan altijd via "2FA resetten"
    (`/admin/users/[id]`) iemand die zijn telefoon kwijt is weer toegang geven. Zie §6.

---

## 18. Contact & eigenaarschap

- **Opdrachtgever:** Kuipers Beheer BV — [info@kuipersbeheerbv.nl](mailto:info@kuipersbeheerbv.nl)
- **Hosting:** Vercel, project `vaartijd-app` (scope `dennis-k`)
- **Database:** Neon Postgres (project zichtbaar via `DATABASE_URL`-host in `.env`/Vercel env)
- **Rentman:** account met een gekoppelde MCP-server (zie §10.4) en een los API-token
  (§10.2) — beide beheerd door de klant zelf in Rentman's instellingen.

Voor vragen over eerdere ontwerpbeslissingen: de git-geschiedenis (`git log`) is vrij
gedetailleerd en Nederlandstalig; commit-berichten en code-comments beschrijven regelmatig
*waarom* iets zo is gebouwd, niet alleen *wat*.
