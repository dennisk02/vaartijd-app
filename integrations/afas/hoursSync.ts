import "server-only";
import { prisma } from "@/lib/prisma";
import { afasFetch, isAfasConfigured, AfasApiError } from "@/integrations/afas/client";
import type { Prisma } from "@prisma/client";

/// Alleen de velden die de AFAS-payload echt nodig heeft -- sinds §10.6
/// (27 aug 2026) staan afasEmployeeNumber/afasProjectCode niet meer op
/// User/Project zelf maar in eigen koppeltabellen. Bewust een `select` i.p.v.
/// `include: { user: true, project: true }` (de oude vorm haalde ongemerkt de
/// volledige User-/Project-rij op, incl. bv. passwordHash) -- een losse
/// dienst die deze module ooit overneemt (zie de ontkoppelingsinschatting)
/// hoeft zo nooit meer dan deze twee velden te zien.
const ENTRY_SELECT = {
  id: true,
  date: true,
  hours: true,
  startTime: true,
  endTime: true,
  user: { select: { afasLink: { select: { afasEmployeeNumber: true } } } },
  project: { select: { afasLink: { select: { afasProjectCode: true } } } },
} satisfies Prisma.TimeEntrySelect;

type TimeEntryWithRelations = Prisma.TimeEntryGetPayload<{ select: typeof ENTRY_SELECT }>;

/// Werksoort-/itemcode (ItCd) en urensoort (StId) zijn in AFAS vaste,
/// omgeving-specifieke codes -- niet per medewerker/project verschillend
/// voor deze eenvoudige urenregistratie. Ingesteld via env i.p.v.
/// hardcoded, zodat ze zonder codewijziging aan te passen zijn zodra
/// Royaal/Willem van Melis de definitieve waarden bevestigt (het "300"/"1"
/// uit hun voorbeeld-e-mail was mogelijk een generiek sjabloonvoorbeeld,
/// niet per se de daadwerkelijke code voor Kuipers Beheer BV) -- de
/// veldnamen zelf (ItCd/StId) zijn inmiddels wel bevestigd, zie hieronder.
const AFAS_ITEM_CODE = process.env.AFAS_HOURS_ITEM_CODE || "300";
const AFAS_STATUS_ID = process.env.AFAS_HOURS_STATUS_ID || "1";

/**
 * Bouwt de payload voor de AFAS PtRealization-UpdateConnector.
 *
 * Velden + verplichtheid rechtstreeks bevestigd via AFAS' eigen
 * `metainfo/update/PtRealization`-endpoint (27 aug 2026, zie HANDOVER.md
 * §10.1) -- niet langer een aanname op basis van Royaals voorbeeld-e-mail.
 * Die live-metadata bracht twee echte fouten aan het licht t.o.v. de
 * eerdere versie van deze functie:
 * - Het aantal-uren-veld heet `Qu` ("Aantal"), niet `QuD1` (dat veld bestaat
 *   niet eens in deze connector).
 * - `VaIt` ("Type item") is verplicht en ontbrak volledig -- "1" = Werksoort,
 *   de juiste waarde voor gewerkte uren (zie de enum in de metadata).
 * `PrId` (Project) en `StId` (Urensoort) bleken wel exact te kloppen met de
 * aanname. `ItCd`/`StId` blijven configureerbare env-waarden (zie boven) --
 * alleen de veldnamen zijn nu bevestigd, niet de exacte codes voor deze
 * administratie.
 */
function mapTimeEntryToAfas(entry: TimeEntryWithRelations, afasEmployeeNumber: string, afasProjectCode: string) {
  return {
    PtRealisationWeek: {
      Element: {
        Fields: {
          EmId: afasEmployeeNumber,
          DaTi: entry.date.toISOString().slice(0, 10),
          VaIt: "1", // Werksoort -- verplicht, bevestigd via metainfo.
          ItCd: AFAS_ITEM_CODE,
          StId: AFAS_STATUS_ID,
          Qu: Number(entry.hours),
          PrId: afasProjectCode,
          ...(entry.startTime ? { StTi: entry.startTime.toISOString() } : {}),
          ...(entry.endTime ? { EnTi: entry.endTime.toISOString() } : {}),
        },
      },
    },
  };
}

/// Schrijft naar TimeEntryAfasLink i.p.v. TimeEntry zelf (§10.6) -- `upsert`
/// i.p.v. `update` omdat oudere rijen van vóór deze koppeltabel-splitsing
/// (of een falende create-transactie) mogelijk geen linkrij hebben.
async function updateAfasLink(timeEntryId: string, data: { syncStatus: "PENDING" | "SYNCED" | "ERROR"; syncedAt?: Date; error?: string | null }) {
  await prisma.timeEntryAfasLink.upsert({
    where: { timeEntryId },
    update: data,
    create: { timeEntryId, ...data },
  });
}

export async function syncTimeEntry(id: string) {
  const entry = await prisma.timeEntry.findUnique({ where: { id }, select: ENTRY_SELECT });
  if (!entry) return;

  const connector = process.env.AFAS_HOURS_CONNECTOR;

  if (!isAfasConfigured() || !connector) {
    await updateAfasLink(id, { syncStatus: "PENDING", error: "AFAS-koppeling is nog niet geconfigureerd." });
    return;
  }

  const afasEmployeeNumber = entry.user.afasLink?.afasEmployeeNumber;
  if (!afasEmployeeNumber) {
    await updateAfasLink(id, { syncStatus: "ERROR", error: "Medewerker heeft geen AFAS-medewerkernummer." });
    return;
  }

  const afasProjectCode = entry.project.afasLink?.afasProjectCode;
  if (!afasProjectCode) {
    await updateAfasLink(id, { syncStatus: "ERROR", error: "Project heeft geen AFAS-projectcode." });
    return;
  }

  try {
    const payload = mapTimeEntryToAfas(entry, afasEmployeeNumber, afasProjectCode);
    await afasFetch(`connectors/${connector}`, { method: "POST", body: payload });
    await updateAfasLink(id, { syncStatus: "SYNCED", syncedAt: new Date(), error: null });
  } catch (error) {
    const message = error instanceof AfasApiError ? error.message : "Onbekende fout bij synchroniseren met AFAS.";
    await updateAfasLink(id, { syncStatus: "ERROR", error: message });
  }
}

export async function syncPendingTimeEntries(limit = 50) {
  const pending = await prisma.timeEntry.findMany({
    where: { OR: [{ afasLink: null }, { afasLink: { syncStatus: { in: ["PENDING", "ERROR"] } } }] },
    orderBy: { date: "asc" },
    take: limit,
    select: { id: true },
  });

  for (const entry of pending) {
    await syncTimeEntry(entry.id);
  }

  return pending.length;
}
