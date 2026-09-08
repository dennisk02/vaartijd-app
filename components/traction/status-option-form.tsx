"use client";

import { useActionState, useRef } from "react";
import type { TractionFormState } from "@/lib/actions/traction";
import { traction } from "./colors";

type Action = (state: TractionFormState, formData: FormData) => Promise<TractionFormState>;

/** Generiek: gebruikt voor zowel taak- als doel-statusopties (twee losse
 * lijsten, zie HANDOVER §10.9) -- de aan te roepen server-actie komt als
 * prop binnen i.p.v. gedupliceerd te worden per lijst. */
export function StatusOptionForm({ action: createAction, label }: { action: Action; label: string }) {
  const [state, action, pending] = useActionState(createAction, undefined);
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
          <label className="mb-1 block text-sm font-medium" style={{ color: traction.inkSoft }}>
            {label}
          </label>
          <input
            name="label"
            placeholder="Bv. Bezig"
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
