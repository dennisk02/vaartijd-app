"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getFoodWasteMealAnalysis } from "@/lib/actions/food-waste-reports";
import { PeriodSelect } from "@/components/admin/reports/period-select";
import { ShipSelect } from "@/components/admin/reports/ship-select";
import { ChartTooltip } from "@/components/admin/reports/chart-tooltip";
import { chartColors } from "@/components/admin/reports/palette";
import { Card } from "@/components/ui";
import type { ReportPeriod } from "@/lib/reports";

/** Uitsplitsing per maaltijdtype -- welke maaltijd de meeste verspilling
 * veroorzaakt, zelfde vraag als Victor's "Meal Analysis"-tabblad. Standaard
 * "Dit jaar" i.p.v. "Afgelopen 30 dagen" -- zie toelichting bij KpiTiles. */
export function MealAnalysisChart({ ships }: { ships: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("THIS_YEAR");
  const [shipId, setShipId] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getFoodWasteMealAnalysis>> | null>(null);

  useEffect(() => {
    getFoodWasteMealAnalysis(period, shipId || null).then(setRows);
  }, [period, shipId]);

  const highestWaste = rows && rows.some((r) => r.entries > 0) ? rows.reduce((a, b) => (b.wastePercent > a.wastePercent ? b : a)) : null;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Maaltijdanalyse</h2>
          <p className="text-sm text-slate-500">Welke maaltijd veroorzaakt de meeste verspilling.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShipSelect ships={ships} value={shipId} onChange={setShipId} />
          <PeriodSelect value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="h-56 w-full">
        {rows && rows.some((r) => r.entries > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid vertical={false} stroke={chartColors.gridline} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={{ stroke: chartColors.baseline }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v) => `${v}%`} />}
                cursor={{ fill: chartColors.gridline, opacity: 0.4 }}
              />
              <Bar dataKey="wastePercent" name="Afval %" fill={chartColors.red} radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">Geen data in deze periode.</p>
        )}
      </div>

      {highestWaste && (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-medium text-red-700">{highestWaste.label}</span> heeft het hoogste afvalpercentage
          ({highestWaste.wastePercent.toFixed(1)}%, {highestWaste.operationalWasteKg.toFixed(1)} kg over{" "}
          {highestWaste.entries} regels).
        </p>
      )}
    </Card>
  );
}
