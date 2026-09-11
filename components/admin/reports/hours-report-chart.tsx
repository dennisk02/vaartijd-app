"use client";

import { useEffect, useState, useTransition } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getHoursReport } from "@/lib/actions/reports";
import { bucketLabel, type ReportPeriod, type Granularity } from "@/lib/reports";
import { Card, Field, Input } from "@/components/ui";
import { PeriodSelect } from "./period-select";
import { ShipSelect } from "./ship-select";
import { GranularitySelect } from "./granularity-select";
import { WeekdaySelect } from "./weekday-select";
import { HourCategorySelect, type HourCategory } from "./hour-category-select";
import { ChartTooltip } from "./chart-tooltip";
import { DeviationNote } from "./deviation-note";
import { chartColors } from "./palette";

type HoursReport = Awaited<ReturnType<typeof getHoursReport>>;

/** Uren per dag, uitgesplitst in gewerkt/verlof/ziekte (verlof/ziekte komt
 * uit Shiftbase, zie lib/actions/reports.ts). Verlof/ziekte heeft in
 * Shiftbase geen eigen schip -- bij een schip-filter wordt het per
 * medewerker afgeleide "gebruikelijke schip" gebruikt (roosterhistorie),
 * vandaar de meldingstekst zodra er een schip gekozen is. */
export function HoursReportChart({ ships }: { ships: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("LAST_30_DAYS");
  const [shipId, setShipId] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [weekday, setWeekday] = useState<number | null>(null);
  const [category, setCategory] = useState<HourCategory>("GEWERKT");
  const [report, setReport] = useState<HoursReport | null>(null);
  const [target, setTarget] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getHoursReport(period, shipId || null, granularity, weekday);
      setReport(result);
    });
  }, [period, shipId, granularity, weekday]);

  const targetValue = target === "" ? null : Number(target);
  const showGewerkt = category === "ALLE" || category === "GEWERKT";
  const showVerlof = category === "ALLE" || category === "VERLOF";
  const showZiekte = category === "ALLE" || category === "ZIEKTE";

  const activeAverage =
    category === "VERLOF" ? report?.weightedAverageVerlof : category === "ZIEKTE" ? report?.weightedAverageZiekte : report?.weightedAverage;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Uren per dag</h2>
          <p className="text-sm text-slate-500">Gewerkte uren, verlof en ziekte, opgeteld per dag.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShipSelect ships={ships} value={shipId} onChange={setShipId} />
          <HourCategorySelect value={category} onChange={setCategory} />
          <GranularitySelect value={granularity} onChange={setGranularity} />
          <WeekdaySelect value={weekday} onChange={setWeekday} />
          <PeriodSelect value={period} onChange={setPeriod} />
        </div>
      </div>

      {shipId && (
        <p className="mb-3 text-xs text-slate-500">
          Verlof en ziekte zijn in Shiftbase niet direct aan een schip gekoppeld -- hier toegewezen op basis van
          het schip waarop de medewerker doorgaans staat ingeroosterd, dus een schatting i.p.v. een directe
          koppeling.
        </p>
      )}

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
              {category === "ALLE" && (
                <Legend wrapperStyle={{ fontSize: 12, color: chartColors.secondaryInk }} iconType="line" iconSize={12} />
              )}
              {showGewerkt && <Bar dataKey="gewerkt" name="Gewerkt" fill={chartColors.blue} radius={[4, 4, 0, 0]} maxBarSize={20} />}
              {showVerlof && <Bar dataKey="verlof" name="Verlof" fill={chartColors.aqua} radius={[4, 4, 0, 0]} maxBarSize={20} />}
              {showZiekte && <Bar dataKey="ziekte" name="Ziekte" fill={chartColors.red} radius={[4, 4, 0, 0]} maxBarSize={20} />}
              {activeAverage !== undefined && activeAverage > 0 && (
                <ReferenceLine
                  y={activeAverage}
                  stroke={chartColors.primaryInk}
                  strokeDasharray="4 3"
                  label={{ value: "Gewogen gem.", position: "insideTopRight", fontSize: 11, fill: chartColors.secondaryInk }}
                />
              )}
              {targetValue !== null && targetValue > 0 && (
                <ReferenceLine
                  y={targetValue}
                  stroke={chartColors.mutedInk}
                  strokeDasharray="2 2"
                  label={{ value: "Doel", position: "insideBottomRight", fontSize: 11, fill: chartColors.mutedInk }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            Geen uren geregistreerd in deze periode.
          </p>
        )}
      </div>

      {report && showGewerkt && (
        <DeviationNote
          heading="Gewerkte uren wijken af van de verwachte trend:"
          items={report.deviations.map((d) => ({ label: bucketLabel(d.date, granularity), actual: d.actual, expected: d.expected }))}
          unit="uur"
        />
      )}
      {report && showVerlof && (
        <DeviationNote
          heading="Verlof wijkt af van de verwachte trend:"
          items={report.deviationsVerlof.map((d) => ({ label: bucketLabel(d.date, granularity), actual: d.actual, expected: d.expected }))}
          unit="uur"
        />
      )}
      {report && showZiekte && (
        <DeviationNote
          heading="Ziekte wijkt af van de verwachte trend:"
          items={report.deviationsZiekte.map((d) => ({ label: bucketLabel(d.date, granularity), actual: d.actual, expected: d.expected }))}
          unit="uur"
        />
      )}

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-slate-500">Gewerkt (gewogen gem.)</p>
          <p className="text-lg font-semibold text-red-800">
            {report ? `${report.weightedAverage.toFixed(1)} uur/dag` : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Verlof (gewogen gem.)</p>
          <p className="text-lg font-semibold text-red-800">
            {report ? `${report.weightedAverageVerlof.toFixed(1)} uur/dag` : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Ziekte (gewogen gem.)</p>
          <p className="text-lg font-semibold text-red-800">
            {report ? `${report.weightedAverageZiekte.toFixed(1)} uur/dag` : "-"}
          </p>
        </div>
        <Field label="Doel (handmatig, uur/dag)" htmlFor="hours-target">
          <Input
            id="hours-target"
            type="number"
            min="0"
            step="0.5"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-32"
          />
        </Field>
      </div>
    </Card>
  );
}
