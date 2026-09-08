"use client";

import { useState, useTransition } from "react";
import { traction } from "./colors";

type DeleteAction = (id: string) => Promise<{ error?: string; message?: string } | undefined>;

/** Generiek (zie status-option-form.tsx): losse client-component omdat de
 * verwijder-actie een foutmelding kan teruggeven (status nog in gebruik) --
 * een gewone `<form action={...}>` kan die niet tonen. */
export function DeleteStatusButton({ id, action }: { id: string; action: DeleteAction }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await action(id);
            setError(result?.error ?? null);
          })
        }
        className="rounded-md px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
        style={{ background: traction.stop }}
      >
        Verwijderen
      </button>
      {error && <p className="max-w-[220px] text-right text-xs" style={{ color: traction.stop }}>{error}</p>}
    </div>
  );
}
