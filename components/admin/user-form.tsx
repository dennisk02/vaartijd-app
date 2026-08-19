"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser } from "@/lib/actions/admin";
import { Button, Field, Input, Select } from "@/components/ui";

export function UserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
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
      <Field label="E-mailadres" htmlFor="email" error={state?.errors?.email}>
        <Input id="email" name="email" type="email" required />
      </Field>
      <Field label="Tijdelijk wachtwoord" htmlFor="password" error={state?.errors?.password}>
        <Input id="password" name="password" type="text" minLength={8} required />
      </Field>
      <Field label="Rol" htmlFor="role" error={state?.errors?.role}>
        <Select id="role" name="role" required defaultValue="EMPLOYEE">
          <option value="EMPLOYEE">Medewerker</option>
          <option value="ADMIN">Beheerder</option>
        </Select>
      </Field>
      <Field label="AFAS-medewerkernummer (optioneel)" htmlFor="afasEmployeeNumber" error={state?.errors?.afasEmployeeNumber}>
        <Input id="afasEmployeeNumber" name="afasEmployeeNumber" />
      </Field>
      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Bezig..." : "Medewerker toevoegen"}
      </Button>
    </form>
  );
}
