"use client";

import { useActionState } from "react";
import { syncNow, testConnection } from "@/lib/actions/afas";
import { Button } from "@/components/ui";

export function AfasControls() {
  const [syncState, syncAction, syncPending] = useActionState(syncNow, undefined);
  const [testState, testAction, testPending] = useActionState(testConnection, undefined);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <form action={syncAction}>
          <Button type="submit" disabled={syncPending}>
            {syncPending ? "Bezig..." : "Nu synchroniseren"}
          </Button>
        </form>
        <form action={testAction}>
          <Button type="submit" variant="secondary" disabled={testPending}>
            {testPending ? "Bezig..." : "Verbinding testen"}
          </Button>
        </form>
      </div>
      {syncState?.message && <p className="text-sm text-red-700">{syncState.message}</p>}
      {testState?.message && <p className="text-sm text-red-700">{testState.message}</p>}
      {testState?.error && <p className="text-sm text-red-600">{testState.error}</p>}
    </div>
  );
}
