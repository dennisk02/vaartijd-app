import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { HoursReportChart } from "@/components/admin/reports/hours-report-chart";
import { OccupancyReportChart } from "@/components/admin/reports/occupancy-report-chart";
import { MealsServedChart } from "@/components/admin/reports/meals-served-chart";
import { FoodWasteChart } from "@/components/admin/reports/food-waste-chart";

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
          Kies per grafiek een periode. De gestippelde lijn &ldquo;Gewogen gem.&rdquo; is automatisch
          berekend uit de data; &ldquo;Doel&rdquo; is een handmatig in te vullen streefwaarde ter
          vergelijking.
        </p>
      </div>
      <HoursReportChart ships={ships} />
      <OccupancyReportChart />
      <MealsServedChart />
      <FoodWasteChart />
    </div>
  );
}
