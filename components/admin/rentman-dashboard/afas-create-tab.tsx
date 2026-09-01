"use client";

import { dash } from "./colors";
import { Callout } from "./kpi-card";
import { formatDate } from "./format";
import { toggleAfasCreateRequested } from "@/integrations/actions/rentman-dashboard";

export type AfasCreateRow = {
  projectId: string;
  name: string;
  rentmanProjectNumber: string | null;
  rentmanStartsAt: string | null;
  rentmanEndsAt: string | null;
  rentmanStatusChangedAt: string | null;
  afasCreateRequestedAt: string | null;
};

/**
 * Overzicht van projecten die recent (laatste maand) naar status "Bevestigd"
 * zijn gegaan en dus een project in AFAS nodig hebben -- meest recent
 * bovenaan. Puur een wachtrij/checklist (§10.4/§17): er is nog geen
 * geautoriseerde AFAS-UpdateConnector voor projectaanmaak, dus "selecteren"
 * hier stuurt niets naar AFAS -- het markeert alleen welke al zijn
 * meegenomen, zodat dat in één keer kan zodra die koppeling er wel is.
 */
export function AfasCreateTab({ rows }: { rows: AfasCreateRow[] }) {
  const selectedCount = rows.filter((r) => r.afasCreateRequestedAt).length;

  return (
    <div className="flex flex-col gap-3.5">
      <Callout tone="info">
        Projecten die de afgelopen maand naar status <b>Bevestigd</b> zijn gegaan, meest recent bovenaan. Er is nog
        geen geautoriseerde AFAS-koppeling om projecten automatisch aan te maken (zie HANDOVER §10.4) — vink hier
        vast aan welke klaar zijn om (handmatig, of straks automatisch) naar AFAS door te zetten.
        {selectedCount > 0 && (
          <>
            {" "}
            <b>{selectedCount}</b> van {rows.length} geselecteerd.
          </>
        )}
      </Callout>

      <div className="rounded-[10px] border p-4" style={{ background: dash.panel, borderColor: dash.border }}>
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: dash.mutedLight }}>
            Geen projecten de afgelopen maand naar Bevestigd gegaan.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12px]">
              <thead>
                <tr>
                  {["", "#", "Project", "Periode", "Bevestigd op"].map((h) => (
                    <th
                      key={h}
                      className="px-2.5 py-1.5 text-[10px] font-semibold uppercase"
                      style={{ background: dash.panel2, color: dash.muted, textAlign: "left" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.projectId} className="border-t" style={{ borderColor: dash.border }}>
                    <td className="px-2.5 py-1.5">
                      <input
                        type="checkbox"
                        defaultChecked={Boolean(r.afasCreateRequestedAt)}
                        onChange={(e) => toggleAfasCreateRequested(r.projectId, e.target.checked)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-2.5 py-1.5" style={{ color: dash.mutedLight }}>{r.rentmanProjectNumber ?? "-"}</td>
                    <td className="px-2.5 py-1.5" style={{ color: dash.text }}>{r.name}</td>
                    <td className="px-2.5 py-1.5" style={{ color: dash.muted }}>
                      {r.rentmanStartsAt ? `${formatDate(r.rentmanStartsAt)} - ${formatDate(r.rentmanEndsAt)}` : "-"}
                    </td>
                    <td className="px-2.5 py-1.5 font-semibold" style={{ color: dash.text }}>
                      {formatDate(r.rentmanStatusChangedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
