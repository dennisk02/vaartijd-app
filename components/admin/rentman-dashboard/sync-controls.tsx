"use client";

import { useActionState } from "react";
import { syncRentmanDashboardNow } from "@/lib/actions/rentman-dashboard";
import { Button } from "@/components/ui";

export function RentmanDashboardSyncControls() {
  const [state, action, pending] = useActionState(syncRentmanDashboardNow, undefined);

  return (
    <div className="flex flex-col gap-2">
      <form action={action}>
        <Button type="submit" disabled={pending} variant="secondary">
          {pending ? "Bezig..." : "Nu herberekenen"}
        </Button>
      </form>
      {state?.message && <p className="text-sm text-slate-600">{state.message}</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
