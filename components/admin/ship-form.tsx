"use client";

import { useActionState, useEffect, useRef } from "react";
import { createShip } from "@/lib/actions/admin";
import { Button, Field, Input } from "@/components/ui";

export function ShipForm() {
  const [state, action, pending] = useActionState(createShip, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message && !state.errors) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <Field label="Naam" htmlFor="name" error={state?.errors?.name}>
        <Input id="name" name="name" required />
      </Field>
      <Field label="Code (optioneel)" htmlFor="code" error={state?.errors?.code}>
        <Input id="code" name="code" />
      </Field>
      <Field label="Capaciteit (optioneel, aantal plaatsen)" htmlFor="capacity" error={state?.errors?.capacity}>
        <Input id="capacity" name="capacity" type="number" min="1" />
      </Field>
      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Bezig..." : "Schip toevoegen"}
      </Button>
    </form>
  );
}
