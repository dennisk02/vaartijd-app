"use client";

import { useActionState, useRef } from "react";
import { importFoodWasteWorkbook } from "@/lib/actions/food-waste-import";
import { Button, Card } from "@/components/ui";

export function ImportPanel() {
  const [state, action, pending] = useActionState(importFoodWasteWorkbook, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <h2 className="mb-1 font-medium text-slate-800">Excel-import</h2>
      <p className="mb-4 text-sm text-slate-500">
        Zolang niet elke locatie zelf in Vaartijd invoert (zie{" "}
        <a href="/afval" className="text-red-700 hover:underline">
          Voedselverspilling
        </a>
        ), kan hier River Roots&apos; eigen Food Waste Dashboard-export (het &quot;Raw Data&quot;-tabblad)
        ingelezen worden. Een import overschrijft nooit handmatig door de bemanning ingevoerde rijen -- alleen
        eerder geïmporteerde rijen (bv. een gecorrigeerde versie opnieuw inlezen).
      </p>
      <form
        ref={formRef}
        action={(formData) => {
          action(formData);
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig..." : "Importeren"}
        </Button>
      </form>

      {state && "error" in state && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

      {state && "summary" in state && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium">
            {state.summary.totalRows} rijen gelezen -- {state.summary.created} nieuw, {state.summary.updated}{" "}
            bijgewerkt, {state.summary.flagged} gevlagd.
          </p>
          {state.summary.duplicatesWithinFile > 0 && (
            <p className="mt-1 text-amber-700">
              {state.summary.duplicatesWithinFile} rij(en) kwamen dubbel voor in het bestand zelf (zelfde
              schip/datum/maaltijd) -- de laatste in het bestand is aangehouden.
            </p>
          )}
          {state.summary.skippedExistingCrewRows > 0 && (
            <p className="mt-1 text-slate-500">
              {state.summary.skippedExistingCrewRows} rij(en) overgeslagen: al handmatig ingevoerd door de bemanning.
            </p>
          )}
          {state.summary.skippedUnknownMeal > 0 && (
            <p className="mt-1 text-slate-500">{state.summary.skippedUnknownMeal} rij(en) met onbekend maaltijdtype overgeslagen.</p>
          )}
          {state.summary.skippedInvalidDate > 0 && (
            <p className="mt-1 text-slate-500">{state.summary.skippedInvalidDate} rij(en) met ongeldige datum overgeslagen.</p>
          )}
          {state.summary.skippedUnmappedLocations.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-amber-700">Niet-gekoppelde locaties (overgeslagen):</p>
              <ul className="ml-4 list-disc text-amber-700">
                {state.summary.skippedUnmappedLocations.map((u) => (
                  <li key={u.location}>
                    {u.location} ({u.count}×)
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-500">
                Voeg deze toe aan de koppellijst (integrations/food-waste-import/shipMapping.ts) om ze mee te
                nemen.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
