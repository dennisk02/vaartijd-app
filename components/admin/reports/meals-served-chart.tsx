"use client";

import { useEffect, useState, useTransition } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMealsServedReport } from "@/lib/actions/reports";
import { bucketLabel, type ReportPeriod, type Granularity } from "@/lib/reports";
import { Card, Field, Input } from "@/components/ui";
import { PeriodSelect } from "./period-select";
import { ShipSelect } from "./ship-select";
import { GranularitySelect } from "./granularity-select";
import { ChartTooltip } from "./chart-tooltip";
import { DeviationNote } from "./deviation-note";
import { chartColors } from "./palette";

type MealsServedReport = Awaited<ReturnType<typeof getMealsServedReport>>;

export function MealsServedChart({ ships }: { ships: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("LAST_30_DAYS");
  const [shipId, setShipId] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [report, setReport] = useState<MealsServedReport | null>(null);
  const [target, setTarget] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getMealsServedReport(period, shipId || null, granularity);
      setReport(result);
    });
  }, [period, shipId, granularity]);

  const targetValue = target === "" ? null : Number(target);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Maaltijden geserveerd per dag</h2>
          <p className="text-sm text-slate-500">Totaal aantal geserveerde maaltijden, opgeteld per dag.</p>
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
              <YAxis
                tick={{ fontSize: 11, fill: chartColors.mutedInk }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                labelFormatter={(v) => bucketLabel(String(v), granularity)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v) => `${v} maaltijden`} />}
                cursor={{ fill: chartColors.gridline, opacity: 0.4 }}
              />
              <Bar dataKey="count" name="Maaltijden" fill={chartColors.blue} radius={[4, 4, 0, 0]} maxBarSize={24} />
              {report.weightedAverage > 0 && (
                <ReferenceLine
                  y={report.weightedAverage}
                  stroke={chartColors.blue}
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
            Geen maaltijden geregistreerd in deze periode.
          </p>
        )}
      </div>

      {report && (
        <DeviationNote
          items={report.deviations.map((d) => ({ label: bucketLabel(d.date, granularity), actual: d.actual, expected: d.expected }))}
          unit="maaltijden"
        />
      )}

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-slate-500">Gewogen gemiddelde (berekend)</p>
          <p className="text-lg font-semibold text-red-800">
            {report ? `${report.weightedAverage.toFixed(1)} maaltijden/dag` : "-"}
          </p>
        </div>
        <Field label="Doel (handmatig, maaltijden/dag)" htmlFor="meals-target">
          <Input
            id="meals-target"
            type="number"
            min="0"
            step="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-32"
          />
        </Field>
      </div>
    </Card>
  );
}
