"use client";

import { useMemo, useState } from "react";
import type { ReportWarning, ReportWarningCategory } from "@/lib/actions/warnings";
import { Card } from "@/components/ui";
import { HourCategorySelect, type HourCategory } from "./hour-category-select";

const CATEGORY_LABEL: Record<ReportWarningCategory, string> = {
  GEWERKT: "Gewerkte uren",
  VERLOF: "Verlof",
  ZIEKTE: "Ziekte",
  BEZETTING: "Bezetting",
  MAALTIJDEN: "Maaltijden",
  ROOSTER: "Rooster vs. werkelijk",
};

const CATEGORY_STYLE: Record<ReportWarningCategory, string> = {
  GEWERKT: "bg-blue-100 text-blue-800",
  VERLOF: "bg-emerald-100 text-emerald-800",
  ZIEKTE: "bg-red-100 text-red-800",
  BEZETTING: "bg-amber-100 text-amber-800",
  MAALTIJDEN: "bg-amber-100 text-amber-800",
  ROOSTER: "bg-slate-200 text-slate-700",
};

const MAX_SHOWN = 15;

/** Gebundeld overzicht van actuele trendafwijkingen uit alle rapportages
 * (zie lib/actions/warnings.ts), onder de Uren-grafiek -- zodat een
 * beheerder in één oogopslag ziet wat er opvalt zonder elke grafiek los te
 * hoeven openen en configureren. Het urencategorie-filter (Alle/Gewerkt/
 * Verlof/Ziekte) werkt hier client-side op de al opgehaalde lijst -- bij
 * "Alle" blijven ook de niet-uren-waarschuwingen (bezetting/maaltijden/
 * rooster) zichtbaar, bij een specifieke categorie alleen die. */
export function ReportWarningsPanel({ warnings }: { warnings: ReportWarning[] }) {
  const [category, setCategory] = useState<HourCategory>("ALLE");

  const filtered = useMemo(() => {
    if (category === "ALLE") return warnings;
    return warnings.filter((w) => w.category === category);
  }, [warnings, category]);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800">Waarschuwingen</h2>
          <p className="text-sm text-slate-500">
            Automatisch gesignaleerde afwijkingen van de verwachte trend, afgelopen 30 dagen, over alle
            rapportages heen. De lopende week wordt voor gewerkt/verlof/ziekte nog niet meegeteld.
          </p>
        </div>
        <HourCategorySelect value={category} onChange={setCategory} />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Geen bijzonderheden gevonden.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.slice(0, MAX_SHOWN).map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[w.category]}`}>
                {CATEGORY_LABEL[w.category]}
              </span>
              <span className="font-medium text-slate-700">{w.scope}</span>
              <span className="text-slate-500">
                {w.date} -- {w.message}
              </span>
            </li>
          ))}
        </ul>
      )}
      {filtered.length > MAX_SHOWN && (
        <p className="mt-2 text-xs text-slate-500">... en {filtered.length - MAX_SHOWN} meer.</p>
      )}
    </Card>
  );
}
