"use client";

import { useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { dash, statusColor } from "./colors";
import { formatDate, formatEuro, formatMonthLabel } from "./format";
import type { Subproject } from "@/lib/rentman/dashboardAggregate";
import { monthDetail } from "@/lib/rentman/dashboardAggregate";

export function PerMonthTab({ subs, months }: { subs: Subproject[]; months: string[] }) {
  const [active, setActive] = useState(months[0] ?? "");
  if (months.length === 0) {
    return <div className="rounded-[10px] bg-white p-4 text-sm text-slate-500" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>Nog geen data berekend.</div>;
  }
  const detail = monthDetail(subs, active || months[0]);

  return (
    <div className="rounded-[10px] bg-white p-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
      <h2 className="mb-0.5 text-[13px] font-bold" style={{ color: dash.heading }}>
        Projecten per maand — omzet en facturatie per status
      </h2>
      <p className="mb-3.5 text-[11px]" style={{ color: dash.mutedLight }}>
        Alle bedragen excl. BTW · Groen = gefactureerd · Rood = open · % = facturatiegraad
      </p>
      <div className="mb-4 flex flex-wrap gap-1.5">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-2.5" style={{ background: dash.emeraldSoft, borderColor: "#BBF7D0" }}>
              <div className="mb-0.5 text-[10px] font-semibold uppercase" style={{ color: dash.muted }}>
                Projectomzet
              </div>
              <div className="text-lg font-bold">{formatEuro(detail.totalRevenue)}</div>
            </div>
            <div className="rounded-lg border p-2.5" style={{ background: dash.infoBg, borderColor: dash.infoBorder }}>
              <div className="mb-0.5 text-[10px] font-semibold uppercase" style={{ color: dash.muted }}>
                Gefactureerd
              </div>
              <div className="text-lg font-bold" style={{ color: dash.blue }}>
                {formatEuro(detail.totalInvoiced)} <span className="text-[11px] font-normal" style={{ color: dash.muted }}>({detail.invoicedPct}%)</span>
              </div>
            </div>
          </div>

          <div className="mb-2.5 rounded-[10px] border p-3" style={{ borderColor: dash.border }}>
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: dash.muted }}>
              Omzet per status
            </div>
            <div className="flex flex-col gap-2">
              {detail.statusGroups.map((g) => {
                const pct = detail.totalRevenue > 0 ? Math.round((g.revenue / Math.max(...detail.statusGroups.map((x) => x.revenue), 1)) * 100) : 0;
                const gPct = g.revenue > 0 ? Math.round((g.invoiced / g.revenue) * 100) : 0;
                const color = statusColor(g.status);
                return (
                  <div key={g.status}>
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold" style={{ color }}>
                        {g.status} <span className="font-normal" style={{ color: dash.mutedLight }}>({g.count})</span>
                      </span>
                      <span className="text-[11px] font-semibold">{formatEuro(g.revenue)}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "#F3F4F6" }}>
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    {g.revenue > 0 && g.invoiced < g.revenue && (
                      <div className="mt-0.5 text-[10px]" style={{ color: dash.muted }}>
                        Gefactureerd: {formatEuro(g.invoiced)} ({gPct}%)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[10px] border p-3" style={{ borderColor: dash.border }}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: dash.muted }}>
              Verdeling projectomzet
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={detail.donut} dataKey="value" nameKey="status" innerRadius={38} outerRadius={62} paddingAngle={1}>
                    {detail.donut.map((d) => (
                      <Cell key={d.status} fill={statusColor(d.status)} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 9 }} />
                  <Tooltip formatter={(value, name) => [formatEuro(Number(value ?? 0)), String(name)]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {detail.statusGroups.map((g) => {
            const color = statusColor(g.status);
            return (
              <div key={g.status}>
                <div
                  className="flex items-center gap-2 rounded-t-lg border px-2.5 py-1.5"
                  style={{ background: `${color}22`, borderColor: `${color}33` }}
                >
                  <span className="text-xs font-bold" style={{ color }}>
                    {g.status}
                  </span>
                  <span className="text-[11px]" style={{ color: dash.mutedLight }}>
                    {g.count} proj
                  </span>
                  <span className="ml-auto text-[11px] font-semibold">Omzet: {formatEuro(g.revenue)}</span>
                  <span className="text-[11px] font-semibold" style={{ color }}>
                    Gefact: {formatEuro(g.invoiced)}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-b-lg border border-t-0" style={{ borderColor: dash.border }}>
                  <table className="w-full min-w-[520px] border-collapse text-[11px]">
                    <thead>
                      <tr>
                        {["#", "Project", "Periode", "Omzet", "Gefact.", "Open", "%"].map((h, i) => (
                          <th
                            key={h}
                            className="px-2.5 py-1.5 text-[10px] font-semibold uppercase"
                            style={{ background: "#F9FAFB", color: dash.muted, textAlign: i >= 3 ? "right" : "left" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => {
                        const open = r.revenue - r.invoiced;
                        const pct = r.revenue > 0 ? Math.round((r.invoiced / r.revenue) * 100) : 0;
                        return (
                          <tr key={r.id} className="border-t" style={{ borderColor: "#F3F4F6" }}>
                            <td className="px-2.5 py-1" style={{ color: dash.mutedLight }}>{r.number ?? "-"}</td>
                            <td className="px-2.5 py-1">{r.name}</td>
                            <td className="px-2.5 py-1" style={{ color: dash.muted }}>{formatDate(r.period)}</td>
                            <td className="px-2.5 py-1 text-right font-semibold">{formatEuro(r.revenue)}</td>
                            <td className="px-2.5 py-1 text-right font-semibold" style={{ color: dash.emeraldDark }}>{formatEuro(r.invoiced)}</td>
                            <td className="px-2.5 py-1 text-right font-semibold" style={{ color: open > 0.01 ? dash.redDark : dash.mutedLight }}>{formatEuro(open)}</td>
                            <td className="px-2.5 py-1 text-right font-bold" style={{ color: pct >= 70 ? dash.emeraldDark : pct > 0 ? dash.amber : dash.redDark }}>{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
