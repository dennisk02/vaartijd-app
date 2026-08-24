"use client";

import { useActionState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { saveManualMonthlyEntry } from "@/lib/actions/rentman-dashboard";
import { Card, Field, Input, Select, TextArea, Button } from "@/components/ui";
import { ChartTooltip } from "@/components/admin/reports/chart-tooltip";
import { dash } from "./colors";
import { Callout, ChartCard } from "./kpi-card";
import { formatEuro, formatMonthLabel, formatMonthLabelLong } from "./format";

type ManualEntry = {
  id: string;
  month: string;
  location: string;
  revenueTotal: number | null;
  deliveryRevenue: number | null;
  pickupRevenue: number | null;
  newRequests: number | null;
  inOption: number | null;
  confirmed: number | null;
  cancelled: number | null;
  note: string | null;
};

const LOCATIONS = ["EVENTO", "M&R Kampen", "M&R Utrecht"];

const INDICATOR_ROWS: { key: keyof ManualEntry; label: string; indent?: boolean; isEuro?: boolean }[] = [
  { key: "revenueTotal", label: "Omzet totaal (Rentman)", isEuro: true },
  { key: "deliveryRevenue", label: "waarvan bezorgen", indent: true, isEuro: true },
  { key: "pickupRevenue", label: "waarvan afhaal", indent: true, isEuro: true },
  { key: "newRequests", label: "Nieuwe aanvragen" },
  { key: "inOption", label: "In optie" },
  { key: "confirmed", label: "Bevestigd" },
  { key: "cancelled", label: "Geannuleerd" },
];

export function MaandoverlegTab({
  invoicedMonthly,
  manualEntries,
  months,
}: {
  invoicedMonthly: { month: string; invoicedExclVat: number }[];
  manualEntries: ManualEntry[];
  months: string[];
}) {
  const rows = invoicedMonthly.reduce<(typeof invoicedMonthly[number] & { cumulative: number })[]>((acc, row) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
    return [...acc, { ...row, cumulative: previous + row.invoicedExclVat }];
  }, []);
  const total = invoicedMonthly.reduce((sum, r) => sum + r.invoicedExclVat, 0);
  const chartInvoiced = invoicedMonthly.map((r) => ({ month: formatMonthLabel(r.month), "Gefactureerd excl. BTW": Math.round(r.invoicedExclVat) }));

  const eventoByMonth = new Map<string, ManualEntry>();
  for (const e of manualEntries) if (e.location === "EVENTO") eventoByMonth.set(e.month, e);
  const chartAanvragen = months.map((m) => {
    const e = eventoByMonth.get(m);
    return { month: formatMonthLabel(m), Nieuw: e?.newRequests ?? 0, "In optie": e?.inOption ?? 0, Bevestigd: e?.confirmed ?? 0, Geannuleerd: e?.cancelled ?? 0 };
  });

  const entriesByMonth = new Map<string, ManualEntry[]>();
  for (const e of manualEntries) {
    const arr = entriesByMonth.get(e.month) ?? [];
    arr.push(e);
    entriesByMonth.set(e.month, arr);
  }
  const monthsWithEntries = [...entriesByMonth.keys()].sort().reverse();

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <ChartCard title="Gefactureerd per factuurdatum" sub="Excl. BTW · Op factuurdatum — aansluiting AFAS" height={200}>
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
        <ChartCard title="EVENTO aanvragen per maand" sub="Nieuw · In optie · Bevestigd · Geannuleerd" height={200}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartAanvragen}>
              <CartesianGrid vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip cursor={{ fill: "#F3F4F6" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Nieuw" fill="#93C5FD" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="In optie" fill="#FCD34D" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Bevestigd" fill={dash.emerald} radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Geannuleerd" fill={dash.red} radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

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

      <Callout tone="warn">
        M&amp;R Kampen en M&amp;R Utrecht worden pas getoond zodra hier handmatig cijfers voor zijn ingevuld.
      </Callout>

      {monthsWithEntries.length > 0 && (
        <div className="flex flex-col gap-4">
          {monthsWithEntries.map((month) => {
            const entries = entriesByMonth.get(month) ?? [];
            return (
              <div key={month}>
                <div className="mb-1.5 text-xs font-bold" style={{ color: "#374151" }}>
                  {formatMonthLabel(month)}
                </div>
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: dash.border }}>
                  <table className="w-full min-w-[480px] border-collapse text-[12px]">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold" style={{ background: dash.blue, color: "#fff" }}>
                          Indicator
                        </th>
                        {LOCATIONS.map((loc) => (
                          <th key={loc} className="px-3 py-2 text-right text-[11px] font-semibold" style={{ background: dash.blue, color: "#fff" }}>
                            {loc}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {INDICATOR_ROWS.map((row) => (
                        <tr key={row.key} className="border-t" style={{ borderColor: "#F3F4F6" }}>
                          <td className={`px-3 py-1.5 ${row.indent ? "pl-6 text-slate-500" : "font-semibold"}`}>{row.label}</td>
                          {LOCATIONS.map((loc) => {
                            const entry = entries.find((e) => e.location === loc);
                            const value = entry?.[row.key];
                            return (
                              <td key={loc} className="px-3 py-1.5 text-right">
                                {value == null ? <span style={{ color: dash.mutedLight }}>-</span> : row.isEuro ? formatEuro(Number(value)) : String(value)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <h2 className="mb-1 font-medium text-slate-800">Handmatige maandcijfers per locatie</h2>
        <p className="mb-4 text-sm text-slate-500">
          Deze data komt niet (volledig) uit Rentman -- vul hier zelf de maandelijkse
          reconciliatiecijfers in ter vergelijking met de automatische Rentman-cijfers hierboven.
        </p>
        <ManualEntryForm months={months} />
      </Card>
    </div>
  );
}

function ManualEntryForm({ months }: { months: string[] }) {
  const [state, action, pending] = useActionState(saveManualMonthlyEntry, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Maand" htmlFor="mo-month">
          <Select id="mo-month" name="month" required defaultValue={months[months.length - 1] ?? ""}>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Locatie" htmlFor="mo-location">
          <Select id="mo-location" name="location" required defaultValue={LOCATIONS[0]}>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Omzet totaal (€)" htmlFor="mo-revenue">
          <Input id="mo-revenue" name="revenueTotal" type="number" step="0.01" />
        </Field>
        <Field label="Waarvan bezorgen (€)" htmlFor="mo-delivery">
          <Input id="mo-delivery" name="deliveryRevenue" type="number" step="0.01" />
        </Field>
        <Field label="Waarvan afhaal (€)" htmlFor="mo-pickup">
          <Input id="mo-pickup" name="pickupRevenue" type="number" step="0.01" />
        </Field>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Nieuwe aanvragen" htmlFor="mo-new">
          <Input id="mo-new" name="newRequests" type="number" />
        </Field>
        <Field label="In optie" htmlFor="mo-option">
          <Input id="mo-option" name="inOption" type="number" />
        </Field>
        <Field label="Bevestigd" htmlFor="mo-confirmed">
          <Input id="mo-confirmed" name="confirmed" type="number" />
        </Field>
        <Field label="Geannuleerd" htmlFor="mo-cancelled">
          <Input id="mo-cancelled" name="cancelled" type="number" />
        </Field>
      </div>
      <Field label="Notitie (optioneel)" htmlFor="mo-note">
        <TextArea id="mo-note" name="note" rows={2} placeholder="bv. verschil met eigen telling, nog niet ingevuld, ..." />
      </Field>
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Bezig..." : "Opslaan"}
      </Button>
    </form>
  );
}
