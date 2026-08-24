"use client";

import { Bar, BarChart, CartesianGrid, Legend, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { ChartTooltip } from "@/components/admin/reports/chart-tooltip";
import { chartColors } from "@/components/admin/reports/palette";
import { formatEuro, formatMonthLabel } from "./format";

export type MonthPoint = {
  month: string;
  projectCount: number;
  totalRevenue: number;
  totalInvoiced: number;
};

export function OverviewTab({
  points,
  pendingRevenue,
  cancelledRevenue,
  cancelledCount,
}: {
  points: MonthPoint[];
  pendingRevenue: number;
  cancelledRevenue: number;
  cancelledCount: number;
}) {
  const totalProjects = points.reduce((sum, p) => sum + p.projectCount, 0);
  const totalRevenue = points.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalInvoiced = points.reduce((sum, p) => sum + p.totalInvoiced, 0);
  const invoicedPct = totalRevenue > 0 ? Math.round((totalInvoiced / totalRevenue) * 100) : 0;

  const chartData = points.map((p) => ({
    month: formatMonthLabel(p.month),
    Omzet: Math.round(p.totalRevenue),
    Gefactureerd: Math.round(p.totalInvoiced),
    pct: p.totalRevenue > 0 ? Math.round((p.totalInvoiced / p.totalRevenue) * 100) : 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi label="Projecten" value={String(totalProjects)} />
        <Kpi label="Totale projectomzet" value={formatEuro(totalRevenue)} />
        <Kpi label="Al gefactureerd" value={formatEuro(totalInvoiced)} sub={`${invoicedPct}%`} accent="emerald" />
        <Kpi label="Omzet in optie/aanvraag" value={formatEuro(pendingRevenue)} accent="blue" />
        <Kpi label="Gederfde omzet" value={formatEuro(cancelledRevenue)} sub={`${cancelledCount} geannuleerd`} accent="red" />
      </div>

      <Card>
        <h2 className="mb-1 font-medium text-slate-800">Projectomzet vs. gefactureerd per maand</h2>
        <p className="mb-4 text-sm text-slate-500">Op aanmaakmaand van het subproject &middot; excl. btw</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid vertical={false} stroke={chartColors.gridline} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={{ stroke: chartColors.baseline }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => formatEuro(v)} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
                cursor={{ fill: chartColors.gridline, opacity: 0.4 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Omzet" fill={chartColors.blue} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Gefactureerd" fill={chartColors.aqua} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-medium text-slate-800">Facturatiegraad per maand</h2>
        <p className="mb-4 text-sm text-slate-500">% van de projectomzet die al gefactureerd is</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} stroke={chartColors.gridline} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={{ stroke: chartColors.baseline }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => `${v}%`} />}
                cursor={{ fill: chartColors.gridline, opacity: 0.4 }}
              />
              <Bar dataKey="pct" name="Facturatiegraad" fill={chartColors.blue} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "emerald" | "blue" | "red";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-500"
      : accent === "blue"
        ? "border-blue-500"
        : accent === "red"
          ? "border-red-500"
          : "border-slate-300";
  const valueClass = accent === "blue" ? "text-blue-600" : accent === "red" ? "text-red-600" : "text-slate-900";
  return (
    <div className={`rounded-xl border-t-4 bg-white p-3 shadow-sm ${accentClass}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-extrabold ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
