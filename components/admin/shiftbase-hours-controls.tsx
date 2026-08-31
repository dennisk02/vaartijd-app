"use client";

import { useActionState } from "react";
import { syncShiftbaseNow } from "@/integrations/actions/shiftbase-sync";
import { Button } from "@/components/ui";

export function ShiftbaseHoursControls({ exportEnabled }: { exportEnabled: boolean }) {
  const [state, action, pending] = useActionState(syncShiftbaseNow, undefined);

  return (
    <div className="flex flex-col gap-3">
      <form action={action}>
        <Button type="submit" disabled={pending || !exportEnabled}>
          {pending ? "Bezig..." : "Nu synchroniseren"}
        </Button>
      </form>
      {!exportEnabled && (
        <p className="text-sm text-slate-500">
          Geblokkeerd totdat het endpoint/de veldnamen zijn geverifieerd (zie boven) en
          <code> SHIFTBASE_HOURS_EXPORT_ENABLED=true</code> is gezet.
        </p>
      )}
      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
