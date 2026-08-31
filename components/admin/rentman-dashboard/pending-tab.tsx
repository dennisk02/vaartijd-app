"use client";

import { useState } from "react";
import { dash } from "./colors";
import { KpiCard, KpiGrid } from "./kpi-card";
import { formatDate, formatEuro, formatMonthLabel } from "./format";
import type { PendingRow, Subproject } from "@/integrations/rentman/dashboardAggregate";
import { pendingByMonth, pendingKpis } from "@/integrations/rentman/dashboardAggregate";

function PendingColumn({
  title,
  color,
  months,
  data,
}: {
  title: string;
  color: string;
  months: string[];
  data: Record<string, PendingRow[]>;
}) {
  const [active, setActive] = useState(months[0] ?? "");
  const month = active || months[0] || "";
  const rows = data[month] ?? [];

  return (
    <div className="rounded-[10px] border p-4" style={{ background: dash.panel, borderColor: dash.border }}>
      <h2 className="mb-3 text-[13px] font-bold" style={{ color }}>
        {title}
      </h2>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {months.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setActive(m)}
            className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
            style={
              month === m
                ? { background: color, borderColor: color, color: "#fff" }
                : { background: dash.panel2, borderColor: dash.border, color: dash.muted }
            }
          >
            {formatMonthLabel(m)} ({(data[m] ?? []).length})
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: dash.mutedLight }}>Geen projecten deze maand.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12px]">
            <thead>
              <tr>
                {["#", "Project", "Locatie", "BV", "Omzet", "Periode"].map((h, i) => (
                  <th
                    key={h}
                    className="px-2.5 py-1.5 text-[10px] font-semibold uppercase"
                    style={{ background: dash.panel2, color: dash.muted, textAlign: i === 4 ? "right" : "left" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: dash.border }}>
                  <td className="px-2.5 py-1.5" style={{ color: dash.mutedLight }}>{r.number ?? "-"}</td>
                  <td className="px-2.5 py-1.5" style={{ color: dash.text }}>{r.name}</td>
                  <td className="px-2.5 py-1.5" style={{ color: dash.muted }}>{r.city ? `📍 ${r.city}` : "-"}</td>
                  <td className="px-2.5 py-1.5" style={{ color: dash.muted }}>{r.businessUnit}</td>
                  <td className="px-2.5 py-1.5 text-right font-semibold" style={{ color: dash.text }}>{formatEuro(r.revenue)}</td>
                  <td className="px-2.5 py-1.5 font-semibold" style={{ color: r.expired ? dash.red : dash.muted }}>
                    {formatDate(r.period)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Tabblad "In optie & aanvraag" -- alle projecten met status Optie/Aanvraag,
 * per aanmaakmaand in twee parallelle kolommen (net als het referentiedashboard,
 * v6.1). Niet te verwarren met "Opvolging" (follow-up-tab.tsx), dat over
 * niet-gefactureerde bevestigde projecten gaat. */
export function PendingTab({ subs }: { subs: Subproject[] }) {
  const kpi = pendingKpis(subs);
  const { months, optie, aanvraag } = pendingByMonth(subs);

  return (
    <div className="flex flex-col gap-3.5">
      <KpiGrid>
        <KpiCard label="In optie" value={String(kpi.optieCount)} valueColor={dash.blue} />
        <KpiCard label="Aanvraag" value={String(kpi.aanvraagCount)} valueColor={dash.orange} />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <PendingColumn title="In optie" color={dash.blue} months={months} data={optie} />
        <PendingColumn title="Aanvraag" color={dash.orange} months={months} data={aanvraag} />
      </div>
    </div>
  );
}
