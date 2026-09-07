"use client";

import { useActionState, useRef } from "react";
import { createColleague } from "@/lib/actions/traction";
import { Input, Button } from "@/components/ui";

export function ColleagueForm() {
  const [state, action, pending] = useActionState(createColleague, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Nieuwe collega
          </label>
          <Input id="name" name="name" placeholder="Naam" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig..." : "Toevoegen"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
