"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProject } from "@/lib/actions/admin";
import { Button, Field, Input } from "@/components/ui";

export function ProjectForm() {
  const [state, action, pending] = useActionState(createProject, undefined);
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
      <Field label="AFAS-projectcode (optioneel)" htmlFor="afasProjectCode" error={state?.errors?.afasProjectCode}>
        <Input id="afasProjectCode" name="afasProjectCode" />
      </Field>
      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Bezig..." : "Project toevoegen"}
      </Button>
    </form>
  );
}
