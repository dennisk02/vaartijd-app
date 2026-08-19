"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createShipOccupancy } from "@/lib/actions/ship-occupancy";
import type { Dictionary } from "@/lib/i18n";
import { Button, Field, Input, Select } from "@/components/ui";

type ShipOption = { id: string; name: string; capacity: number | null };

function Stepper({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-2 py-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-2xl font-bold text-red-700"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          value={value}
          onChange={(e) => {
            const num = Number(e.target.value);
            onChange(Number.isFinite(num) ? Math.max(min, Math.round(num)) : min);
          }}
          className="w-16 rounded-lg bg-transparent text-center text-2xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-700 text-2xl font-bold text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ShipOccupancyForm({ ships, dict }: { ships: ShipOption[]; dict: Dictionary }) {
  const [state, action, pending] = useActionState(createShipOccupancy, undefined);
  const today = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement>(null);
  const defaultShipId = ships.length === 1 ? ships[0].id : "";

  const [shipId, setShipId] = useState(defaultShipId);
  const [dayPart, setDayPart] = useState<"DAY" | "NIGHT">("DAY");
  const [passengers, setPassengers] = useState(0);
  const [crew, setCrew] = useState(0);

  // Steppers terugzetten na een geslaagde submit via het render-tijd
  // state-aanpassingspatroon (i.p.v. setState binnen een effect).
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.message && !state.errors) {
      setPassengers(0);
      setCrew(0);
    }
  }

  useEffect(() => {
    if (state?.message && !state.errors) {
      formRef.current?.reset();
    }
  }, [state]);

  const capacity = useMemo(() => ships.find((s) => s.id === shipId)?.capacity ?? null, [ships, shipId]);
  const onboard = passengers + crew;
  const pct = capacity ? Math.min(100, Math.round((onboard / capacity) * 100)) : null;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <Field label={dict.ship} htmlFor="shipId" error={state?.errors?.shipId}>
        <Select
          id="shipId"
          name="shipId"
          required
          value={shipId}
          onChange={(e) => setShipId(e.target.value)}
        >
          <option value="" disabled>
            {dict.chooseShip}
          </option>
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
      <Field label={dict.dayPart} htmlFor="dayPart" error={state?.errors?.dayPart}>
        <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setDayPart("DAY")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              dayPart === "DAY" ? "bg-white text-red-700 shadow-sm" : "text-slate-500"
            }`}
          >
            {dict.day}
          </button>
          <button
            type="button"
            onClick={() => setDayPart("NIGHT")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              dayPart === "NIGHT" ? "bg-white text-red-700 shadow-sm" : "text-slate-500"
            }`}
          >
            {dict.night}
          </button>
        </div>
        <input type="hidden" name="dayPart" value={dayPart} />
      </Field>

      {capacity && (
        <div className="rounded-2xl bg-red-700 p-4 text-white">
          <div className="text-xs text-red-200">{dict.onboard}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold">{onboard}</span>
            <span className="text-sm text-red-200">
              / {capacity} {dict.seats}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-red-200">
            {pct}% {dict.ofCapacity}
          </div>
        </div>
      )}

      <Stepper label={dict.passengers} value={passengers} onChange={setPassengers} />
      <input type="hidden" name="passengerCount" value={passengers} />
      <Stepper label={dict.crew} value={crew} onChange={setCrew} />
      <input type="hidden" name="crewCount" value={crew} />
      {(state?.errors?.passengerCount || state?.errors?.crewCount) && (
        <p className="text-sm text-red-600">{state?.errors?.passengerCount?.[0] ?? state?.errors?.crewCount?.[0]}</p>
      )}

      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? dict.saving : dict.saveOccupancy}
      </Button>
    </form>
  );
}
