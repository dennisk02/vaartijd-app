import "server-only";
import { prisma } from "@/lib/prisma";
import { afasFetch, isAfasConfigured, AfasApiError } from "@/lib/afas/client";
import type { Prisma } from "@prisma/client";

type TimeEntryWithRelations = Prisma.TimeEntryGetPayload<{
  include: { user: true; project: true };
}>;

/**
 * Bouwt de payload voor de AFAS UpdateConnector die de uren ontvangt.
 *
 * LET OP: dit is de enige plek die aangepast moet worden zodra de exacte
 * AFAS-connectornaam en veldnamen bekend zijn. De structuur hieronder is een
 * standaard AFAS UpdateConnector-envelop (Element/Fields/Objects); de
 * concrete veldnamen (EmId, ProjectCode, Hours, ...) moeten worden vervangen
 * door de veldnamen zoals AFAS die voor deze specifieke connector verwacht.
 */
function mapTimeEntryToAfas(entry: TimeEntryWithRelations) {
  return {
    AfasEmployee: {
      Element: {
        Fields: {
          EmId: entry.user.afasEmployeeNumber,
        },
        Objects: [
          {
            AfasProjectHours: {
              Element: {
                Fields: {
                  Date: entry.date.toISOString().slice(0, 10),
                  ProjectCode: entry.project.afasProjectCode,
                  Hours: Number(entry.hours),
                  Description: entry.description ?? "",
                },
              },
            },
          },
        ],
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
