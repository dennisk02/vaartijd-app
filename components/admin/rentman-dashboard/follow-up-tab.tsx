"use client";

import { useState } from "react";
import { dash } from "./colors";
import { KpiCard, KpiGrid, Callout } from "./kpi-card";
import { formatDate, formatEuro, formatMonthLabel } from "./format";
import type { FollowUpRow, Subproject } from "@/lib/rentman/dashboardAggregate";
import { followUpByMonth, followUpKpis } from "@/lib/rentman/dashboardAggregate";

const SECTIONS: { key: "aandacht" | "toekomstig" | "doorlopend"; label: string }[] = [
  { key: "aandacht", label: "🔴 Direct opvolgen (verlopen periode)" },
  { key: "toekomstig", label: "🟡 Toekomstig" },
  { key: "doorlopend", label: "🔵 Doorlopend" },
];

/** Tabblad "Opvolging" -- exact overgenomen van het referentiedashboard
 * (v6.1): filter/classificatieregels staan toegelicht in
 * lib/rentman/dashboardAggregate.ts. */
export function FollowUpTab({ subs }: { subs: Subproject[] }) {
  const kpi = followUpKpis(subs);
  const { months, data } = followUpByMonth(subs);
  const [active, setActive] = useState(months[0] ?? "");
  const month = active || months[0] || "";
  const monthData = data[month];

  return (
    <div className="flex flex-col gap-3.5">
      <KpiGrid>
        <KpiCard label="Direct opvolgen" value={String(kpi.aandachtCount)} valueColor={dash.red} tint={dash.redSoft} />
        <KpiCard label="Toekomstig" value={String(kpi.toekomstigCount)} valueColor={dash.orange} />
        <KpiCard label="Doorlopend" value={String(kpi.doorlopendCount)} valueColor={dash.blue} />
      </KpiGrid>

      <div className="rounded-[10px] border p-4" style={{ background: dash.panel, borderColor: dash.border }}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {months.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setActive(m)}
              className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
              style={
                month === m
                  ? { background: dash.blue, borderColor: dash.blue, color: "#fff" }
                  : { background: dash.panel2, borderColor: dash.border, color: dash.muted }
              }
            >
              {formatMonthLabel(m)}
            </button>
          ))}
        </div>

        {monthData && SECTIONS.every((sec) => monthData[sec.key].length === 0) && (
          <p className="text-sm" style={{ color: dash.mutedLight }}>Geen openstaande projecten deze maand.</p>
        )}

        <div className="flex flex-col gap-4">
          {monthData &&
            SECTIONS.map((sec) => {
              const rows = monthData[sec.key];
              if (rows.length === 0) return null;
              return (
                <div key={sec.key}>
                  <div className="mb-1.5 text-xs font-bold" style={{ color: dash.text }}>
                    {sec.label} ({rows.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-[12px]">
                      <thead>
                        <tr>
                          {["#", "Project", "Locatie", "Open bedrag", "Periode"].map((h, i) => (
                            <th
                              key={h}
                              className="px-2.5 py-1.5 text-[10px] font-semibold uppercase"
                              style={{ background: dash.panel2, color: dash.muted, textAlign: i === 3 ? "right" : "left" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r: FollowUpRow) => (
                          <tr key={r.id} className="border-t" style={{ borderColor: dash.border }}>
                            <td className="px-2.5 py-1.5" style={{ color: dash.mutedLight }}>{r.number ?? "-"}</td>
                            <td className="px-2.5 py-1.5" style={{ color: dash.text }}>{r.name}</td>
                            <td className="px-2.5 py-1.5" style={{ color: dash.muted }}>{r.city ? `📍 ${r.city}` : "-"}</td>
                            <td className="px-2.5 py-1.5 text-right font-semibold" style={{ color: dash.red }}>{formatEuro(r.open)}</td>
                            <td className="px-2.5 py-1.5 font-semibold" style={{ color: r.expired ? dash.red : dash.muted }}>
                              {formatDate(r.period)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <Callout tone="info">
        <b>Filter:</b> projecten met openstaand bedrag (omzet &gt; 0, omzet − gefactureerd &gt; 1, gefactureerd ≥ −0,01),
        ongeacht status. 🔵 <b>Doorlopend</b> = naam bevat &quot;wekelijkse&quot;. 🔴 <b>Direct opvolgen</b> = periode
        verlopen. 🟡 <b>Toekomstig</b> = periode nog niet verlopen of onbekend. Gesorteerd op hoogste openstaand bedrag.
      </Callout>
    </div>
  );
}
