"use client";

import { useEffect, useState, useTransition } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getRosterComparisonReport } from "@/lib/actions/absence-reports";
import { bucketLabel, type ReportPeriod, type Granularity } from "@/lib/reports";
import { Card } from "@/components/ui";
import { PeriodSelect } from "./period-select";
import { ShipSelect } from "./ship-select";
import { GranularitySelect } from "./granularity-select";
import { WeekdaySelect } from "./weekday-select";
import { ChartTooltip } from "./chart-tooltip";
import { DeviationNote } from "./deviation-note";
import { chartColors } from "./palette";

type RosterComparisonReport = Awaited<ReturnType<typeof getRosterComparisonReport>>;

/** Gepland rooster (Shiftbase) versus daadwerkelijk gewerkte uren
 * (TimeEntry), naast elkaar per bucket -- zie lib/actions/absence-reports.ts
 * voor hoe een afwijking hier bepaald wordt (directe vergelijking, geen
 * trendanalyse zoals bij de andere rapportages). */
export function RosterComparisonChart({ ships }: { ships: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("LAST_30_DAYS");
  const [shipId, setShipId] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [weekday, setWeekday] = useState<number | null>(null);
  const [report, setReport] = useState<RosterComparisonReport | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setReport(await getRosterComparisonReport(period, shipId || null, granularity, weekday));
    });
  }, [period, shipId, granularity, weekday]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Rooster vs. werkelijk</h2>
          <p className="text-sm text-slate-500">Gepland rooster (Shiftbase) tegenover daadwerkelijk gewerkte uren.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShipSelect ships={ships} value={shipId} onChange={setShipId} />
          <GranularitySelect value={granularity} onChange={setGranularity} />
          <WeekdaySelect value={weekday} onChange={setWeekday} />
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
              <YAxis
                tick={{ fontSize: 11, fill: chartColors.mutedInk }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                labelFormatter={(v) => bucketLabel(String(v), granularity)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v) => `${v} uur`} />}
                cursor={{ fill: chartColors.gridline, opacity: 0.4 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: chartColors.secondaryInk }} iconType="line" iconSize={12} />
              <Bar dataKey="gepland" name="Gepland" fill={chartColors.mutedInk} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="werkelijk" name="Werkelijk" fill={chartColors.blue} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            Geen rooster of uren geregistreerd in deze periode.
          </p>
        )}
      </div>

      {report && (
        <DeviationNote
          heading="Wijkt af van het geplande rooster:"
          expectedLabel="gepland"
          items={report.deviations.map((d) => ({ label: bucketLabel(d.date, granularity), actual: d.werkelijk, expected: d.gepland }))}
          unit="uur"
        />
      )}

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-slate-500">Totaal gepland</p>
          <p className="text-lg font-semibold text-red-800">{report ? `${report.totalPlanned} uur` : "-"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Totaal werkelijk</p>
          <p className="text-lg font-semibold text-red-800">{report ? `${report.totalWorked} uur` : "-"}</p>
        </div>
      </div>
    </Card>
  );
}
