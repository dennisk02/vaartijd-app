import { requireAdminScope } from "@/lib/dal";
import { ImportPanel } from "@/components/admin/food-waste/import-panel";
import { LocationSummaryTable } from "@/components/admin/food-waste/location-summary-table";
import { MonthlyTrendChart } from "@/components/admin/food-waste/monthly-trend-chart";
import { DataQualityPanel } from "@/components/admin/food-waste/data-quality-panel";

/**
 * Uitgebreid Voedselverspilling-dashboard (§ n.a.v. River Roots' eigen Food
 * Waste Dashboard, Victor Mshati, sep 2026) -- los van de simpele grafiek op
 * /admin/rapportages, vergelijkbaar qua opzet met Rentman financieel/
 * Rentman -> AFAS. Bevat de Excel-import (zolang niet elke locatie zelf in
 * Vaartijd invoert), het locatie-overzicht met Action/Watch-status, de
 * maandtrend en een data-kwaliteitsscherm met gevlagde rijen.
 */
export default async function AdminVoedselverspillingPage() {
  await requireAdminScope("RAPPORTAGES");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-red-800">Voedselverspilling</h1>
        <p className="text-sm text-slate-500">
          Overzicht per locatie, maandtrend en data-kwaliteit -- op basis van bemanningsregistraties en
          geïmporteerde Excel-exports.
        </p>
      </div>

      <ImportPanel />
      <LocationSummaryTable />
      <MonthlyTrendChart />
      <DataQualityPanel />
    </div>
  );
}
