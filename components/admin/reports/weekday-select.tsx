"use client";

import { WEEKDAY_OPTIONS } from "@/lib/reports";
import { Select } from "@/components/ui";

const ALL_DAYS = "ALL";

/** "Vergelijk dezelfde dag van de week" -- bv. alleen maandagen binnen de
 * gekozen periode, om te zien of één specifieke dag structureel afwijkt van
 * de rest (i.p.v. dat te moeten aflezen uit een grafiek met alle dagen door
 * elkaar). `null` = alle dagen (standaard, geen filter). */
export function WeekdaySelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (weekday: number | null) => void;
}) {
  return (
    <Select
      aria-label="Dag van de week"
      value={value === null ? ALL_DAYS : String(value)}
      onChange={(e) => onChange(e.target.value === ALL_DAYS ? null : Number(e.target.value))}
      className="w-auto text-sm"
    >
      <option value={ALL_DAYS}>Alle dagen</option>
      {WEEKDAY_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          Alleen {option.label.toLowerCase()}en
        </option>
      ))}
    </Select>
  );
}
