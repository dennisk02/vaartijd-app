"use client";

import { useActionState, useRef } from "react";
import { createStatusOption } from "@/lib/actions/traction";
import { Input, Button } from "@/components/ui";

export function StatusOptionForm() {
  const [state, action, pending] = useActionState(createStatusOption, undefined);
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
          <label htmlFor="label" className="mb-1 block text-sm font-medium text-slate-700">
            Nieuwe status
          </label>
          <Input id="label" name="label" placeholder="Bv. Bezig" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig..." : "Toevoegen"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
