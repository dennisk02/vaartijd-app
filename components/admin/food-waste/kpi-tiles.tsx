"use client";

import { useEffect, useState } from "react";
import { getFoodWasteKpis } from "@/lib/actions/food-waste-reports";
import { PeriodSelect } from "@/components/admin/reports/period-select";
import { ShipSelect } from "@/components/admin/reports/ship-select";
import { Card } from "@/components/ui";
import type { ReportPeriod } from "@/lib/reports";

/** KPI-tegels bovenaan, zelfde vier kerncijfers als het "Dashboard"-tabblad
 * van River Roots' brondocument (Victor Mshati, sep 2026). Standaard "Dit
 * jaar" i.p.v. "Afgelopen 30 dagen" -- de hele geïmporteerde geschiedenis
 * beslaat vooralsnog alleen mei t/m augustus 2026, dus een 30-dagen-venster
 * verborg standaard het grootste deel van de data (leek dan alsof mei
 * "ontbrak", terwijl het gewoon buiten het gekozen venster viel). */
export function KpiTiles({ ships }: { ships: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("THIS_YEAR");
  const [shipId, setShipId] = useState("");
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof getFoodWasteKpis>> | null>(null);

  useEffect(() => {
    getFoodWasteKpis(period, shipId || null).then(setKpis);
  }, [period, shipId]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Kerncijfers</h2>
          <p className="text-sm text-slate-500">Samengevat over de gekozen periode.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShipSelect ships={ships} value={shipId} onChange={setShipId} />
          <PeriodSelect value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div>
          <p className="text-2xl font-semibold text-slate-900">{kpis ? kpis.foodUsedKg.toFixed(0) : "-"}</p>
          <p className="text-xs text-slate-500">Voedsel gebruikt (kg)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-900">{kpis ? kpis.operationalWasteKg.toFixed(0) : "-"}</p>
          <p className="text-xs text-slate-500">Operationeel afval (kg)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-red-700">{kpis ? `${kpis.weightedWastePercent.toFixed(1)}%` : "-"}</p>
          <p className="text-xs text-slate-500">Gewogen afval %</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-red-700">{kpis ? kpis.locationsInAction : "-"}</p>
          <p className="text-xs text-slate-500">Locaties in actie ({">"}=10%)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-amber-700">{kpis ? kpis.flaggedRows : "-"}</p>
          <p className="text-xs text-slate-500">Gevlagde rijen</p>
        </div>
      </div>
    </Card>
  );
}
