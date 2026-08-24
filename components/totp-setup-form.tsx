"use client";

import { useActionState } from "react";
import { confirmTotpSetup } from "@/lib/actions/twofactor";
import { Button, Field, Input } from "@/components/ui";

export function TotpSetupForm() {
  const [state, action, pending] = useActionState(confirmTotpSetup, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Code uit de app" htmlFor="code">
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="\d{6}"
          autoFocus
          required
        />
      </Field>
      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Bezig..." : "Bevestigen"}
      </Button>
    </form>
  );
}
