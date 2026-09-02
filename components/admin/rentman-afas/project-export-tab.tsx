"use client";

import { useActionState } from "react";
import { SyncStatusBadge, Button } from "@/components/ui";
import { formatDate } from "@/components/admin/rentman-dashboard/format";
import { toggleProjectAfasExport, sendSelectedProjectsNow } from "@/integrations/actions/rentman-afas";

export type ProjectExportRow = {
  projectId: string;
  name: string;
  rentmanProjectNumber: string | null;
  rentmanStartsAt: string | null;
  rentmanEndsAt: string | null;
  rentmanStatusChangedAt: string | null;
  afasCreateRequestedAt: string | null;
  afasCreateStatus: string;
  afasCreateError: string | null;
};

export function ProjectExportTab({ rows, connectorConfigured }: { rows: ProjectExportRow[]; connectorConfigured: boolean }) {
  const [state, sendAction, pending] = useActionState(sendSelectedProjectsNow, undefined);
  const selectedCount = rows.filter((r) => r.afasCreateRequestedAt).length;

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-sm text-slate-500">
        Projecten die de afgelopen week naar status <b>Bevestigd</b> zijn gegaan, meest recent bovenaan. Vink aan
        welke een project in AFAS nodig hebben.
        {!connectorConfigured && (
          <>
            {" "}
            Er is nog geen geautoriseerde AFAS-connector voor projectaanmaak (<code>AFAS_PROJECT_CONNECTOR</code>,
            zie HANDOVER §10.8) -- de checklist en de verzendknop werken al, maar &quot;Verzenden&quot; zet elk
            geselecteerd project voorlopig op wachtend met een uitlegtekst i.p.v. het echt aan te maken.
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending || selectedCount === 0} onClick={() => sendAction()}>
          {pending ? "Bezig..." : `Verzenden naar AFAS (${selectedCount})`}
        </Button>
        {state?.message && <p className="text-xs text-slate-500">{state.message}</p>}
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Geen projecten de afgelopen week naar Bevestigd gegaan.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-3 py-2">Naar AFAS</th>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Periode</th>
                <th className="px-3 py-2">Bevestigd op</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.projectId} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      defaultChecked={Boolean(r.afasCreateRequestedAt)}
                      onChange={(e) => toggleProjectAfasExport(r.projectId, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600"
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-500">{r.rentmanProjectNumber ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-900">{r.name}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {r.rentmanStartsAt ? `${formatDate(r.rentmanStartsAt)} - ${formatDate(r.rentmanEndsAt)}` : "-"}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{formatDate(r.rentmanStatusChangedAt)}</td>
                  <td className="px-3 py-2">
                    <SyncStatusBadge status={r.afasCreateStatus} />
                    {r.afasCreateError && <div className="mt-1 max-w-xs text-xs text-red-600">{r.afasCreateError}</div>}
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
