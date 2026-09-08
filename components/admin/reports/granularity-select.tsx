"use client";

import { GRANULARITY_OPTIONS, type Granularity } from "@/lib/reports";
import { Select } from "@/components/ui";

export function GranularitySelect({ value, onChange }: { value: Granularity; onChange: (g: Granularity) => void }) {
  return (
    <Select
      aria-label="Groeperen per"
      value={value}
      onChange={(e) => onChange(e.target.value as Granularity)}
      className="w-auto text-sm"
    >
      {GRANULARITY_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
