"use client";

import { useEffect, useState } from "react";
import { getFoodWasteDataQuality } from "@/lib/actions/food-waste-reports";
import { Card } from "@/components/ui";

export function DataQualityPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getFoodWasteDataQuality>> | null>(null);

  useEffect(() => {
    getFoodWasteDataQuality().then(setData);
  }, []);

  return (
    <Card>
      <h2 className="mb-1 font-medium text-slate-800">Data-kwaliteit</h2>
      <p className="mb-4 text-sm text-slate-500">
        Rijen waarvan het herberekende afvalpercentage afwijkt van het door de locatie zelf gerapporteerde
        percentage (&gt;2 procentpunt), plus dekking per geïmporteerd bronbestand.
      </p>

      <div className="flex flex-col gap-6">
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Gevlagde rijen ({data?.flagged.length ?? 0})</h3>
          {data && data.flagged.length === 0 && <p className="text-sm text-slate-500">Geen gevlagde rijen.</p>}
          {data && data.flagged.length > 0 && (
            <div className="flex flex-col gap-2">
              {data.flagged.slice(0, 20).map((row) => (
                <div key={row.id} className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
                  <span className="font-medium">
                    {row.shipName} · {row.date}
                  </span>{" "}
                  -- {row.dataQualityFlag}
                </div>
              ))}
              {data.flagged.length > 20 && (
                <p className="text-xs text-slate-400">... en {data.flagged.length - 20} meer.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Geïmporteerde bronbestanden</h3>
          {data && data.sources.length === 0 && <p className="text-sm text-slate-500">Nog niets geïmporteerd.</p>}
          {data && data.sources.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Bestand</th>
                    <th className="py-2 pr-3 text-right">Regels</th>
                    <th className="py-2 pr-3 text-right">Schepen</th>
                    <th className="py-2 text-right">Periode</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((s) => (
                    <tr key={s.sourceFile} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs text-slate-600">{s.sourceFile}</td>
                      <td className="py-2 pr-3 text-right text-slate-600">{s.rows}</td>
                      <td className="py-2 pr-3 text-right text-slate-600">{s.shipsCovered}</td>
                      <td className="py-2 text-right text-slate-600">
                        {s.earliestDate} — {s.latestDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
