import { dash } from "./colors";
import { KpiCard, KpiGrid, Callout } from "./kpi-card";
import { formatDate, formatEuro, formatMonthLabel } from "./format";
import type { Subproject } from "@/lib/rentman/dashboardAggregate";
import { followUpKpis, followUpList } from "@/lib/rentman/dashboardAggregate";

/** Tabblad "Opvolging" -- niet-gefactureerde (bevestigde) projecten, met een
 * best-effort classificatie of de periode al verlopen is. Zie de toelichting
 * in lib/rentman/dashboardAggregate.ts en HANDOVER.md §10.5 voor waarom dit
 * een benadering is i.p.v. een exacte kopie van het referentiedashboard --
 * de "Doorlopend"/creditnota-regels daar waren een eenmalige handmatige
 * analyse die niet uit de Rentman-API zelf af te leiden is. */
export function FollowUpTab({ subs }: { subs: Subproject[] }) {
  const kpi = followUpKpis(subs);
  const list = followUpList(subs);
  const byMonth = new Map<string, typeof list>();
  for (const item of list) {
    const arr = byMonth.get(item.month) ?? [];
    arr.push(item);
    byMonth.set(item.month, arr);
  }
  const months = [...byMonth.keys()].sort();

  return (
    <div className="flex flex-col gap-3.5">
      <KpiGrid>
        <KpiCard label="Direct opvolgen" value={`${kpi.directCount} proj.`} valueColor={dash.red} sub={`${formatEuro(kpi.directRevenue)} open omzet`} tint={dash.redSoft} />
        <KpiCard label="Niet-gefactureerd" value={`${list.length} proj.`} sub="Alle openstaande projecten" />
      </KpiGrid>

      <Callout tone="info">
        ⚠ <b>Aandacht</b> = periode al voorbij, nog niet (volledig) gefactureerd — direct opvolgen &nbsp;·&nbsp; 📅{" "}
        <b>Toekomstig</b> = periode nog in de toekomst. Best-effort classificatie op basis van Rentmans periodevelden; een
        aparte &quot;Doorlopend&quot;-categorie (contracten) en de creditnota-uitsluiting uit het oorspronkelijke voorbeeld zijn met de
        huidige Rentman-velden niet betrouwbaar automatisch te bepalen.
      </Callout>

      <div className="rounded-[10px] border p-4" style={{ background: dash.panel, borderColor: dash.border }}>
        <h2 className="mb-0.5 text-[13px] font-bold" style={{ color: dash.text }}>
          Niet-gefactureerde projecten per maand
        </h2>
        <p className="mb-3 text-[11px]" style={{ color: dash.mutedLight }}>
          Gegroepeerd per aanmaakmaand · Status zichtbaar per project
        </p>
        {months.length === 0 && <p className="text-sm" style={{ color: dash.mutedLight }}>Niets openstaand.</p>}
        <div className="flex flex-col gap-4">
          {months.map((month) => (
            <div key={month}>
              <div className="mb-1.5 text-xs font-bold" style={{ color: dash.text }}>
                {formatMonthLabel(month)}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-[12px]">
                  <thead>
                    <tr>
                      {["", "#", "Project", "Status", "Periode tot", "Open omzet"].map((h, i) => (
                        <th key={i} className="px-2.5 py-1.5 text-[10px] font-semibold uppercase" style={{ background: dash.panel2, color: dash.muted, textAlign: i === 5 ? "right" : "left" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(byMonth.get(month) ?? []).map((p) => (
                      <tr key={p.id} className="border-t" style={{ borderColor: dash.border }}>
                        <td className="px-2.5 py-1.5">
                          {p.flag === "aandacht" ? "⚠" : p.flag === "toekomstig" ? "📅" : ""}
                        </td>
                        <td className="px-2.5 py-1.5" style={{ color: dash.mutedLight }}>{p.projectNumber ?? "-"}</td>
                        <td className="px-2.5 py-1.5" style={{ color: dash.text }}>{p.name}</td>
                        <td className="px-2.5 py-1.5" style={{ color: dash.muted }}>{p.status}</td>
                        <td className="px-2.5 py-1.5 font-semibold" style={{ color: p.flag === "aandacht" ? dash.red : dash.muted }}>
                          {formatDate(p.planperiodEnd)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-semibold" style={{ color: dash.red }}>{formatEuro(p.open)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
