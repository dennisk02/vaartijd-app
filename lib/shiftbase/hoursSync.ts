import "server-only";
import { prisma } from "@/lib/prisma";
import { shiftbasePost, isShiftbaseConfigured, ShiftbaseApiError } from "@/lib/shiftbase/client";
import type { Prisma } from "@prisma/client";

type TimeEntryWithRelations = Prisma.TimeEntryGetPayload<{
  include: { user: true; project: true };
}>;

/**
 * Bouwt de payload voor de Shiftbase-urenexport.
 *
 * LET OP: dit endpoint en deze veldnamen zijn NIET geverifieerd tegen de
 * echte Shiftbase-API (developer.shiftbase.com) -- ze zijn overgenomen uit
 * een architectuurvoorstel. Gebruik de verkenner op /admin/shiftbase om de
 * werkelijke endpoint-namen/velden te bevestigen voordat je hierop vertrouwt,
 * en pas dan alleen deze functie + het pad in `syncTimeEntry` hieronder aan.
 */
function mapTimeEntryToShiftbase(entry: TimeEntryWithRelations) {
  return {
    employee_id: entry.user.shiftbaseEmployeeId,
    date: entry.date.toISOString().slice(0, 10),
    start_time: entry.startTime ? entry.startTime.toISOString() : undefined,
    end_time: entry.endTime ? entry.endTime.toISOString() : undefined,
    description: entry.project.name,
  };
}

export async function syncTimeEntry(id: string) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: { user: true, project: true },
  });
  if (!entry) return;

  if (!isShiftbaseConfigured()) {
    await prisma.timeEntry.update({
      where: { id },
      data: { shiftbaseError: "Shiftbase-koppeling is nog niet geconfigureerd." },
    });
    return;
  }

  if (!entry.user.shiftbaseEmployeeId) {
    await prisma.timeEntry.update({
      where: { id },
      data: { shiftbaseSyncStatus: "ERROR", shiftbaseError: "Medewerker heeft geen Shiftbase medewerker-ID." },
    });
    return;
  }

  try {
    const payload = mapTimeEntryToShiftbase(entry);
    await shiftbasePost("/timesheets", payload);
    await prisma.timeEntry.update({
      where: { id },
      data: { shiftbaseSyncStatus: "SYNCED", shiftbaseSyncedAt: new Date(), shiftbaseError: null },
    });
  } catch (error) {
    const message = error instanceof ShiftbaseApiError ? error.message : "Onbekende fout bij synchroniseren met Shiftbase.";
    await prisma.timeEntry.update({
      where: { id },
      data: { shiftbaseSyncStatus: "ERROR", shiftbaseError: message },
    });
  }
}

export async function syncPendingTimeEntries(limit = 50) {
  const pending = await prisma.timeEntry.findMany({
    where: { shiftbaseSyncStatus: { in: ["PENDING", "ERROR"] } },
    orderBy: { date: "asc" },
    take: limit,
    select: { id: true },
  });

  for (const entry of pending) {
    await syncTimeEntry(entry.id);
  }

  return pending.length;
}
