"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createFoodWaste } from "@/lib/actions/food-waste";
import type { Dictionary } from "@/lib/i18n";
import { Button, Field, Input, Select } from "@/components/ui";

type Option = { id: string; name: string };

const MEAL_ROWS: { key: "Breakfast" | "Lunch" | "Dinner"; icon: string; labelKey: "breakfast" | "lunch" | "dinner" }[] = [
  { key: "Breakfast", icon: "🥐", labelKey: "breakfast" },
  { key: "Lunch", icon: "🍲", labelKey: "lunch" },
  { key: "Dinner", icon: "🍽️", labelKey: "dinner" },
];

function round1(value: number) {
  return Math.max(0, Math.round(value * 10) / 10);
}

export function FoodWasteForm({ ships, dict }: { ships: Option[]; dict: Dictionary }) {
  const [state, action, pending] = useActionState(createFoodWaste, undefined);
  const today = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement>(null);
  const defaultShipId = ships.length === 1 ? ships[0].id : "";

  const [kg, setKg] = useState({ Breakfast: 0, Lunch: 0, Dinner: 0 });

  // Steppers terugzetten na een geslaagde submit via het render-tijd
  // state-aanpassingspatroon (i.p.v. setState binnen een effect).
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.message && !state.errors) {
      setKg({ Breakfast: 0, Lunch: 0, Dinner: 0 });
    }
  }

  useEffect(() => {
    if (state?.message && !state.errors) {
      formRef.current?.reset();
    }
  }, [state]);

  const total = round1(kg.Breakfast + kg.Lunch + kg.Dinner);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <p className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm leading-relaxed text-slate-600">
        💡 {dict.wasteNote}
      </p>

      <Field label={dict.ship} htmlFor="shipId" error={state?.errors?.shipId}>
        <Select id="shipId" name="shipId" required defaultValue={defaultShipId}>
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

      {MEAL_ROWS.map((row) => (
        <div key={row.key} className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">
              {row.icon} {dict[row.labelKey]}
            </span>
            <span className="text-xs text-slate-400">{dict.kg}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setKg((k) => ({ ...k, [row.key]: round1(k[row.key] - 0.2) }))}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-2xl font-bold text-red-700"
            >
              −
            </button>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              value={kg[row.key]}
              onChange={(e) => {
                const num = Number(e.target.value);
                setKg((k) => ({ ...k, [row.key]: Number.isFinite(num) ? round1(Math.max(0, num)) : 0 }));
              }}
              className="w-20 rounded-lg bg-transparent text-center text-2xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button
              type="button"
              onClick={() => setKg((k) => ({ ...k, [row.key]: round1(k[row.key] + 0.2) }))}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-700 text-2xl font-bold text-white"
            >
              +
            </button>
          </div>
          <input type="hidden" name={`kg${row.key}`} value={kg[row.key]} />
        </div>
      ))}

      {(state?.errors?.kgBreakfast || state?.errors?.kgLunch || state?.errors?.kgDinner) && (
        <p className="text-sm text-red-600">
          {state?.errors?.kgBreakfast?.[0] ?? state?.errors?.kgLunch?.[0] ?? state?.errors?.kgDinner?.[0]}
        </p>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4">
        <span className="text-sm font-bold text-red-800">{dict.totalToday}</span>
        <span className="text-xl font-extrabold text-red-700">
          {total} <span className="text-sm">{dict.kg}</span>
        </span>
      </div>

      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? dict.saving : dict.saveWaste}
      </Button>
    </form>
  );
}
