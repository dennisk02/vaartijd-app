import { dash } from "./colors";
import { KpiCard, KpiGrid, Callout } from "./kpi-card";
import { formatDate, formatEuro } from "./format";
import type { Subproject } from "@/lib/rentman/dashboardAggregate";
import { pendingKpis, pendingList } from "@/lib/rentman/dashboardAggregate";

/** Tabblad "In optie & aanvraag" -- alle projecten met status Optie/Aanvraag,
 * oudste eerst. Niet te verwarren met "Opvolging" (follow-up-tab.tsx), dat
 * over niet-gefactureerde bevestigde projecten gaat. */
export function PendingTab({ subs }: { subs: Subproject[] }) {
  const kpi = pendingKpis(subs);
  const list = pendingList(subs);

  return (
    <div className="flex flex-col gap-3.5">
      <KpiGrid>
        <KpiCard label="In optie" value={String(kpi.optieCount)} valueColor={dash.blue} sub={`${formatEuro(kpi.optieRevenue)} projectomzet`} />
        <KpiCard label="Aanvraag" value={String(kpi.aanvraagCount)} valueColor={dash.orange} sub={`${formatEuro(kpi.aanvraagRevenue)} projectomzet`} />
        <KpiCard label="Totale omzet" value={formatEuro(kpi.totalRevenue)} sub="Excl. BTW · Nog te bevestigen" />
        <KpiCard
          label="Oudste open"
          value={kpi.oldest?.projectNumber ?? "-"}
          sub={kpi.oldest ? `${kpi.oldest.name} — ${formatDate(kpi.oldest.createdAt)}` : undefined}
        />
      </KpiGrid>

      <Callout tone="info">
        <b>Wat zie je hier:</b> alle projecten met status <b>In optie</b> of <b>Aanvraag</b>, gesorteerd op aanmaakdatum (oudste
        bovenaan). Rood gemarkeerde periodes zijn al verlopen — deze projecten verdienen extra aandacht. Omzet is de totale
        projectomzet excl. BTW.
      </Callout>

      <div className="rounded-[10px] border p-4" style={{ background: dash.panel, borderColor: dash.border }}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="mb-0.5 text-[13px] font-bold" style={{ color: dash.text }}>
              In optie &amp; aanvragen — oudste eerst
            </h2>
            <p className="text-[11px]" style={{ color: dash.mutedLight }}>
              Rode periode = verlopen · {list.length} projecten totaal
            </p>
          </div>
          <div className="flex gap-1.5">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "rgba(91,141,239,0.15)", color: dash.blue }}>
              ■ In optie
            </span>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "rgba(245,166,35,0.15)", color: dash.orange }}>
              ■ Aanvraag
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12px]">
            <thead>
              <tr>
                {["#", "Project", "Status", "Periode tot", "Omzet"].map((h, i) => (
                  <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase" style={{ background: dash.panel2, color: dash.muted, textAlign: i === 4 ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-sm" style={{ color: dash.mutedLight }}>
                    Niets openstaand.
                  </td>
                </tr>
              )}
              {list.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: dash.border }}>
                  <td className="px-3 py-1.5" style={{ color: dash.mutedLight }}>{p.projectNumber ?? "-"}</td>
                  <td className="px-3 py-1.5" style={{ color: dash.text }}>{p.name}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={
                        p.status === "Optie"
                          ? { background: "rgba(91,141,239,0.15)", color: dash.blue }
                          : { background: "rgba(245,166,35,0.15)", color: dash.orange }
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: p.expired ? dash.red : dash.muted }}>
                    {formatDate(p.planperiodEnd)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold" style={{ color: dash.text }}>{formatEuro(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
