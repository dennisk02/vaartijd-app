"use client";

import { useActionState } from "react";
import { syncShiftbaseCrewNow } from "@/integrations/actions/shiftbase-crew";
import { Button } from "@/components/ui";

export function ShiftbaseCrewControls() {
  const [state, action, pending] = useActionState(syncShiftbaseCrewNow, undefined);

  return (
    <div className="flex flex-col gap-3">
      <form action={action}>
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig..." : "Nu importeren"}
        </Button>
      </form>
      {state?.message && <p className="text-sm text-slate-700">{state.message}</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
