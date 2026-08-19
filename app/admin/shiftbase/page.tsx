import { prisma } from "@/lib/prisma";
import { isShiftbaseConfigured } from "@/lib/shiftbase/client";
import { Card, SyncStatusBadge } from "@/components/ui";
import { ShiftbaseExplorer } from "@/components/admin/shiftbase-explorer";
import { ShiftbaseHoursControls } from "@/components/admin/shiftbase-hours-controls";

export default async function AdminShiftbasePage() {
  const configured = isShiftbaseConfigured();

  const [pending, synced, errored, errorEntries] = await Promise.all([
    prisma.timeEntry.count({ where: { shiftbaseSyncStatus: "PENDING" } }),
    prisma.timeEntry.count({ where: { shiftbaseSyncStatus: "SYNCED" } }),
    prisma.timeEntry.count({ where: { shiftbaseSyncStatus: "ERROR" } }),
    prisma.timeEntry.findMany({
      where: { shiftbaseSyncStatus: "ERROR" },
      include: { user: true, project: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {!configured && (
        <Card className="border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-800">
            Shiftbase-koppeling is nog niet geconfigureerd. Vul <code>SHIFTBASE_API_KEY</code> in via de
            omgevingsvariabelen.
          </p>
        </Card>
      )}

      <Card className="border-orange-300 bg-orange-50">
        <p className="text-sm text-orange-900">
          ⚠️ De urenexport hieronder gebruikt een <strong>nog niet geverifieerd</strong> endpoint
          (<code>/timesheets</code>) en veldnamen. Gebruik de verkenner onderaan deze pagina om de
          werkelijke Shiftbase-API te bevestigen voordat je hierop vertrouwt -- pas daarna
          <code> lib/shiftbase/hoursSync.ts</code> aan met de juiste veldnamen.
        </p>
      </Card>

      <Card>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-semibold text-amber-700">{pending}</p>
            <p className="text-xs text-slate-500">Wacht op sync</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-emerald-700">{synced}</p>
            <p className="text-xs text-slate-500">Gesynchroniseerd</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-red-700">{errored}</p>
            <p className="text-xs text-slate-500">Fout</p>
          </div>
        </div>
      </Card>

      <Card>
        <ShiftbaseHoursControls />
      </Card>

      {errorEntries.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-slate-500">Regels met een fout</h2>
          {errorEntries.map((entry) => (
            <Card key={entry.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {entry.user.name} · {entry.project.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {entry.date.toISOString().slice(0, 10)} · {Number(entry.hours)} uur
                  </p>
                </div>
                <SyncStatusBadge status={entry.shiftbaseSyncStatus} />
              </div>
              {entry.shiftbaseError && <p className="mt-2 text-sm text-red-600">{entry.shiftbaseError}</p>}
            </Card>
          ))}
        </div>
      )}

      <Card>
        <p className="mb-4 text-sm text-slate-500">
          Verkenner om ruwe data uit Shiftbase te bekijken (alleen lezen). Gebruik dit om te bepalen welk
          veld (bv. team of afdeling) het beste als koppeling naar een project in Vaartijd kan dienen, en om
          het juiste endpoint voor de urenexport hierboven te bevestigen.
        </p>
        <ShiftbaseExplorer />
      </Card>
    </div>
  );
}
