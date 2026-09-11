"use client";

import { useEffect, useState, useTransition } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAbsenceReport } from "@/lib/actions/absence-reports";
import { bucketLabel, type ReportPeriod, type Granularity } from "@/lib/reports";
import { Card } from "@/components/ui";
import { PeriodSelect } from "./period-select";
import { GranularitySelect } from "./granularity-select";
import { WeekdaySelect } from "./weekday-select";
import { ChartTooltip } from "./chart-tooltip";
import { chartColors } from "./palette";

type AbsenceReport = Awaited<ReturnType<typeof getAbsenceReport>>;

/** Ziekte- en verlofuren uit Shiftbase, naast elkaar per bucket -- geen
 * schip-filter, Shiftbase's afwezigheidsregistratie is niet aan een
 * afdeling/schip gebonden (zie lib/actions/absence-reports.ts). */
export function AbsenceReportChart() {
  const [period, setPeriod] = useState<ReportPeriod>("LAST_30_DAYS");
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [weekday, setWeekday] = useState<number | null>(null);
  const [report, setReport] = useState<AbsenceReport | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setReport(await getAbsenceReport(period, granularity, weekday));
    });
  }, [period, granularity, weekday]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Ziekte & verlof</h2>
          <p className="text-sm text-slate-500">Uren ziekmelding en verlof/vakantie uit Shiftbase, opgeteld per dag.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              <Bar dataKey="ziekte" name="Ziekte" fill={chartColors.red} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="verlof" name="Verlof" fill={chartColors.blue} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            Geen ziekte- of verlofuren geregistreerd in deze periode.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-slate-500">Totaal ziekte</p>
          <p className="text-lg font-semibold text-red-800">{report ? `${report.totalSickHours} uur` : "-"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Totaal verlof</p>
          <p className="text-lg font-semibold text-red-800">{report ? `${report.totalLeaveHours} uur` : "-"}</p>
        </div>
      </div>
    </Card>
  );
}
