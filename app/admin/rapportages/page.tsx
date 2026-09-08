import Link from "next/link";
import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { HoursReportChart } from "@/components/admin/reports/hours-report-chart";
import { OccupancyReportChart } from "@/components/admin/reports/occupancy-report-chart";
import { MealsServedChart } from "@/components/admin/reports/meals-served-chart";

export default async function AdminRapportagesPage() {
  await requireAdminScope("RAPPORTAGES");

  const ships = await prisma.ship.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-red-800">Rapportages</h1>
        <p className="text-sm text-slate-500">
          Kies per grafiek een periode, groepering (dag/week/maand/kwartaal) en eventueel een schip. De
          gestippelde lijn is een eenvoudige trendvoorspelling; &ldquo;Gewogen gem.&rdquo; is automatisch
          berekend uit de data en &ldquo;Doel&rdquo; is een handmatig in te vullen streefwaarde ter
          vergelijking. Punten die duidelijk van de trend afwijken staan onder de grafiek genoemd.
        </p>
      </div>
      <HoursReportChart ships={ships} />
      <OccupancyReportChart ships={ships} />
      <MealsServedChart ships={ships} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-800">Voedselverspilling</h2>
            <p className="text-sm text-slate-500">
              Verhuisd naar een eigen, uitgebreider dashboard: locatie-overzicht met Action/Watch-status,
              maandtrend en data-kwaliteit.
            </p>
          </div>
          <Link href="/admin/voedselverspilling" className="whitespace-nowrap text-sm font-medium text-red-700 hover:underline">
            Naar Voedselverspilling →
          </Link>
        </div>
      </Card>
    </div>
  );
}
