import { prisma } from "@/lib/prisma";
import { isRentmanConfigured } from "@/lib/rentman/client";
import { getRentmanSyncState } from "@/lib/rentman/sync";
import { Card } from "@/components/ui";
import { RentmanControls } from "@/components/admin/rentman-controls";

export default async function AdminRentmanPage() {
  const configured = isRentmanConfigured();

  const [syncState, projects] = await Promise.all([
    getRentmanSyncState(),
    prisma.project.findMany({
      where: { rentmanSubprojectId: { not: null } },
      orderBy: { rentmanStartsAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {!configured && (
        <Card className="border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-800">
            Rentman-koppeling is nog niet geconfigureerd. Vul <code>RENTMAN_API_TOKEN</code> in via de
            omgevingsvariabelen om projecten automatisch uit Rentman in te lezen.
          </p>
        </Card>
      )}

      <Card>
        <p className="mb-2 text-sm text-slate-500">
          Leest subprojecten uit Rentman (alleen lezen) in als projecten in Vaartijd, zodat medewerkers er
          direct uren op kunnen boeken. Alleen projecten met status &quot;Bevestigd&quot;,
          &quot;Klaargezet&quot;, &quot;Op locatie&quot;, &quot;Schoonmaken &amp; nakijken&quot; of
          &quot;Retour ophalen&quot; worden actief getoond; alle overige statussen blijven inactief.
        </p>
        <p className="mb-4 text-xs text-slate-400">
          Laatste synchronisatie:{" "}
          {syncState ? new Date(syncState.updatedAt).toLocaleString("nl-NL") : "nog niet uitgevoerd"}
        </p>
        <RentmanControls />
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-slate-500">Projecten uit Rentman ({projects.length})</h2>
        {projects.length === 0 && <p className="text-sm text-slate-500">Nog geen projecten gesynchroniseerd.</p>}
        {projects.map((project) => (
          <Card key={project.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{project.name}</p>
              <p className="text-sm text-slate-500">
                {project.rentmanProjectNumber ? `${project.rentmanProjectNumber} · ` : ""}
                {project.rentmanProjectName ?? ""}
              </p>
              {project.rentmanStartsAt && (
                <p className="text-xs text-slate-400">
                  {new Date(project.rentmanStartsAt).toLocaleDateString("nl-NL")}
                  {project.rentmanEndsAt ? ` - ${new Date(project.rentmanEndsAt).toLocaleDateString("nl-NL")}` : ""}
                </p>
              )}
            </div>
            <div className="text-right">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  project.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                {project.rentmanStatus ?? (project.active ? "Actief" : "Inactief")}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
