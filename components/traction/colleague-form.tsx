"use client";

import { useActionState, useRef } from "react";
import { createColleague } from "@/lib/actions/traction";
import { traction } from "./colors";

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
          <label htmlFor="name" className="mb-1 block text-sm font-medium" style={{ color: traction.inkSoft }}>
            Nieuwe collega
          </label>
          <input
            id="name"
            name="name"
            placeholder="Naam"
            required
            className="w-full rounded-md border p-2 text-sm"
            style={{ borderColor: traction.line, color: traction.ink, background: "#fff" }}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: traction.navy }}
        >
          {pending ? "Bezig..." : "Toevoegen"}
        </button>
      </div>
      {state?.error && <p className="text-sm" style={{ color: traction.stop }}>{state.error}</p>}
    </form>
  );
}
