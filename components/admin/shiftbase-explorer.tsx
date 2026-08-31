"use client";

import { useActionState } from "react";
import { queryShiftbase } from "@/integrations/actions/shiftbase";
import { Button, Field, Input } from "@/components/ui";

export function ShiftbaseExplorer() {
  const [state, action, pending] = useActionState(queryShiftbase, undefined);

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <Field label="Pad + querystring" htmlFor="path">
          <Input
            id="path"
            name="path"
            placeholder="/timesheets?min_date=2026-07-01&max_date=2026-07-07"
            defaultValue="/timesheets"
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig..." : "Ophalen"}
        </Button>
      </form>
      {state?.error && (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {state.error}
        </pre>
      )}
      {state?.result && (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {state.result}
        </pre>
      )}
    </div>
  );
}
