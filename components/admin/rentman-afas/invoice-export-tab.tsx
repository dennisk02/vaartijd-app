"use client";

import { useActionState } from "react";
import { SyncStatusBadge, Button } from "@/components/ui";
import { formatDate, formatEuro } from "@/components/admin/rentman-dashboard/format";
import { toggleInvoiceAfasExport, sendSelectedInvoicesNow, syncRentmanInvoicesNow } from "@/integrations/actions/rentman-afas";

export type InvoiceExportRow = {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  amountExclVat: number | null;
  rentmanProjectNumber: string | null;
  projectName: string | null;
  customerName: string | null;
  pdfFileId: string | null;
  afasCreateRequestedAt: string | null;
  afasCreateStatus: string;
  afasCreateError: string | null;
};

export function InvoiceExportTab({ rows, connectorConfigured }: { rows: InvoiceExportRow[]; connectorConfigured: boolean }) {
  const [sendState, sendAction, sendPending] = useActionState(sendSelectedInvoicesNow, undefined);
  const [syncState, syncAction, syncPending] = useActionState(syncRentmanInvoicesNow, undefined);
  const selectedCount = rows.filter((r) => r.afasCreateRequestedAt).length;

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-sm text-slate-500">
        Verkoopfacturen van de afgelopen week, meest recent bovenaan. Vink aan welke als verkoopboeking (met PDF)
        naar AFAS moeten.
        {!connectorConfigured && (
          <>
            {" "}
            Er is nog geen geautoriseerde AFAS-connector voor verkoopboekingen (<code>AFAS_INVOICE_CONNECTOR</code>,
            zie HANDOVER §10.8) -- checklist, PDF-koppeling en verzendknop werken al, &quot;Verzenden&quot; zet
            elke geselecteerde factuur voorlopig op wachtend met een uitlegtekst.
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" disabled={syncPending} onClick={() => syncAction()}>
          {syncPending ? "Bezig..." : "Facturen nu bijwerken"}
        </Button>
        <Button type="button" disabled={sendPending || selectedCount === 0} onClick={() => sendAction()}>
          {sendPending ? "Bezig..." : `Verzenden naar AFAS (${selectedCount})`}
        </Button>
        {(syncState?.message || sendState?.message) && (
          <p className="text-xs text-slate-500">{syncState?.message ?? sendState?.message}</p>
        )}
        {(syncState?.error || sendState?.error) && (
          <p className="text-xs text-red-600">{syncState?.error ?? sendState?.error}</p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Geen facturen in de afgelopen week.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-3 py-2">Naar AFAS</th>
                <th className="px-3 py-2">Factuur</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Klant</th>
                <th className="px-3 py-2">Bedrag excl. btw</th>
                <th className="px-3 py-2">PDF</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      defaultChecked={Boolean(r.afasCreateRequestedAt)}
                      onChange={(e) => toggleInvoiceAfasExport(r.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{r.invoiceNumber ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(r.invoiceDate)}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {r.rentmanProjectNumber ? `${r.rentmanProjectNumber} · ` : ""}
                    {r.projectName ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{r.customerName ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-900">{r.amountExclVat != null ? formatEuro(r.amountExclVat) : "-"}</td>
                  <td className="px-3 py-2">
                    {r.pdfFileId ? (
                      <a
                        href={`/api/rentman-afas/invoice-pdf/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-700 hover:underline"
                      >
                        Openen
                      </a>
                    ) : (
                      <span className="text-slate-400">geen PDF</span>
                    )}
                  </td>
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
