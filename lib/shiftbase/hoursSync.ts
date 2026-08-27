import "server-only";
import { prisma } from "@/lib/prisma";
import { shiftbasePost, isShiftbaseConfigured, ShiftbaseApiError } from "@/lib/shiftbase/client";
import type { Prisma } from "@prisma/client";

/// Zie de toelichting bij ENTRY_SELECT in lib/afas/hoursSync.ts -- zelfde
/// reden om een gerichte `select` te gebruiken i.p.v. volledige rijen.
const ENTRY_SELECT = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  user: { select: { shiftbaseLink: { select: { shiftbaseEmployeeId: true } } } },
  project: { select: { name: true } },
} satisfies Prisma.TimeEntrySelect;

type TimeEntryWithRelations = Prisma.TimeEntryGetPayload<{ select: typeof ENTRY_SELECT }>;

/**
 * Bouwt de payload voor de Shiftbase-urenexport.
 *
 * LET OP: dit endpoint en deze veldnamen zijn NIET geverifieerd tegen de
 * echte Shiftbase-API (developer.shiftbase.com) -- ze zijn overgenomen uit
 * een architectuurvoorstel. Gebruik de verkenner op /admin/shiftbase om de
 * werkelijke endpoint-namen/velden te bevestigen voordat je hierop vertrouwt,
 * en pas dan alleen deze functie + het pad in `syncTimeEntry` hieronder aan.
 */
function mapTimeEntryToShiftbase(entry: TimeEntryWithRelations, shiftbaseEmployeeId: string) {
  return {
    employee_id: shiftbaseEmployeeId,
    date: entry.date.toISOString().slice(0, 10),
    start_time: entry.startTime ? entry.startTime.toISOString() : undefined,
    end_time: entry.endTime ? entry.endTime.toISOString() : undefined,
    description: entry.project.name,
  };
}

/// Schrijft naar TimeEntryShiftbaseExport i.p.v. TimeEntry zelf (§10.6).
async function updateShiftbaseExport(
  timeEntryId: string,
  data: { syncStatus: "PENDING" | "SYNCED" | "ERROR"; syncedAt?: Date; error?: string | null }
) {
  await prisma.timeEntryShiftbaseExport.upsert({
    where: { timeEntryId },
    update: data,
    create: { timeEntryId, ...data },
  });
}

export async function syncTimeEntry(id: string) {
  const entry = await prisma.timeEntry.findUnique({ where: { id }, select: ENTRY_SELECT });
  if (!entry) return;

  if (!isShiftbaseConfigured()) {
    await updateShiftbaseExport(id, { syncStatus: "PENDING", error: "Shiftbase-koppeling is nog niet geconfigureerd." });
    return;
  }

  const shiftbaseEmployeeId = entry.user.shiftbaseLink?.shiftbaseEmployeeId;
  if (!shiftbaseEmployeeId) {
    await updateShiftbaseExport(id, { syncStatus: "ERROR", error: "Medewerker heeft geen Shiftbase medewerker-ID." });
    return;
  }

  try {
    const payload = mapTimeEntryToShiftbase(entry, shiftbaseEmployeeId);
    await shiftbasePost("/timesheets", payload);
    await updateShiftbaseExport(id, { syncStatus: "SYNCED", syncedAt: new Date(), error: null });
  } catch (error) {
    const message = error instanceof ShiftbaseApiError ? error.message : "Onbekende fout bij synchroniseren met Shiftbase.";
    await updateShiftbaseExport(id, { syncStatus: "ERROR", error: message });
  }
}

export async function syncPendingTimeEntries(limit = 50) {
  const pending = await prisma.timeEntry.findMany({
    where: { OR: [{ shiftbaseExport: null }, { shiftbaseExport: { syncStatus: { in: ["PENDING", "ERROR"] } } }] },
    orderBy: { date: "asc" },
    take: limit,
    select: { id: true },
  });

  for (const entry of pending) {
    await syncTimeEntry(entry.id);
  }

  return pending.length;
}
