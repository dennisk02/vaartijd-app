"use client";

import { useState, useTransition } from "react";
import { deactivateColleague, reactivateColleague } from "@/lib/actions/traction";
import { Button, Select } from "@/components/ui";

export type ColleagueRow = { id: string; name: string; active: boolean };

/**
 * Deactiveren met verplichte herverdeling (§10.9): een klik op "Deactiveren"
 * probeert het eerst zonder overdracht; heeft de collega nog taken, dan
 * geeft de server-actie `needsReassignment` terug en tonen we hier een
 * keuzelijst om iemand anders te kiezen, waarna dezelfde actie opnieuw
 * wordt aangeroepen mét die keuze.
 */
function ColleagueRowItem({ colleague, others }: { colleague: ColleagueRow; others: ColleagueRow[] }) {
  const [pending, startTransition] = useTransition();
  const [reassignPrompt, setReassignPrompt] = useState<{ openCount: number } | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleDeactivate(withReassignTo?: string) {
    setError(null);
    startTransition(async () => {
      const result = await deactivateColleague(colleague.id, withReassignTo);
      if (result?.needsReassignment) {
        setReassignPrompt({ openCount: result.openCount });
      } else if (result?.error) {
        setError(result.error);
      } else {
        setReassignPrompt(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-sm font-medium ${colleague.active ? "text-slate-900" : "text-slate-400 line-through"}`}>
          {colleague.name}
        </span>
        {colleague.active ? (
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            disabled={pending}
            onClick={() => handleDeactivate()}
          >
            Deactiveren
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            disabled={pending}
            onClick={() => startTransition(() => reactivateColleague(colleague.id))}
          >
            Activeren
          </Button>
        )}
      </div>

      {reassignPrompt && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-sm">
          <span className="text-amber-800">
            Heeft nog {reassignPrompt.openCount} taak/taken. Draag over aan:
          </span>
          <Select value={reassignToId} onChange={(e) => setReassignToId(e.target.value)} className="text-xs">
            <option value="">Kies collega...</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="danger"
            className="text-xs"
            disabled={!reassignToId || pending}
            onClick={() => handleDeactivate(reassignToId)}
          >
            Overdragen &amp; deactiveren
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ColleagueList({ colleagues }: { colleagues: ColleagueRow[] }) {
  if (colleagues.length === 0) {
    return <p className="text-sm text-slate-500">Nog geen collega&apos;s -- voeg er hierboven een toe.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {colleagues.map((colleague) => (
        <ColleagueRowItem
          key={colleague.id}
          colleague={colleague}
          others={colleagues.filter((o) => o.id !== colleague.id && o.active)}
        />
      ))}
    </div>
  );
}
