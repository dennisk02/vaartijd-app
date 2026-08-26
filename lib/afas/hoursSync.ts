import "server-only";
import { prisma } from "@/lib/prisma";
import { afasFetch, isAfasConfigured, AfasApiError } from "@/lib/afas/client";
import type { Prisma } from "@prisma/client";

type TimeEntryWithRelations = Prisma.TimeEntryGetPayload<{
  include: { user: true; project: true };
}>;

/// Werksoort-/itemcode (ItCd) en boekingsstatus (StId) zijn in AFAS vaste,
/// omgeving-specifieke codes -- niet per medewerker/project verschillend
/// voor deze eenvoudige urenregistratie. Ingesteld via env i.p.v.
/// hardcoded, zodat ze zonder codewijziging aan te passen zijn zodra
/// Royaal/Willem van Melis de definitieve waarden bevestigt (het "300"/"1"
/// uit hun voorbeeld-e-mail was mogelijk een generiek sjabloonvoorbeeld,
/// niet per se de daadwerkelijke code voor Kuipers Beheer BV).
const AFAS_ITEM_CODE = process.env.AFAS_HOURS_ITEM_CODE || "300";
const AFAS_STATUS_ID = process.env.AFAS_HOURS_STATUS_ID || "1";

/**
 * Bouwt de payload voor de AFAS PtRealisation-UpdateConnector (bevestigd
 * door Royaal/Willem van Melis, 24 aug 2026 -- zie HANDOVER.md §10.1).
 *
 * LET OP -- `PrId` (projectnummer) is een AANNAME, gebaseerd op de
 * gangbare AFAS-conventie voor dit type connector: het ontbrak in het
 * door Royaal aangeleverde velden-voorbeeld (mogelijk afgesneden bij het
 * kopiëren van het scherm). Dit MOET geverifieerd worden met een
 * testaanroep (bv. via `testAfasConnection()` of één losse echte boeking)
 * vóórdat hier structureel op vertrouwd wordt -- zonder het juiste
 * projectveld komen de uren mogelijk helemaal niet, of op het verkeerde
 * project, in AFAS terecht.
 */
function mapTimeEntryToAfas(entry: TimeEntryWithRelations) {
  return {
    PtRealisationWeek: {
      Element: {
        Fields: {
          EmId: entry.user.afasEmployeeNumber,
          DaTi: entry.date.toISOString().slice(0, 10),
          ItCd: AFAS_ITEM_CODE,
          StId: AFAS_STATUS_ID,
          QuD1: Number(entry.hours),
          // Onbevestigd veld -- zie toelichting hierboven.
          PrId: entry.project.afasProjectCode,
        },
      },
    },
  };
}

export async function syncTimeEntry(id: string) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: { user: true, project: true },
  });
  if (!entry) return;

  const connector = process.env.AFAS_HOURS_CONNECTOR;

  if (!isAfasConfigured() || !connector) {
    await prisma.timeEntry.update({
      where: { id },
      data: { afasError: "AFAS-koppeling is nog niet geconfigureerd." },
    });
    return;
  }

  if (!entry.user.afasEmployeeNumber) {
    await prisma.timeEntry.update({
      where: { id },
      data: { afasSyncStatus: "ERROR", afasError: "Medewerker heeft geen AFAS-medewerkernummer." },
    });
    return;
  }

  if (!entry.project.afasProjectCode) {
    await prisma.timeEntry.update({
      where: { id },
      data: { afasSyncStatus: "ERROR", afasError: "Project heeft geen AFAS-projectcode." },
    });
    return;
  }

  try {
    const payload = mapTimeEntryToAfas(entry);
    await afasFetch(`connectors/${connector}`, { method: "POST", body: payload });
    await prisma.timeEntry.update({
      where: { id },
      data: { afasSyncStatus: "SYNCED", afasSyncedAt: new Date(), afasError: null },
    });
  } catch (error) {
    const message = error instanceof AfasApiError ? error.message : "Onbekende fout bij synchroniseren met AFAS.";
    await prisma.timeEntry.update({
      where: { id },
      data: { afasSyncStatus: "ERROR", afasError: message },
    });
  }
}

export async function syncPendingTimeEntries(limit = 50) {
  const pending = await prisma.timeEntry.findMany({
    where: { afasSyncStatus: { in: ["PENDING", "ERROR"] } },
    orderBy: { date: "asc" },
    take: limit,
    select: { id: true },
  });

  for (const entry of pending) {
    await syncTimeEntry(entry.id);
  }

  return pending.length;
}
