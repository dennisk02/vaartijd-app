import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ImportPanel } from "@/components/admin/food-waste/import-panel";
import { KpiTiles } from "@/components/admin/food-waste/kpi-tiles";
import { DailyWasteChart } from "@/components/admin/food-waste/daily-waste-chart";
import { LocationSummaryTable } from "@/components/admin/food-waste/location-summary-table";
import { MonthlyTrendChart } from "@/components/admin/food-waste/monthly-trend-chart";
import { MealAnalysisChart } from "@/components/admin/food-waste/meal-analysis-chart";
import { DataQualityPanel } from "@/components/admin/food-waste/data-quality-panel";

/**
 * Uitgebreid Voedselverspilling-dashboard (§ n.a.v. River Roots' eigen Food
 * Waste Dashboard, Victor Mshati, sep 2026) -- bouwt de 6 tabbladen van dat
 * brondocument na: Dashboard (KpiTiles + DailyWasteChart), Location Summary
 * (LocationSummaryTable), Monthly Trend (MonthlyTrendChart), Meal Analysis
 * (MealAnalysisChart), Data Quality & Actions (DataQualityPanel), en Raw
 * Data (de Excel-import zelf, ImportPanel). Elk onderdeel heeft een eigen
 * periode-/schip-filter (en waar relevant een dag/week/maand/kwartaal-
 * groepering), zelfde patroon als /admin/rapportages.
 */
export default async function AdminVoedselverspillingPage() {
  await requireAdminScope("RAPPORTAGES");

  const ships = await prisma.ship.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-red-800">Voedselverspilling</h1>
        <p className="text-sm text-slate-500">
          Kerncijfers, trends en data-kwaliteit -- op basis van bemanningsregistraties en geïmporteerde
          Excel-exports. Kies per onderdeel een periode, schip en (waar van toepassing) groepering.
        </p>
      </div>

      <ImportPanel />
      <KpiTiles ships={ships} />
      <DailyWasteChart ships={ships} />
      <LocationSummaryTable ships={ships} />
      <MonthlyTrendChart ships={ships} />
      <MealAnalysisChart ships={ships} />
      <DataQualityPanel />
    </div>
  );
}
