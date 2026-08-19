"use client";

import { useEffect, useState, useTransition } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getFoodWasteReport } from "@/lib/actions/reports";
import type { ReportPeriod } from "@/lib/reports";
import { Card, Field, Input } from "@/components/ui";
import { PeriodSelect } from "./period-select";
import { ChartTooltip } from "./chart-tooltip";
import { chartColors } from "./palette";

type FoodWasteReport = Awaited<ReturnType<typeof getFoodWasteReport>>;

export function FoodWasteChart() {
  const [period, setPeriod] = useState<ReportPeriod>("LAST_30_DAYS");
  const [report, setReport] = useState<FoodWasteReport | null>(null);
  const [target, setTarget] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getFoodWasteReport(period);
      setReport(result);
    });
  }, [period]);

  const targetValue = target === "" ? null : Number(target);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Voedselverspilling per dag</h2>
          <p className="text-sm text-slate-500">Totaal kg afval, opgeteld per dag.</p>
        </div>
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>

      <div className="h-64 w-full" style={{ opacity: isPending ? 0.5 : 1 }}>
        {report && report.data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.data}>
              <CartesianGrid vertical={false} stroke={chartColors.gridline} />
              <XAxis
                dataKey="date"
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v) => `${v} kg`} />}
                cursor={{ fill: chartColors.gridline, opacity: 0.4 }}
              />
              <Bar dataKey="kg" name="Afval" fill={chartColors.red} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            Geen voedselverspilling geregistreerd in deze periode.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-slate-500">Gewogen gemiddelde (berekend)</p>
          <p className="text-lg font-semibold text-red-800">
            {report ? `${report.weightedAverage.toFixed(0)} gram afval / maaltijd` : "-"}
          </p>
          <p className="text-xs text-slate-400">Totaal kg afval / totaal aantal maaltijden, over de hele periode.</p>
        </div>
        <Field label="Doel (handmatig, gram/maaltijd)" htmlFor="waste-target">
          <Input
            id="waste-target"
            type="number"
            min="0"
            step="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-32"
          />
        </Field>
        {targetValue !== null && report && (
          <p className="text-sm" style={{ color: chartColors.secondaryInk }}>
            {report.weightedAverage <= targetValue
              ? "Binnen doel ✓"
              : `${(report.weightedAverage - targetValue).toFixed(0)} gram boven doel`}
          </p>
        )}
      </div>
    </Card>
  );
}
