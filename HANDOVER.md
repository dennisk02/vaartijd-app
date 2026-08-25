# Vaartijd — Technische handleiding & overdrachtsdocument

**Voor:** de partij die onderhoud en verdere ontwikkeling van deze app overneemt.
**Opdrachtgever:** Kuipers Beheer BV ([info@kuipersbeheerbv.nl](mailto:info@kuipersbeheerbv.nl))
**Laatst bijgewerkt:** 21 augustus 2026
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
`lib/rentman/sync.ts`. Dit is een aparte regel van de gebruikers-zichtbaarheidskeuze hieronder.

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
  admin/                      # Beheer-specifieke componenten (forms, project-list, reports/*,
                               # rentman-dashboard/* — de 6 tabs van het financiële dashboard +
                               # colors.ts/kpi-card.tsx als gedeelde, pixel-exacte bouwstenen)

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
  actions/                    # "use server" — alle mutaties, per domein
                               # (auth.ts + twofactor.ts: login/2FA-verificatie/2FA-instellen)
  afas/                       # AFAS Profit REST-koppeling (client + hoursSync)
  rentman/                    # Rentman REST-koppeling: client.ts + sync.ts (projectimport) +
                               # dashboardSync.ts + dashboardAggregate.ts (financieel dashboard,
                               # zie §10.5)
  shiftbase/                  # Shiftbase-koppeling: client.ts (verkenner) + sync.ts
                               # (vaarbemanning-import, lezend, werkend) + hoursSync.ts
                               # (urenexport, schrijvend, nog geblokkeerd/ongeverifieerd)

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
  (upsert + opschoning van rijen buiten de huidige jaarscope — geen incrementele sync). Alle
  KPI's/grafieken/tabellen van de 6 tabbladen worden hier bij paginaopbouw uit afgeleid
  (`lib/rentman/dashboardAggregate.ts`) i.p.v. los vooraf-geaggregeerd te worden.
- **`RentmanInvoicedMonthly`** — apart van `RentmanSubprojectSnapshot` omdat dit op
  **factuurdatum** groepeert i.p.v. aanmaakdatum (voor het Maandoverleg-scherm/AFAS-aansluiting).

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
| `/admin/projects` | `PROJECTS` | Projecten aanmaken/(de)activeren, doorzoekbare lijst |
| `/admin/ships` | `SHIPS` | Schepen aanmaken/(de)activeren, incl. capaciteit |
| `/admin/users` → `/admin/users/[id]` | `USERS` | Medewerkers aanmaken (**volledige beheerders only**); per medewerker: projectgroep, specifieke project-/scheepstoewijzing (doorzoekbaar), zichtbare onderdelen, vast project, Shiftbase-ID, admin-scopes (**volledige beheerders only**), 2FA resetten (**volledige beheerders only**) |
| `/admin/rentman` | `RENTMAN` | Rentman-syncstatus, handmatige sync-trigger, lijst laatst-gesyncte projecten |
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

### 10.1 AFAS Profit (uren-export) — **scaffold, nog niet productie-klaar**

- Module: `lib/afas/client.ts` (generieke REST-wrapper, `AfasToken`-header) +
  `lib/afas/hoursSync.ts` (mapt een `TimeEntry` naar een AFAS UpdateConnector-payload).
- **Status: niet geverifieerd tegen een echte AFAS-omgeving voor uren.** De payload-structuur
  in `mapTimeEntryToAfas()` is een standaard AFAS UpdateConnector-envelop
  (`Element/Fields/Objects`), maar de **exacte connectornaam en veldnamen zijn nog niet
  afgestemd** met AFAS/de klant. Dat is de enige plek die aangepast hoeft te worden zodra die
  bekend zijn — zie de `LET OP`-comment in dat bestand.
- Env vars: `AFAS_ENVIRONMENT_ID`, `AFAS_TOKEN`, `AFAS_HOURS_CONNECTOR`, `AFAS_SYNC_SECRET`.
  **Op dit moment staat alleen `AFAS_ENVIRONMENT_ID` ingevuld in productie — `AFAS_TOKEN`
  ontbreekt nog.** Zolang die leeg is, degradeert de app gracieus: uren blijven op
  `afasSyncStatus = PENDING` staan, er gebeurt verder niets.
- Trigger: `/admin/afas` (handmatig) of `POST/GET /api/afas/sync` (extern, met
  `Authorization: Bearer <AFAS_SYNC_SECRET>`).

### 10.2 Rentman (read-only projectimport) — **werkend**

- Module: `lib/rentman/client.ts` (`fetchAllSubprojects`, paginering) +
  `lib/rentman/sync.ts` (`syncRentmanProjects`, mapt Rentman-subprojecten naar `Project`-rijen).
- **Alleen-lezen richting Vaartijd** — Rentman krijgt nooit uren terug via deze route (dat was
  de oorspronkelijke afspraak; zie wél [§10.4](#104-rentman-mcp-server--verkend-niet-afgebouwd) voor een nieuwere,
  nog niet afgeronde uitbreiding).
- **Statusfilter:** alleen subprojecten met status `Bevestigd`, `Klaargezet`, `Op locatie`,
  `Schoonmaken & nakijken` of `Retour ophalen` worden `active: true`; alle overige (Concept,
  Optie, Aanvraag, Geannuleerd, Retour, ...) blijven `active: false` maar staan wél in de
  database (zichtbaar voor beheerders, niet kiesbaar voor medewerkers).
- **Administratie-routing (02 Events / 21 Evento):** puur op naam — begint de projectnaam met
  `"EVENTO - "`, dan Evento, anders Events. Zie `EVENTO_PREFIX` in `lib/rentman/sync.ts`. Sinds
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

- Modules: `lib/shiftbase/client.ts` (generieke REST-wrapper + verkenner-endpoint),
  `lib/shiftbase/sync.ts` (nieuw, de vaarbemanning-import), `lib/shiftbase/hoursSync.ts` (oud,
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
  River Roots-vloot** (bevestigd door de klant), een heel andere vloot dan de bestaande
  `Ship`-records in Vaartijd (Alegro, Triton, MS Kuiper, ...).
- Verder niets -- er is geen "project"-concept in Shiftbase; uren zijn gekoppeld aan een
  gebruiker + een department/team, niet aan een project zoals AFAS/Rentman dat kennen.

#### Vaarbemanning-import (`/admin/shiftbase`, sectie "Vaarbemanning importeren")

Leest (alleen lezend) Shiftbase-departments, -gebruikers en goedgekeurde uren van de laatste 35
dagen in, en legt ze vast in Vaartijd:

- Elke Shiftbase-**department** → een `Ship` (`Ship.shiftbaseDepartmentId`, uniek) **plus** een
  bijbehorend `Project` genaamd `"Vaarbemanning <departmentnaam>"`
  (`Project.shiftbaseDepartmentId`, uniek) -- dat project ontvangt de uren, want `TimeEntry`
  vereist altijd een `projectId`. Nieuw gesyncte schepen/projecten komen **inactief** binnen: er
  is geen betrouwbare naamregel om een echt schip (bv. "Moods&Roots I (Krimpen)") te
  onderscheiden van een niet-schip ("Kantoor", "Quality") -- een beheerder activeert zelf de
  echte boten via de bestaande Schepen-/Projecten-beheerschermen (die hebben inmiddels ook een
  zoekveld, zie eerdere sectie over invoer-UX).
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
(`lib/actions/shiftbase-sync.ts`) als de externe trigger-route
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
  (De platte REST-API met een los token gaf hier een 403 — vermoedelijk tokenscope-beperking;
  de MCP-weg werkt wél.)
- **Betaling terugschrijven naar Rentman** kan via `invoices` → actie `create_payments`
  (velden: `moment`, `amount`, `description`, `payment_import_source`), of via de losse
  `payments`-resource (`update`-actie). **Nog niet getest** — dat raakt echte financiële data
  in Rentman, dus bewust niet zomaar geprobeerd.
- **AFAS-kant staat nog niet aan**: `AFAS_TOKEN` is nog leeg (zie §10.1). Het aanmaken van een
  verkoopboeking + bijlage in AFAS vereist een specifiek geconfigureerde UpdateConnector
  (dagboek/grootboek/btw-code per administratie, en hoe een bijlage precies wordt meegestuurd)
  — dat moet worden uitgezocht zodra er een echte AFAS-token is (via AFAS' eigen
  `metainfo`-endpoints, of navragen bij de AFAS-consultant van de klant).

**Afgesproken regels (bevestigd door de klant, niet zelf verzinnen):**
- Administratie-routing: naam begint met `"EVENTO - "` → 21 (Evento), anders → 02 (Events).
- Betaal-terugkoppeling: dagelijks, meeliftend op dezelfde cron als de Rentman-projectsync.
- **Elke schrijfactie richting Rentman of AFAS eerst expliciet voorleggen** aan de klant voordat
  ze wordt uitgevoerd — dat is een uitdrukkelijke afspraak uit de bouwfase, geen technische
  beperking. Dus: bouw het, maar laat een testrun op één niet-kritieke factuur eerst goedkeuren.

**Nog te doen:**
1. AFAS-token laten aanleveren door de klant, connectors verkennen.
2. Prisma-model(len) voor "welke Rentman-facturen zijn al naar AFAS geëxporteerd" (sync-status
   + AFAS-boekingsreferentie, naar het patroon van `TimeEntry.afasSyncStatus`).
3. Sync-module analoog aan `lib/rentman/sync.ts`: facturen ophalen (MCP of REST), PDF ophalen,
   AFAS UpdateConnector-payload bouwen + PDF meesturen, boeken, status bijwerken.
4. Betaal-terugkoppeling: AFAS-kant lezen (welke boekingen zijn betaald sinds vorige run) →
   `invoices.create_payments` in Rentman.
5. Cron-route + admin-dashboardpagina, zelfde stijl als `/admin/rentman`.

### 10.5 Rentman financieel dashboard (`/admin/rentman-financieel`) — **werkend**

Pixel-voor-pixel herbouw van een door de klant zelf gemaakt statisch HTML-dashboard
(`rentman_dashboard_v4.html`, Chart.js, aangeleverd als referentie) als een echt, elke nacht
ververst onderdeel van de app — inclusief volledige paginabreedte (zie onder). Alleen lezend
richting Rentman, net als §10.2 — dit voegt geen nieuwe schrijfrichting toe.

**Architectuur:** één ruwe brontabel, geen vooraf-geaggregeerde tussentabellen. `RentmanSubprojectSnapshot`
bevat één rij per Rentman-subproject (jaargescoped, elke nacht volledig ververst — rijen buiten
scope worden verwijderd). Alle KPI's/grafieken/tabellen van de 6 tabbladen worden hieruit
*bij het opbouwen van de pagina* afgeleid via pure functies in `lib/rentman/dashboardAggregate.ts`
(`overviewKpis`, `monthlySeries`, `statusByMonth`, `openByStatus`, `monthDetail`, `cancelledKpis`,
`cancelledByMonth`/`cancelledInMonth`, `pendingKpis`/`pendingList`, `followUpKpis`/`followUpList`)
— bij ~800 rijen is dat in-memory triviaal snel, en het voorkomt dat elke nieuwe doorsnede een
eigen precomputed tabel nodig heeft (eerdere opzet met `RentmanMonthlySnapshot`+`RentmanPendingProject`
is hierom vervangen, migratie `20260824065117_rentman_subproject_snapshot`). `RentmanInvoicedMonthly`
(factuurdatum-groepering, voor Maandoverleg) blijft wel een losse tabel.

- Module: `lib/rentman/dashboardSync.ts` (`syncRentmanDashboard()`), gebruikt twee fetch-functies
  in `lib/rentman/client.ts`: `fetchAllSubprojectsFinancial(year)` en `fetchAllInvoicesForDashboard(year)`.
- **Jaarscope (live ontdekte bug — 24 aug 2026 opgelost):** beide fetch-functies filteren op
  `year` (`created[gte]`/`created[lt]` resp. `date[gte]`/`date[lt]`, top-level queryparams —
  zelfde patroon als `modified[gte]` in §10.2). **Zonder** deze filter haalt Rentman de
  **volledige historie** op (destijds 1446 subprojecten sinds juli 2023 i.p.v. de verwachte ~800
  voor het lopende jaar), wat de KPI's opblies en tot onzinnige facturatiepercentages (tot 400%)
  leidde door prijscorrecties op allang afgesloten oude projecten. `syncRentmanDashboard()` geeft
  `new Date().getUTCFullYear()` door aan beide functies, en ruimt na elke sync rijen buiten de
  verse jaarscope expliciet op (`deleteMany` met `notIn`, alleen als de fetch daadwerkelijk
  resultaten opleverde).
- **`number` zit op het Project, niet op het Subproject** (zelfde valkuil als §10.2) — daarom
  `expand: "project,status"` en toegang via `sp.project?.number`.
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
- **6 tabbladen, exact als het referentiedashboard** (de eerste versie voegde "Opvolging" en
  "In optie & aanvraag" ten onrechte samen tot 1 tab — dat zijn twee verschillende dingen):
  1. **Omzet & Facturatie** — 5 KPI's, 4 grafieken (omzet vs. gefactureerd, facturatiegraad,
     omzet per status per maand gestapeld, open omzet per status als donut).
  2. **Projecten per maand** — opent met een grafiek die alle maanden in één oogopslag toont
     (omzet per status, gestapeld, dezelfde `statusByMonth()`-aggregatie als tabblad 1); daaronder
     een maandkiezer met per maand 2 KPI's, een statuslijst met voortgangsbalken, een donut, en
     per status een kleurkoptabel met individuele projecten (#, Project, Periode, Omzet, Gefact.,
     Open, %).
  3. **Geannuleerd** — 4 KPI's (incl. gederfde omzet, grootste annulering), 2 grafieken,
     maandkiezer met tabel van geannuleerde projecten gesorteerd op offertebedrag.
  4. **Maandoverleg** — gefactureerd-per-factuurdatum-grafiek + de bestaande factuurdatum-tabel.
     De handmatige-invoersectie (per-locatie cijfers EVENTO/M&R Kampen/M&R Utrecht, model
     `RentmanManualMonthlyEntry`) is op verzoek van de klant weer volledig verwijderd
     (24 aug 2026, migratie `20260824085516_drop_rentman_manual_entry`) — dit tabblad toont nu
     alleen nog Rentman-afgeleide factuurdatumcijfers.
  5. **Opvolging** — niet-gefactureerde projecten per maand, best-effort geclassificeerd als
     ⚠ Aandacht (periode al voorbij) of 📅 Toekomstig (periode nog in de toekomst). **Let op:**
     de "Doorlopend"-categorie (contracten) en de creditnota-uitsluiting uit het
     referentiedashboard waren daar een eenmalige, handmatig gecureerde analyse — met de huidige
     Rentman-velden niet betrouwbaar automatisch af te leiden, en daarom bewust weggelaten i.p.v.
     gefabriceerd. Zie `followUpList()` in `dashboardAggregate.ts` voor de exacte regels.
  6. **In optie & aanvraag** — alle projecten met status Optie/Aanvraag, oudste aanmaakdatum
     eerst, rood gemarkeerd wanneer de periode al verlopen is.
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

---

## 11. Environment variables

Volledige, actuele lijst — zie ook [`.env.example`](.env.example).

| Variabele | Verplicht | Omschrijving |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon Postgres, pooled connection |
| `DATABASE_URL_UNPOOLED` | ✅ | Neon Postgres, direct (nodig voor Prisma migraties) |
| `SESSION_SECRET` | ✅ | Random string voor JWT-ondertekening (`openssl rand -base64 32`) |
| `AFAS_ENVIRONMENT_ID` | optioneel | AFAS-omgevingscode — **al ingevuld in productie** |
| `AFAS_TOKEN` | optioneel | AFAS App Connector-token — **nog leeg in productie** |
| `AFAS_HOURS_CONNECTOR` | optioneel | Naam van de AFAS UpdateConnector voor uren |
| `AFAS_SYNC_SECRET` | optioneel | Secret voor externe trigger van `/api/afas/sync` |
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
demo-schepen/projecten (`Alegro`, `Havenwerkzaamheden`) bleken inmiddels wél echte registraties
te hebben en zijn **niet** verwijderd. `seed-demo.ts` zelf staat nog in de repo (voor gebruik
tegen een aparte test-omgeving) maar zou bij het opnieuw draaien tegen déze database dezelfde
demo-medewerkers/-schepen/-projecten weer aanmaken.

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
cron-run.

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

1. **AFAS-koppeling niet productie-klaar** — token ontbreekt, connector/veldnamen niet
   afgestemd (zowel voor uren als voor het nieuwe verkoopfacturen-plan). Zie §10.1 en §10.4.
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
9. **Financieel dashboard, Opvolging-tab is best-effort** — de "Aandacht"/"Toekomstig"-vlaggen
   zijn een redelijke benadering (periode verlopen resp. in de toekomst), maar de
   "Doorlopend"-categorie (contracten) en de creditnota-uitsluiting uit het referentiedashboard
   waren daar een eenmalige handmatige analyse die niet uit de huidige Rentman-velden is af te
   leiden. Zie §10.5 voor de exacte regels en de reden waarom dit bewust niet nagebouwd is.
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
