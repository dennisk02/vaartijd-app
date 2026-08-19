"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTimeEntry } from "@/lib/actions/time-entries";
import type { Dictionary } from "@/lib/i18n";
import { Button, Field, Input, Select, TextArea } from "@/components/ui";
import { ProjectPicker } from "@/components/project-picker";

type Option = { id: string; name: string; number?: string | null };

export function TimeEntryForm({
  projects,
  ships,
  fixedProject = null,
  dict,
}: {
  projects: Option[];
  ships: Option[];
  fixedProject?: Option | null;
  dict: Dictionary;
}) {
  const [state, action, pending] = useActionState(createTimeEntry, undefined);
  const today = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement>(null);
  const defaultProjectId = projects.length === 1 ? projects[0].id : "";
  const defaultShipId = ships.length === 1 ? ships[0].id : "";
  const [projectId, setProjectId] = useState(defaultProjectId);

  // Na een geslaagde submit: native velden resetten via het DOM (echte
  // side effect, hoort in een effect) en de doorzoekbare projectkeuze
  // terugzetten via het render-tijd state-aanpassingspatroon van React,
  // zodat we geen setState binnen een effect hoeven te doen.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.message && !state.errors) {
      setProjectId(defaultProjectId);
    }
  }

  useEffect(() => {
    if (state?.message && !state.errors) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      {fixedProject ? (
        <Field label={dict.project} htmlFor="projectId">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-700">
            {fixedProject.name}
          </div>
          <input type="hidden" name="projectId" value={fixedProject.id} />
        </Field>
      ) : (
        <Field label={dict.project} htmlFor="projectId" error={state?.errors?.projectId}>
          <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} dict={dict} name="projectId" />
        </Field>
      )}
      <Field label={`${dict.ship} (${dict.none.toLowerCase()})`} htmlFor="shipId" error={state?.errors?.shipId}>
        <Select id="shipId" name="shipId" defaultValue={defaultShipId}>
          <option value="">{dict.none}</option>
          {ships.map((ship) => (
            <option key={ship.id} value={ship.id}>
              {ship.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={dict.date} htmlFor="date" error={state?.errors?.date}>
        <Input id="date" name="date" type="date" required defaultValue={today} />
      </Field>
      <div className="flex gap-3">
        <Field label={dict.start} htmlFor="startTime" error={state?.errors?.startTime}>
          <Input id="startTime" name="startTime" type="time" required defaultValue="08:00" />
        </Field>
        <Field label={dict.end} htmlFor="endTime" error={state?.errors?.endTime}>
          <Input id="endTime" name="endTime" type="time" required defaultValue="17:00" />
        </Field>
      </div>
      <Field label={`${dict.break} (${dict.min})`} htmlFor="breakMinutes" error={state?.errors?.breakMinutes}>
        <Input id="breakMinutes" name="breakMinutes" type="number" min="0" step="5" defaultValue="30" />
      </Field>
      <Field label={dict.description} htmlFor="description" error={state?.errors?.description}>
        <TextArea id="description" name="description" rows={2} />
      </Field>
      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? dict.saving : dict.saveHours}
      </Button>
    </form>
  );
}
