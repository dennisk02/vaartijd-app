import { prisma } from "@/lib/prisma";
import { isShiftbaseConfigured, isShiftbaseHoursExportEnabled } from "@/integrations/shiftbase/client";
import { requireAdminScope } from "@/lib/dal";
import { Card, SyncStatusBadge } from "@/components/ui";
import { ShiftbaseExplorer } from "@/components/admin/shiftbase-explorer";
import { ShiftbaseHoursControls } from "@/components/admin/shiftbase-hours-controls";
import { ShiftbaseCrewControls } from "@/components/admin/shiftbase-crew-controls";

/** Zit ook, ongewijzigd, als tabblad in /admin/koppelingen (sep 2026,
 * samengevoegde navigatie) -- deze route blijft ook los bereikbaar. */
export async function ShiftbasePageContent() {
  await requireAdminScope("SHIFTBASE");
  const configured = isShiftbaseConfigured();
  const exportEnabled = isShiftbaseHoursExportEnabled();

  // shiftbaseSyncStatus/shiftbaseDepartmentId/shiftbaseEmployeeId staan sinds
  // §10.6 in eigen koppeltabellen.
  const [pending, synced, errored, errorEntries, shipsTotal, shipsActive, crewUsers, crewHours] = await Promise.all([
    prisma.timeEntry.count({ where: { OR: [{ shiftbaseExport: null }, { shiftbaseExport: { syncStatus: "PENDING" } }] } }),
    prisma.timeEntry.count({ where: { shiftbaseExport: { syncStatus: "SYNCED" } } }),
    prisma.timeEntry.count({ where: { shiftbaseExport: { syncStatus: "ERROR" } } }),
    prisma.timeEntry.findMany({
      where: { shiftbaseExport: { syncStatus: "ERROR" } },
      include: { user: true, project: true, shiftbaseExport: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.ship.count({ where: { shiftbaseLink: { isNot: null } } }),
    prisma.ship.count({ where: { shiftbaseLink: { isNot: null }, active: true } }),
    prisma.user.count({ where: { shiftbaseLink: { isNot: null } } }),
    prisma.timeEntry.count({ where: { mode: "SHIFTBASE_IMPORT" } }),
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

      <Card>
        <h2 className="mb-1 text-sm font-medium text-slate-700">Vaarbemanning importeren (River Roots)</h2>
        <p className="mb-4 text-sm text-slate-500">
          Leest schepen (&quot;departments&quot;), medewerkers en goedgekeurde uren (laatste 35 dagen) uit
          Shiftbase in -- alleen lezend, Shiftbase wordt hier nooit beschreven. Elk schip krijgt automatisch
          een bijbehorend &quot;Vaarbemanning ...&quot;-project voor de uren. Nieuw gesyncte
          schepen/projecten komen <strong>inactief</strong> binnen (niet elke Shiftbase-afdeling is een
          echte boot, bv. &quot;Kantoor&quot;) -- activeer de daadwerkelijke schepen zelf via{" "}
          <a href="/admin/ships" className="text-red-700 hover:underline">
            Schepen
          </a>
          .
        </p>
        <div className="mb-4 flex justify-around text-center">
          <div>
            <p className="text-2xl font-semibold text-slate-900">
              {shipsActive}/{shipsTotal}
            </p>
            <p className="text-xs text-slate-500">Schepen actief</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{crewUsers}</p>
            <p className="text-xs text-slate-500">Medewerkers gekoppeld</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{crewHours}</p>
            <p className="text-xs text-slate-500">Uren geimporteerd</p>
          </div>
        </div>
        <ShiftbaseCrewControls />
      </Card>

      <Card className="border-orange-300 bg-orange-50">
        <p className="text-sm text-orange-900">
          ⚠️ De urenexport hieronder gebruikt een <strong>nog niet geverifieerd</strong> endpoint
          (<code>/timesheets</code>) en veldnamen. Gebruik de verkenner onderaan deze pagina om de
          werkelijke Shiftbase-API te bevestigen voordat je hierop vertrouwt -- pas daarna
          <code> integrations/shiftbase/hoursSync.ts</code> aan met de juiste veldnamen.
          {!exportEnabled && " De knop hieronder is daarom voorlopig geblokkeerd."}
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
        <ShiftbaseHoursControls exportEnabled={exportEnabled} />
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
                <SyncStatusBadge status={entry.shiftbaseExport?.syncStatus ?? "PENDING"} />
              </div>
              {entry.shiftbaseExport?.error && <p className="mt-2 text-sm text-red-600">{entry.shiftbaseExport.error}</p>}
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

export default async function AdminShiftbasePage() {
  return <ShiftbasePageContent />;
}
