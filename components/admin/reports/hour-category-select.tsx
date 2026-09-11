"use client";

import { Select } from "@/components/ui";

export type HourCategory = "ALLE" | "GEWERKT" | "VERLOF" | "ZIEKTE";

const OPTIONS: { value: HourCategory; label: string }[] = [
  { value: "ALLE", label: "Gewerkt + verlof + ziekte" },
  { value: "GEWERKT", label: "Alleen gewerkt" },
  { value: "VERLOF", label: "Alleen verlof" },
  { value: "ZIEKTE", label: "Alleen ziekte" },
];

/** Welke van de drie uren-categorieën in de grafiek getoond wordt --
 * puur een weergavefilter (de data voor alle drie wordt altijd opgehaald,
 * zie getHoursReport), net als het schip-/weekdagfilter ernaast. */
export function HourCategorySelect({
  value,
  onChange,
}: {
  value: HourCategory;
  onChange: (category: HourCategory) => void;
}) {
  return (
    <Select
      aria-label="Urencategorie"
      value={value}
      onChange={(e) => onChange(e.target.value as HourCategory)}
      className="w-auto text-sm"
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
