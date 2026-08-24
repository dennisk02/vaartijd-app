"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { ChartTooltip } from "@/components/admin/reports/chart-tooltip";
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
      <ChartCard title="Gefactureerd per factuurdatum" sub="Excl. BTW · Op factuurdatum — aansluiting AFAS" height={220}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartInvoiced}>
            <CartesianGrid vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
              cursor={{ fill: "#F3F4F6" }}
            />
            <Bar dataKey="Gefactureerd excl. BTW" fill="rgba(0,107,72,0.2)" stroke={dash.green} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card>
        <h2 className="mb-1 font-medium text-slate-800">Gefactureerde omzet per factuurdatum — aansluiting AFAS</h2>
        <p className="mb-4 text-sm text-slate-500">Excl. btw &middot; op factuurdatum -- aansluiting AFAS</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-red-700 text-left text-xs text-white">
                <th className="p-2">Maand</th>
                <th className="p-2 text-right">Gefactureerd excl. btw</th>
                <th className="p-2 text-right">Cumulatief</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-b border-slate-100">
                  <td className="p-2 font-semibold">{formatMonthLabelLong(row.month)}</td>
                  <td className="p-2 text-right font-bold text-emerald-700">{formatEuro(row.invoicedExclVat)}</td>
                  <td className="p-2 text-right">{formatEuro(row.cumulative)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-slate-500">
                    Nog geen data berekend.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td className="border-t-2 border-slate-200 p-2">Totaal</td>
                  <td className="border-t-2 border-slate-200 p-2 text-right text-red-700">{formatEuro(total)}</td>
                  <td className="border-t-2 border-slate-200 p-2 text-right text-red-700">{formatEuro(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
