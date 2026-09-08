"use client";

import { useEffect, useState, useTransition } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getFoodWasteDailyReport } from "@/lib/actions/food-waste-reports";
import { bucketLabel, type ReportPeriod, type Granularity } from "@/lib/reports";
import { Card } from "@/components/ui";
import { PeriodSelect } from "@/components/admin/reports/period-select";
import { ShipSelect } from "@/components/admin/reports/ship-select";
import { GranularitySelect } from "@/components/admin/reports/granularity-select";
import { ChartTooltip } from "@/components/admin/reports/chart-tooltip";
import { DeviationNote } from "@/components/admin/reports/deviation-note";
import { chartColors } from "@/components/admin/reports/palette";

type DailyReport = Awaited<ReturnType<typeof getFoodWasteDailyReport>>;

/** Dagelijkse (of week/maand/kwartaal-)voedselverspilling met afwijkingen
 * t.o.v. de trend -- was voorheen de simpele grafiek op Rapportages, nu
 * hier met dezelfde filters/opzet als de andere rapportages i.p.v. een
 * aparte, minder capabele versie. */
export function DailyWasteChart({ ships }: { ships: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("LAST_30_DAYS");
  const [shipId, setShipId] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setReport(await getFoodWasteDailyReport(period, shipId || null, granularity));
    });
  }, [period, shipId, granularity]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Voedselverspilling over tijd</h2>
          <p className="text-sm text-slate-500">Voedsel gebruikt en operationeel afval.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShipSelect ships={ships} value={shipId} onChange={setShipId} />
          <GranularitySelect value={granularity} onChange={setGranularity} />
          <PeriodSelect value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="h-64 w-full" style={{ opacity: isPending ? 0.5 : 1 }}>
        {report && report.data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.data}>
              <CartesianGrid vertical={false} stroke={chartColors.gridline} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => bucketLabel(v, granularity)}
                tick={{ fontSize: 11, fill: chartColors.mutedInk }}
                axisLine={{ stroke: chartColors.baseline }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                labelFormatter={(v) => bucketLabel(String(v), granularity)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v) => `${v} kg`} />}
                cursor={{ fill: chartColors.gridline, opacity: 0.4 }}
              />
              <Bar dataKey="foodUsedKg" name="Voedsel gebruikt" fill={chartColors.blue} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="operationalWasteKg" name="Operationeel afval" fill={chartColors.red} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            Geen voedselverspilling geregistreerd in deze periode.
          </p>
        )}
      </div>

      {report && (
        <DeviationNote
          items={report.deviations.map((d) => ({ label: bucketLabel(d.date, granularity), actual: d.actual, expected: d.expected }))}
          unit="kg"
        />
      )}
    </Card>
  );
}
