"use client";

import { useActionState } from "react";
import { syncShiftbaseNow } from "@/lib/actions/shiftbase-sync";
import { Button } from "@/components/ui";

export function ShiftbaseHoursControls() {
  const [state, action, pending] = useActionState(syncShiftbaseNow, undefined);

  return (
    <div className="flex flex-col gap-3">
      <form action={action}>
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig..." : "Nu synchroniseren"}
        </Button>
      </form>
      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
