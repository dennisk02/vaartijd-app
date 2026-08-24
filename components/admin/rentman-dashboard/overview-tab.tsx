"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/admin/reports/chart-tooltip";
import { dash, statusColor } from "./colors";
import { KpiCard, KpiGrid, Callout, ChartCard } from "./kpi-card";
import { formatEuro, formatMonthLabel } from "./format";
import type { Subproject } from "@/lib/rentman/dashboardAggregate";
import { monthlySeries, openByStatus, overviewKpis, statusByMonth } from "@/lib/rentman/dashboardAggregate";

export function OverviewTab({ subs }: { subs: Subproject[] }) {
  const kpi = overviewKpis(subs);
  const months = monthlySeries(subs);
  const stacked = statusByMonth(subs);
  const open = openByStatus(subs);

  const revenueChartData = months.map((m) => ({ month: formatMonthLabel(m.month), Projectomzet: m.omzet, Gefactureerd: m.gefact }));
  const rateChartData = months.map((m) => ({ month: formatMonthLabel(m.month), pct: m.pct }));
  const stackedChartData = stacked.months.map((month, i) => {
    const row: Record<string, string | number> = { month: formatMonthLabel(month) };
    for (const s of stacked.series) row[s.status] = s.data[i];
    return row;
  });

  return (
    <div className="flex flex-col gap-3.5">
      <KpiGrid>
        <KpiCard label="Projecten" value={String(kpi.totalProjects)} accent={dash.blue} sub={`${months.length} maanden`} />
        <KpiCard label="Totale projectomzet" value={formatEuro(kpi.totalRevenue)} accent={dash.green} sub="Excl. BTW" />
        <KpiCard label="Al gefactureerd" value={formatEuro(kpi.totalInvoiced)} accent={dash.green} sub={`${kpi.invoicedPct}% · excl. BTW`} />
        <KpiCard label="Omzet in optie" value={formatEuro(kpi.optieRevenue)} accent="#3B82F6" valueColor="#3B82F6" sub="Nog te bevestigen" />
        <KpiCard label="Gederfde omzet" value={formatEuro(kpi.cancelledRevenue)} accent={dash.red} valueColor={dash.red} sub={`${kpi.cancelledCount} geannuleerd`} />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[2fr_1fr]">
        <ChartCard title="Projectomzet vs. gefactureerd" sub="Per aanmaakmaand · Excl. BTW">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueChartData}>
              <CartesianGrid vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
                cursor={{ fill: "#F3F4F6" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Projectomzet" fill="rgba(30,64,175,0.15)" stroke={dash.blue} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="Gefactureerd" fill="rgba(0,107,72,0.15)" stroke={dash.green} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Facturatiegraad" sub="% gefactureerd per maand">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rateChartData}>
              <CartesianGrid vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={34} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => `${v}%`} />}
                cursor={{ fill: "#F3F4F6" }}
              />
              <Bar dataKey="pct" name="Facturatiegraad" radius={[6, 6, 0, 0]} maxBarSize={26}>
                {rateChartData.map((d, i) => (
                  <Cell key={i} fill={d.pct >= 70 ? dash.green : d.pct >= 50 ? dash.amber : dash.redDark} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <ChartCard title="Omzet per status per maand" sub="Gestapeld · Excl. BTW">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedChartData}>
              <CartesianGrid vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
                cursor={{ fill: "#F3F4F6" }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stacked.series.map((s) => (
                <Bar key={s.status} dataKey={s.status} stackId="a" fill={statusColor(s.status)} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Open omzet per status" sub="Niet-gefactureerd · Alle maanden">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={open} dataKey="value" nameKey="status" innerRadius={45} outerRadius={78} paddingAngle={1}>
                {open.map((s) => (
                  <Cell key={s.status} fill={statusColor(s.status)} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value, name) => [formatEuro(Number(value ?? 0)), String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Callout tone="warn">
        <b>Let op — aanmaakdatum vs. factuurdatum:</b> dit tabblad groepeert op aanmaakmaand van het project. Gebruik{" "}
        <b>Maandoverleg</b> voor factuurdatum-cijfers ter aansluiting op AFAS.
      </Callout>
    </div>
  );
}
