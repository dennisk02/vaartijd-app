"use client";

import { useActionState, useRef } from "react";
import { createRock } from "@/lib/actions/traction";
import { Field, Input, Select, TextArea, Button } from "@/components/ui";
import type { ColleagueOption } from "./rocks-board";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

export function RockForm({ colleagues, statusOptions }: { colleagues: ColleagueOption[]; statusOptions: string[] }) {
  const [state, action, pending] = useActionState(createRock, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const now = new Date();

  if (statusOptions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Voeg eerst een status toe bij <span className="font-medium">Instellingen</span> voordat je taken kunt
        aanmaken.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3"
    >
      <Field label="Taak" htmlFor="task" error={state?.errors?.task}>
        <TextArea id="task" name="task" rows={2} required />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Maand" htmlFor="month" error={state?.errors?.month}>
          <Select id="month" name="month" defaultValue={String(now.getMonth() + 1)}>
            {MONTH_NAMES.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jaar" htmlFor="year" error={state?.errors?.year}>
          <Input id="year" name="year" type="number" defaultValue={now.getFullYear()} required />
        </Field>
        <Field label="Status" htmlFor="status" error={state?.errors?.status}>
          <Select id="status" name="status" defaultValue={statusOptions[0]}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Eigenaar" htmlFor="ownerId">
          <Select id="ownerId" name="ownerId" defaultValue="">
            <option value="">Niet toegewezen</option>
            {colleagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig..." : "Taak toevoegen"}
        </Button>
        {state?.message && <span className="ml-3 text-sm text-emerald-700">{state.message}</span>}
      </div>
    </form>
  );
}
