"use client";

import { useActionState } from "react";
import { syncRentmanDashboardNow } from "@/lib/actions/rentman-dashboard";
import { dash } from "./colors";

export function RentmanDashboardSyncControls() {
  const [state, action, pending] = useActionState(syncRentmanDashboardNow, undefined);

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border px-3.5 py-2 text-sm font-semibold disabled:opacity-60"
          style={{ background: dash.panel2, borderColor: dash.border, color: dash.text }}
        >
          {pending ? "Bezig..." : "Nu herberekenen"}
        </button>
      </form>
      {state?.message && (
        <p className="text-right text-xs" style={{ color: dash.mutedLight }}>
          {state.message}
        </p>
      )}
      {state?.error && (
        <p className="text-right text-xs" style={{ color: dash.red }}>
          {state.error}
        </p>
      )}
    </div>
  );
}
