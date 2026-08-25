"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { dash } from "./colors";
import { ChartCard } from "./kpi-card";
import { formatEuro, formatMonthLabel, formatMonthLabelLong } from "./format";

export function MaandoverlegTab({
  invoicedMonthly,
}: {
  invoicedMonthly: { month: string; invoicedExclVat: number }[];
}) {
  const rows = invoicedMonthly.reduce<(typeof invoicedMonthly[number] & { cumulative: number })[]>((acc, row) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
    return [...acc, { ...row, cumulative: previous + row.invoicedExclVat }];
  }, []);
  const total = invoicedMonthly.reduce((sum, r) => sum + r.invoicedExclVat, 0);
  const chartInvoiced = invoicedMonthly.map((r) => ({ month: formatMonthLabel(r.month), "Gefactureerd excl. BTW": Math.round(r.invoicedExclVat) }));

  return (
    <div className="flex flex-col gap-3.5">
      <ChartCard title="Gefactureerd per factuurdatum" sub="Excl. BTW · Op factuurdatum — aansluiting AFAS">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartInvoiced}>
            <CartesianGrid vertical={false} stroke={dash.border} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={{ stroke: dash.border }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
              cursor={{ fill: dash.panel2 }}
            />
            <Bar dataKey="Gefactureerd excl. BTW" fill="rgba(62,207,142,0.2)" stroke={dash.green} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="rounded-[10px] border p-4" style={{ background: dash.panel, borderColor: dash.border }}>
        <h2 className="mb-1 text-[13px] font-bold" style={{ color: dash.text }}>Gefactureerde omzet per factuurdatum — aansluiting AFAS</h2>
        <p className="mb-4 text-[11px]" style={{ color: dash.mutedLight }}>Excl. btw &middot; op factuurdatum -- aansluiting AFAS</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-semibold uppercase" style={{ background: dash.panel2, color: dash.muted }}>Maand</th>
                <th className="p-2 text-right text-xs font-semibold uppercase" style={{ background: dash.panel2, color: dash.muted }}>Gefactureerd excl. btw</th>
                <th className="p-2 text-right text-xs font-semibold uppercase" style={{ background: dash.panel2, color: dash.muted }}>Cumulatief</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-b" style={{ borderColor: dash.border }}>
                  <td className="p-2 font-semibold" style={{ color: dash.text }}>{formatMonthLabelLong(row.month)}</td>
                  <td className="p-2 text-right font-bold" style={{ color: dash.green }}>{formatEuro(row.invoicedExclVat)}</td>
                  <td className="p-2 text-right" style={{ color: dash.text }}>{formatEuro(row.cumulative)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center" style={{ color: dash.muted }}>
                    Nog geen data berekend.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="font-bold" style={{ background: dash.panel2 }}>
                  <td className="border-t-2 p-2" style={{ borderColor: dash.border, color: dash.text }}>Totaal</td>
                  <td className="border-t-2 p-2 text-right" style={{ borderColor: dash.border, color: dash.green }}>{formatEuro(total)}</td>
                  <td className="border-t-2 p-2 text-right" style={{ borderColor: dash.border, color: dash.green }}>{formatEuro(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
