import { prisma } from "@/lib/prisma";
import { isRentmanConfigured } from "@/integrations/rentman/client";
import { getRentmanSyncState } from "@/integrations/rentman/sync";
import { requireAdminScope } from "@/lib/dal";
import { Card } from "@/components/ui";
import { RentmanControls } from "@/components/admin/rentman-controls";
import { RentmanProjectTable } from "@/components/admin/rentman-project-table";

export default async function AdminRentmanPage() {
  await requireAdminScope("RENTMAN");
  const configured = isRentmanConfigured();

  const [syncState, projects] = await Promise.all([
    getRentmanSyncState(),
    prisma.project.findMany({
      where: { rentmanLink: { isNot: null } },
      orderBy: { rentmanLink: { rentmanStartsAt: "desc" } },
      include: { rentmanLink: true },
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
        {projects.length === 0 ? (
          <p className="text-sm text-slate-500">Nog geen projecten gesynchroniseerd.</p>
        ) : (
          <RentmanProjectTable
            projects={projects.map((p) => ({
              id: p.id,
              name: p.name,
              active: p.active,
              rentmanProjectNumber: p.rentmanLink?.rentmanProjectNumber ?? null,
              rentmanProjectName: p.rentmanLink?.rentmanProjectName ?? null,
              rentmanStatus: p.rentmanLink?.rentmanStatus ?? null,
              rentmanStartsAt: p.rentmanLink?.rentmanStartsAt?.toISOString() ?? null,
              rentmanEndsAt: p.rentmanLink?.rentmanEndsAt?.toISOString() ?? null,
            }))}
          />
        )}
      </div>
    </div>
  );
}
