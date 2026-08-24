"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { ChartTooltip } from "@/components/admin/reports/chart-tooltip";
import { chartColors } from "@/components/admin/reports/palette";
import { formatEuro, formatMonthLabel } from "./format";

export function CancelledTab({
  points,
}: {
  points: {
    month: string;
    cancelledCount: number;
    cancelledRevenue: number;
    topCancelledName: string | null;
    topCancelledNumber: string | null;
    topCancelledAmount: number | null;
  }[];
}) {
  const totalCount = points.reduce((sum, p) => sum + p.cancelledCount, 0);
  const totalRevenue = points.reduce((sum, p) => sum + p.cancelledRevenue, 0);
  const avg = totalCount > 0 ? totalRevenue / totalCount : 0;

  let top: (typeof points)[number] | null = null;
  for (const p of points) {
    if (p.topCancelledAmount != null && (!top || (top.topCancelledAmount ?? 0) < p.topCancelledAmount)) {
      top = p;
    }
  }

  const chartData = points.map((p) => ({
    month: formatMonthLabel(p.month),
    "Gederfde omzet": Math.round(p.cancelledRevenue),
    Aantal: p.cancelledCount,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border-t-4 border-red-500 bg-white p-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Geannuleerd</div>
          <div className="text-lg font-extrabold text-red-600">{totalCount}</div>
        </div>
        <div className="rounded-xl border-t-4 border-red-500 bg-white p-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Gederfde omzet</div>
          <div className="text-lg font-extrabold text-red-600">{formatEuro(totalRevenue)}</div>
        </div>
        <div className="rounded-xl border-t-4 border-amber-500 bg-white p-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Grootste annulering</div>
          <div className="text-lg font-extrabold text-amber-600">{top ? formatEuro(top.topCancelledAmount ?? 0) : "-"}</div>
          {top && (
            <div className="truncate text-xs text-slate-400">
              {top.topCancelledNumber ? `${top.topCancelledNumber} · ` : ""}
              {top.topCancelledName}
            </div>
          )}
        </div>
        <div className="rounded-xl border-t-4 border-slate-300 bg-white p-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Gem. per annulering</div>
          <div className="text-lg font-extrabold text-slate-900">{formatEuro(avg)}</div>
        </div>
      </div>

      <Card>
        <h2 className="mb-1 font-medium text-slate-800">Gederfde omzet per maand</h2>
        <p className="mb-4 text-sm text-slate-500">Excl. btw</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} stroke={chartColors.gridline} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={{ stroke: chartColors.baseline }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartColors.mutedInk }} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => formatEuro(v)} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
                cursor={{ fill: chartColors.gridline, opacity: 0.4 }}
              />
              <Bar dataKey="Gederfde omzet" fill={chartColors.red} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
