"use client";

import { useState } from "react";
import { PERIOD_OPTIONS, type ReportPeriod, type CustomPeriod } from "@/lib/reports";
import { Select, Input } from "@/components/ui";

const CUSTOM = "CUSTOM";

function isCustomPeriod(period: ReportPeriod): period is CustomPeriod {
  return typeof period === "object";
}

/** Naast de vaste periodes ("Dit jaar" etc.) ook een aangepaste periode met
 * een eigen begin- en einddatum -- de dropdown-selectie ("mode") staat los
 * van `value` zodat "Aangepaste periode" zichtbaar geselecteerd kan blijven
 * terwijl de gebruiker de twee datumvelden nog aan het invullen is (pas als
 * beide datums ingevuld zijn, wordt `onChange` echt aangeroepen). */
export function PeriodSelect({
  value,
  onChange,
}: {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}) {
  const [mode, setMode] = useState<string>(isCustomPeriod(value) ? CUSTOM : value);
  const [start, setStart] = useState(isCustomPeriod(value) ? value.start : "");
  const [end, setEnd] = useState(isCustomPeriod(value) ? value.end : "");

  function handleModeChange(next: string) {
    setMode(next);
    if (next !== CUSTOM) {
      onChange(next as ReportPeriod);
    } else if (start && end) {
      onChange({ custom: true, start, end });
    }
  }

  function handleDateChange(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    if (nextStart && nextEnd && nextStart <= nextEnd) {
      onChange({ custom: true, start: nextStart, end: nextEnd });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label="Periode" value={mode} onChange={(e) => handleModeChange(e.target.value)} className="w-auto text-sm">
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={CUSTOM}>Aangepaste periode</option>
      </Select>
      {mode === CUSTOM && (
        <>
          <Input
            type="date"
            aria-label="Vanaf"
            value={start}
            max={end || undefined}
            onChange={(e) => handleDateChange(e.target.value, end)}
            className="w-auto text-sm"
          />
          <Input
            type="date"
            aria-label="Tot en met"
            value={end}
            min={start || undefined}
            onChange={(e) => handleDateChange(start, e.target.value)}
            className="w-auto text-sm"
          />
        </>
      )}
    </div>
  );
}
