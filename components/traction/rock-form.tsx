"use client";

import { useActionState, useRef } from "react";
import { createRock } from "@/lib/actions/traction";
import { traction } from "./colors";
import { MONTH_NAMES } from "./rocks-board";
import type { ColleagueOption } from "./rocks-board";

const fieldStyle = { borderColor: traction.line, color: traction.ink, background: "#fff" };

export function RockForm({ colleagues, statusOptions, year, month }: { colleagues: ColleagueOption[]; statusOptions: string[]; year: number; month: number }) {
  const [state, action, pending] = useActionState(createRock, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3"
    >
      <div>
        <label htmlFor="task" className="mb-1 block text-sm font-medium" style={{ color: traction.inkSoft }}>
          Taak
        </label>
        <textarea id="task" name="task" rows={2} required className="w-full rounded-md border p-2 text-sm" style={fieldStyle} />
        {state?.errors?.task && <p className="mt-1 text-xs" style={{ color: traction.stop }}>{state.errors.task[0]}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label htmlFor="month" className="mb-1 block text-sm font-medium" style={{ color: traction.inkSoft }}>
            Maand
          </label>
          <select id="month" name="month" defaultValue={month} className="w-full rounded-md border p-2 text-sm" style={fieldStyle}>
            {MONTH_NAMES.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="year" className="mb-1 block text-sm font-medium" style={{ color: traction.inkSoft }}>
            Jaar
          </label>
          <input id="year" name="year" type="number" defaultValue={year} required className="w-full rounded-md border p-2 text-sm" style={fieldStyle} />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium" style={{ color: traction.inkSoft }}>
            Status
          </label>
          <select id="status" name="status" defaultValue="" className="w-full rounded-md border p-2 text-sm" style={fieldStyle}>
            <option value="">Geen status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ownerId" className="mb-1 block text-sm font-medium" style={{ color: traction.inkSoft }}>
            Eigenaar
          </label>
          <select id="ownerId" name="ownerId" defaultValue="" className="w-full rounded-md border p-2 text-sm" style={fieldStyle}>
            <option value="">Niet toegewezen</option>
            {colleagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: traction.navy }}>
          {pending ? "Bezig..." : "Taak toevoegen"}
        </button>
        {state?.message && <span className="ml-3 text-sm" style={{ color: traction.ok }}>{state.message}</span>}
      </div>
    </form>
  );
}
