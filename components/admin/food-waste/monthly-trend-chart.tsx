"use client";

import { useEffect, useState } from "react";
import { Bar, Line, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getFoodWasteMonthlyTrend } from "@/lib/actions/food-waste-reports";
import { ShipSelect } from "@/components/admin/reports/ship-select";
import { DeviationNote } from "@/components/admin/reports/deviation-note";
import { Card } from "@/components/ui";
import { ChartTooltip } from "@/components/admin/reports/chart-tooltip";
import { chartColors } from "@/components/admin/reports/palette";

type MonthlyTrend = Awaited<ReturnType<typeof getFoodWasteMonthlyTrend>>;

export function MonthlyTrendChart({ ships }: { ships: { id: string; name: string }[] }) {
  const [shipId, setShipId] = useState("");
  const [report, setReport] = useState<MonthlyTrend | null>(null);

  useEffect(() => {
    getFoodWasteMonthlyTrend(shipId || null).then(setReport);
  }, [shipId]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Maandtrend</h2>
          <p className="text-sm text-slate-500">Voedsel gebruikt en operationele verspilling per maand.</p>
        </div>
        <ShipSelect ships={ships} value={shipId} onChange={setShipId} />
      </div>

      <div className="h-64 w-full">
        {report && report.data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={report.data}>
              <CartesianGrid vertical={false} stroke={chartColors.gridline} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: chartColors.mutedInk }}
                axisLine={{ stroke: chartColors.baseline }}
                tickLine={false}
              />
              <YAxis yAxisId="kg" tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={false} tickLine={false} width={40} />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tick={{ fontSize: 11, fill: chartColors.mutedInk }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v) => `${v}`} />}
                cursor={{ fill: chartColors.gridline, opacity: 0.4 }}
              />
              <Bar yAxisId="kg" dataKey="foodUsedKg" name="Voedsel gebruikt (kg)" fill={chartColors.blue} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar
                yAxisId="kg"
                dataKey="operationalWasteKg"
                name="Operationeel afval (kg)"
                fill={chartColors.red}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line yAxisId="pct" type="monotone" dataKey="wastePercent" name="Afval %" stroke={chartColors.secondaryInk} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">Nog geen data.</p>
        )}
      </div>

      {report && (
        <DeviationNote items={report.deviations.map((d) => ({ label: d.month, actual: d.actual, expected: d.expected }))} unit="kg" />
      )}
    </Card>
  );
}
