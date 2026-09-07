"use client";

import { useState, useTransition } from "react";
import { deleteStatusOption } from "@/lib/actions/traction";
import { Button } from "@/components/ui";

/** Losse client-component omdat deleteStatusOption() een foutmelding kan
 * teruggeven (status nog in gebruik) -- een gewone `<form action={...}>`
 * kan die niet tonen (verwacht een void-teruggave). */
export function DeleteStatusButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="danger"
        className="px-2 py-1 text-xs"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteStatusOption(id);
            setError(result?.error ?? null);
          })
        }
      >
        Verwijderen
      </Button>
      {error && <p className="max-w-[220px] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
