"use client";

import { useState, useTransition } from "react";
import { deactivateColleague, reactivateColleague } from "@/lib/actions/traction";
import { traction } from "./colors";

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
    <div className="flex flex-col gap-2 border-t py-2.5 first:border-t-0" style={{ borderColor: traction.line }}>
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-sm font-medium"
          style={{ color: colleague.active ? traction.ink : traction.inkSoft, textDecoration: colleague.active ? "none" : "line-through" }}
        >
          {colleague.name}
        </span>
        {colleague.active ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => handleDeactivate()}
            className="rounded-md border px-2.5 py-1 text-xs font-semibold"
            style={{ borderColor: traction.line, color: traction.inkSoft }}
          >
            Deactiveren
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => reactivateColleague(colleague.id))}
            className="rounded-md border px-2.5 py-1 text-xs font-semibold"
            style={{ borderColor: traction.line, color: traction.inkSoft }}
          >
            Activeren
          </button>
        )}
      </div>

      {reassignPrompt && (
        <div className="flex items-center gap-2 rounded-lg p-2.5 text-sm" style={{ background: traction.warnBg }}>
          <span style={{ color: traction.warn }}>
            Heeft nog {reassignPrompt.openCount} taak/taken. Draag over aan:
          </span>
          <select
            value={reassignToId}
            onChange={(e) => setReassignToId(e.target.value)}
            className="rounded-md border px-2 py-1 text-xs"
            style={{ borderColor: traction.line, background: "#fff", color: traction.ink }}
          >
            <option value="">Kies collega...</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!reassignToId || pending}
            onClick={() => handleDeactivate(reassignToId)}
            className="rounded-md px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: traction.stop }}
          >
            Overdragen &amp; deactiveren
          </button>
        </div>
      )}
      {error && <p className="text-sm" style={{ color: traction.stop }}>{error}</p>}
    </div>
  );
}

export function ColleagueList({ colleagues }: { colleagues: ColleagueRow[] }) {
  if (colleagues.length === 0) {
    return <p className="text-sm" style={{ color: traction.inkSoft }}>Nog geen collega&apos;s -- voeg er hierboven een toe.</p>;
  }

  return (
    <div className="flex flex-col">
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
