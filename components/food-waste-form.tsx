"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createFoodWaste } from "@/lib/actions/food-waste";
import type { Dictionary } from "@/lib/i18n";
import { Button, Field, Input, Select } from "@/components/ui";

type Option = { id: string; name: string };

type MealKey = "Breakfast" | "Lunch" | "Dinner";

const MEAL_ROWS: { key: MealKey; icon: string; labelKey: "breakfast" | "lunch" | "dinner" }[] = [
  { key: "Breakfast", icon: "🥐", labelKey: "breakfast" },
  { key: "Lunch", icon: "🍲", labelKey: "lunch" },
  { key: "Dinner", icon: "🍽️", labelKey: "dinner" },
];

type MealValues = { foodUsed: string; passengerWaste: string; kitchenWaste: string; prepWaste: string };

const EMPTY_MEAL: MealValues = { foodUsed: "", passengerWaste: "", kitchenWaste: "", prepWaste: "" };
const EMPTY_ALL: Record<MealKey, MealValues> = { Breakfast: { ...EMPTY_MEAL }, Lunch: { ...EMPTY_MEAL }, Dinner: { ...EMPTY_MEAL } };

function num(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function FoodWasteForm({ ships, dict }: { ships: Option[]; dict: Dictionary }) {
  const [state, action, pending] = useActionState(createFoodWaste, undefined);
  const today = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement>(null);
  const defaultShipId = ships.length === 1 ? ships[0].id : "";

  const [meals, setMeals] = useState<Record<MealKey, MealValues>>(EMPTY_ALL);
  const [prepOpen, setPrepOpen] = useState<Record<MealKey, boolean>>({ Breakfast: false, Lunch: false, Dinner: false });

  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.message && !state.errors) {
      setMeals(EMPTY_ALL);
      setPrepOpen({ Breakfast: false, Lunch: false, Dinner: false });
    }
  }

  useEffect(() => {
    if (state?.message && !state.errors) {
      formRef.current?.reset();
    }
  }, [state]);

  function setField(meal: MealKey, field: keyof MealValues, value: string) {
    setMeals((m) => ({ ...m, [meal]: { ...m[meal], [field]: value } }));
  }

  const totalOperationalWaste = (Object.keys(meals) as MealKey[]).reduce(
    (sum, key) => sum + num(meals[key].passengerWaste) + num(meals[key].kitchenWaste),
    0
  );

  const fieldErrorFor = (meal: MealKey, field: "foodUsed" | "passengerWaste" | "kitchenWaste" | "prepWaste") => {
    const name = `${field}${meal}` as const;
    return state?.errors?.[name];
  };

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

          <div className="flex flex-col gap-2">
            <Field label={dict.foodUsed} htmlFor={`foodUsed${row.key}`} error={fieldErrorFor(row.key, "foodUsed")}>
              <Input
                id={`foodUsed${row.key}`}
                name={`foodUsed${row.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                required
                value={meals[row.key].foodUsed}
                onChange={(e) => setField(row.key, "foodUsed", e.target.value)}
              />
            </Field>
            <Field
              label={dict.passengerWaste}
              htmlFor={`passengerWaste${row.key}`}
              error={fieldErrorFor(row.key, "passengerWaste")}
            >
              <Input
                id={`passengerWaste${row.key}`}
                name={`passengerWaste${row.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                required
                value={meals[row.key].passengerWaste}
                onChange={(e) => setField(row.key, "passengerWaste", e.target.value)}
              />
            </Field>
            <Field
              label={dict.kitchenWaste}
              htmlFor={`kitchenWaste${row.key}`}
              error={fieldErrorFor(row.key, "kitchenWaste")}
            >
              <Input
                id={`kitchenWaste${row.key}`}
                name={`kitchenWaste${row.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                required
                value={meals[row.key].kitchenWaste}
                onChange={(e) => setField(row.key, "kitchenWaste", e.target.value)}
              />
            </Field>

            {prepOpen[row.key] ? (
              <Field
                label={dict.prepWaste}
                htmlFor={`prepWaste${row.key}`}
                error={fieldErrorFor(row.key, "prepWaste")}
              >
                <Input
                  id={`prepWaste${row.key}`}
                  name={`prepWaste${row.key}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.1}
                  value={meals[row.key].prepWaste}
                  onChange={(e) => setField(row.key, "prepWaste", e.target.value)}
                />
              </Field>
            ) : (
              <>
                {/* Meegestuurd als 0 zolang de sectie dicht is -- prepWaste is
                    optioneel, vrijwel geen enkele locatie houdt dit apart bij. */}
                <input type="hidden" name={`prepWaste${row.key}`} value={meals[row.key].prepWaste || "0"} />
                <button
                  type="button"
                  onClick={() => setPrepOpen((p) => ({ ...p, [row.key]: true }))}
                  className="self-start text-xs font-medium text-red-700 hover:underline"
                >
                  {dict.addPrepWaste}
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4">
        <span className="text-sm font-bold text-red-800">{dict.totalToday}</span>
        <span className="text-xl font-extrabold text-red-700">
          {Math.round(totalOperationalWaste * 10) / 10} <span className="text-sm">{dict.kg}</span>
        </span>
      </div>

      {state?.message && <p className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? dict.saving : dict.saveWaste}
      </Button>
    </form>
  );
}
