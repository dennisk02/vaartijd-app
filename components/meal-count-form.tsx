"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createMealCounts } from "@/lib/actions/meal-counts";
import type { Dictionary } from "@/lib/i18n";
import { Button, Field, Input, Select } from "@/components/ui";

type Option = { id: string; name: string };

const MEAL_ROWS: { key: "Breakfast" | "Lunch" | "Dinner"; icon: string; labelKey: "breakfast" | "lunch" | "dinner" }[] = [
  { key: "Breakfast", icon: "🥐", labelKey: "breakfast" },
  { key: "Lunch", icon: "🍲", labelKey: "lunch" },
  { key: "Dinner", icon: "🍽️", labelKey: "dinner" },
];

export function MealCountForm({ ships, dict }: { ships: Option[]; dict: Dictionary }) {
  const [state, action, pending] = useActionState(createMealCounts, undefined);
  const today = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement>(null);
  const defaultShipId = ships.length === 1 ? ships[0].id : "";

  const [counts, setCounts] = useState({ Breakfast: 0, Lunch: 0, Dinner: 0 });

  // Steppers terugzetten na een geslaagde submit via het render-tijd
  // state-aanpassingspatroon (i.p.v. setState binnen een effect).
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.message && !state.errors) {
      setCounts({ Breakfast: 0, Lunch: 0, Dinner: 0 });
    }
  }

  useEffect(() => {
    if (state?.message && !state.errors) {
      formRef.current?.reset();
    }
  }, [state]);

  const total = counts.Breakfast + counts.Lunch + counts.Dinner;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
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
        <div
          key={row.key}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl">
            {row.icon}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-900">{dict[row.labelKey]}</div>
            <div className="text-xs text-slate-500">{dict.servedToday}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCounts((c) => ({ ...c, [row.key]: Math.max(0, c[row.key] - 1) }))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-2xl font-bold text-red-700"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={counts[row.key]}
              onChange={(e) => {
                const num = Number(e.target.value);
                setCounts((c) => ({ ...c, [row.key]: Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0 }));
              }}
              className="w-14 min-w-9 rounded-lg bg-transparent text-center text-xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button
              type="button"
              onClick={() => setCounts((c) => ({ ...c, [row.key]: c[row.key] + 1 }))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-700 text-2xl font-bold text-white"
            >
              +
            </button>
          </div>
          <input type="hidden" name={`count${row.key}`} value={counts[row.key]} />
        </div>
      ))}

      {(state?.errors?.countBreakfast || state?.errors?.countLunch || state?.errors?.countDinner) && (
        <p className="text-sm text-red-600">
          {state?.errors?.countBreakfast?.[0] ?? state?.errors?.countLunch?.[0] ?? state?.errors?.countDinner?.[0]}
        </p>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4">
        <span className="text-sm font-bold text-red-800">{dict.totalToday}</span>
        <span className="text-xl font-extrabold text-red-700">{total}</span>
      </div>

      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? dict.saving : dict.saveMeals}
      </Button>
    </form>
  );
}
