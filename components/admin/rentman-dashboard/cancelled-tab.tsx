"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/admin/reports/chart-tooltip";
import { dash } from "./colors";
import { KpiCard, KpiGrid, Callout, ChartCard } from "./kpi-card";
import { formatDate, formatEuro, formatMonthLabel } from "./format";
import type { Subproject } from "@/lib/rentman/dashboardAggregate";
import { cancelledByMonth, cancelledInMonth, cancelledKpis } from "@/lib/rentman/dashboardAggregate";

export function CancelledTab({ subs, months }: { subs: Subproject[]; months: string[] }) {
  const [active, setActive] = useState(months[0] ?? "");
  const kpi = cancelledKpis(subs);
  const byMonth = cancelledByMonth(subs);
  const chartRevenue = byMonth.map((m) => ({ month: formatMonthLabel(m.month), "Gederfde omzet": Math.round(m.revenue) }));
  const chartCount = byMonth.map((m) => ({ month: formatMonthLabel(m.month), Aantal: m.count }));
  const rows = cancelledInMonth(subs, active || months[0] || "");

  return (
    <div className="flex flex-col gap-3.5">
      <KpiGrid>
        <KpiCard label="Geannuleerd" value={String(kpi.count)} accent={dash.red} valueColor={dash.red} sub="Jan–aug 2026" />
        <KpiCard label="Gederfde omzet" value={formatEuro(kpi.totalRevenue)} accent={dash.red} valueColor={dash.red} sub="Excl. BTW" />
        <KpiCard
          label="Grootste annulering"
          value={kpi.largest ? formatEuro(kpi.largest.cancelledRevenue ?? 0) : "-"}
          accent={dash.amber}
          valueColor={dash.amber}
          sub={kpi.largest ? `${kpi.largest.projectNumber ?? ""} ${kpi.largest.name}`.trim() : undefined}
        />
        <KpiCard label="Gem. per annulering" value={formatEuro(kpi.avgPerCancellation)} accent={dash.gray} sub={`${kpi.countWithAmount} met offertebedrag`} />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <ChartCard title="Gederfde omzet per maand" sub="Excl. BTW">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRevenue}>
              <CartesianGrid vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
                cursor={{ fill: "#F3F4F6" }}
              />
              <Bar dataKey="Gederfde omzet" fill="rgba(239,68,68,0.2)" stroke={dash.red} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Aantal annuleringen per maand" sub="Inclusief projecten zonder offertebedrag">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartCount}>
              <CartesianGrid vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => `${v} annuleringen`} />}
                cursor={{ fill: "#F3F4F6" }}
              />
              <Bar dataKey="Aantal" fill="rgba(239,68,68,0.15)" stroke={dash.red} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Callout tone="warn">
        <b>Annuleringsreden:</b> niet beschikbaar via de Rentman-API — vereist een custom veld in Rentman.
      </Callout>

      <div className="rounded-[10px] bg-white p-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
        <h2 className="mb-0.5 text-[13px] font-bold" style={{ color: dash.heading }}>
          Geannuleerde projecten per maand
        </h2>
        <p className="mb-3 text-[11px]" style={{ color: dash.mutedLight }}>
          Selecteer een maand · Gesorteerd op gederfde omzet
        </p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {months.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setActive(m)}
              className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
              style={
                (active || months[0]) === m
                  ? { background: dash.blue, borderColor: dash.blue, color: "#fff" }
                  : { background: "#fff", borderColor: dash.border, color: dash.muted }
              }
            >
              {formatMonthLabel(m)}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[12px]">
            <thead>
              <tr>
                {["#", "Project", "Periode", "Offertebedrag"].map((h, i) => (
                  <th key={h} className="px-2.5 py-1.5 text-[10px] font-semibold uppercase" style={{ background: "#F9FAFB", color: dash.muted, textAlign: i >= 3 ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-sm" style={{ color: dash.mutedLight }}>
                    Geen annuleringen deze maand.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "#F3F4F6" }}>
                  <td className="px-2.5 py-1.5" style={{ color: dash.mutedLight }}>{r.number ?? "-"}</td>
                  <td className="px-2.5 py-1.5">{r.name}</td>
                  <td className="px-2.5 py-1.5" style={{ color: dash.muted }}>{formatDate(r.period)}</td>
                  <td className="px-2.5 py-1.5 text-right font-semibold" style={{ color: r.revenue > 0 ? dash.red : dash.mutedLight }}>
                    {r.revenue > 0 ? formatEuro(r.revenue) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
