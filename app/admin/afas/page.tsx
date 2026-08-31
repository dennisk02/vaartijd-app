import { prisma } from "@/lib/prisma";
import { isAfasConfigured } from "@/integrations/afas/client";
import { requireAdminScope } from "@/lib/dal";
import { Card, SyncStatusBadge } from "@/components/ui";
import { AfasControls } from "@/components/admin/afas-controls";

export default async function AdminAfasPage() {
  await requireAdminScope("AFAS");
  const configured = isAfasConfigured() && Boolean(process.env.AFAS_HOURS_CONNECTOR);

  // afasSyncStatus staat sinds §10.6 in TimeEntryAfasLink; een ontbrekende
  // link (zou na deze refactor niet meer moeten voorkomen) telt als "Wacht
  // op sync", niet als afwezig.
  const [pending, synced, errored, errorEntries] = await Promise.all([
    prisma.timeEntry.count({ where: { OR: [{ afasLink: null }, { afasLink: { syncStatus: "PENDING" } }] } }),
    prisma.timeEntry.count({ where: { afasLink: { syncStatus: "SYNCED" } } }),
    prisma.timeEntry.count({ where: { afasLink: { syncStatus: "ERROR" } } }),
    prisma.timeEntry.findMany({
      where: { afasLink: { syncStatus: "ERROR" } },
      include: { user: true, project: true, afasLink: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {!configured && (
        <Card className="border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-800">
            AFAS-koppeling is nog niet geconfigureerd. Vul <code>AFAS_ENVIRONMENT_ID</code>,{" "}
            <code>AFAS_OAUTH_CLIENT_ID</code>, <code>AFAS_OAUTH_CLIENT_SECRET</code> en{" "}
            <code>AFAS_HOURS_CONNECTOR</code> in via de omgevingsvariabelen om te synchroniseren. Tot die tijd
            blijven uren op &quot;Wacht op sync&quot; staan.
          </p>
        </Card>
      )}

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
        <AfasControls />
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
                <SyncStatusBadge status={entry.afasLink?.syncStatus ?? "PENDING"} />
              </div>
              {entry.afasLink?.error && <p className="mt-2 text-sm text-red-600">{entry.afasLink.error}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
