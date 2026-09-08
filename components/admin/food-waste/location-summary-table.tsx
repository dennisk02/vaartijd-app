"use client";

import { useEffect, useState, useTransition } from "react";
import { getFoodWasteLocationSummary, type LocationStatus } from "@/lib/actions/food-waste-reports";
import type { ReportPeriod } from "@/lib/reports";
import { Card } from "@/components/ui";
import { PeriodSelect } from "@/components/admin/reports/period-select";

const STATUS_LABEL: Record<LocationStatus, string> = { ACTION: "Actie", WATCH: "Aandacht", NO_DATA: "Geen data" };
const STATUS_STYLE: Record<LocationStatus, string> = {
  ACTION: "bg-red-100 text-red-800",
  WATCH: "bg-amber-100 text-amber-800",
  NO_DATA: "bg-slate-100 text-slate-500",
};

export function LocationSummaryTable() {
  const [period, setPeriod] = useState<ReportPeriod>("LAST_30_DAYS");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getFoodWasteLocationSummary>> | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setRows(await getFoodWasteLocationSummary(period));
    });
  }, [period]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Locatie-overzicht</h2>
          <p className="text-sm text-slate-500">
            Operationele verspilling (passagiers + keuken) t.o.v. gebruikt voedsel, per schip.
          </p>
        </div>
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>

      <div className="overflow-x-auto" style={{ opacity: isPending ? 0.5 : 1 }}>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-3">Schip</th>
              <th className="py-2 pr-3 text-right">Regels</th>
              <th className="py-2 pr-3 text-right">Voedsel gebruikt (kg)</th>
              <th className="py-2 pr-3 text-right">Operationeel afval (kg)</th>
              <th className="py-2 pr-3 text-right">Operationeel afval %</th>
              <th className="py-2 pr-3 text-right">Gevlagd</th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row) => (
              <tr key={row.shipId} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-3 font-medium text-slate-800">{row.shipName}</td>
                <td className="py-2 pr-3 text-right text-slate-600">{row.entries}</td>
                <td className="py-2 pr-3 text-right text-slate-600">{row.foodUsedKg.toFixed(1)}</td>
                <td className="py-2 pr-3 text-right text-slate-600">{row.operationalWasteKg.toFixed(1)}</td>
                <td className="py-2 pr-3 text-right font-medium text-slate-800">
                  {row.entries > 0 ? `${row.operationalWastePercent.toFixed(1)}%` : "-"}
                </td>
                <td className="py-2 pr-3 text-right text-slate-600">{row.flaggedRows || "-"}</td>
                <td className="py-2 text-right">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[row.status]}`}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
              </tr>
            ))}
            {rows && rows.every((r) => r.entries === 0) && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Geen voedselverspilling geregistreerd in deze periode.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
