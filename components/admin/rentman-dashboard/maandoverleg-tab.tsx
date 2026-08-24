"use client";

import { useActionState } from "react";
import { saveManualMonthlyEntry } from "@/lib/actions/rentman-dashboard";
import { Card, Field, Input, Select, TextArea, Button } from "@/components/ui";
import { formatEuro, formatMonthLabel } from "./format";

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

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-1 font-medium text-slate-800">Gefactureerd per factuurdatum</h2>
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
                  <td className="p-2 font-semibold">{formatMonthLabel(row.month)}</td>
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

      <Card>
        <h2 className="mb-1 font-medium text-slate-800">Handmatige maandcijfers per locatie</h2>
        <p className="mb-4 text-sm text-slate-500">
          Deze data komt niet (volledig) uit Rentman -- vul hier zelf de maandelijkse
          reconciliatiecijfers in ter vergelijking met de automatische Rentman-cijfers hierboven.
        </p>
        <ManualEntryForm months={months} />
      </Card>

      {manualEntries.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-xs text-slate-600">
                  <th className="p-2">Maand</th>
                  <th className="p-2">Locatie</th>
                  <th className="p-2 text-right">Omzet</th>
                  <th className="p-2 text-right">Nieuw</th>
                  <th className="p-2 text-right">Optie</th>
                  <th className="p-2 text-right">Bevestigd</th>
                  <th className="p-2 text-right">Geannuleerd</th>
                  <th className="p-2">Notitie</th>
                </tr>
              </thead>
              <tbody>
                {manualEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100">
                    <td className="p-2 font-semibold">{formatMonthLabel(entry.month)}</td>
                    <td className="p-2">{entry.location}</td>
                    <td className="p-2 text-right">{entry.revenueTotal != null ? formatEuro(entry.revenueTotal) : "-"}</td>
                    <td className="p-2 text-right">{entry.newRequests ?? "-"}</td>
                    <td className="p-2 text-right">{entry.inOption ?? "-"}</td>
                    <td className="p-2 text-right">{entry.confirmed ?? "-"}</td>
                    <td className="p-2 text-right">{entry.cancelled ?? "-"}</td>
                    <td className="max-w-[200px] truncate p-2 text-xs text-slate-500">{entry.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
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
