"use client";

import { PERIOD_OPTIONS, type ReportPeriod } from "@/lib/reports";
import { Select } from "@/components/ui";

export function PeriodSelect({
  value,
  onChange,
}: {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}) {
  return (
    <Select
      aria-label="Periode"
      value={value}
      onChange={(e) => onChange(e.target.value as ReportPeriod)}
      className="w-auto text-sm"
    >
      {PERIOD_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
