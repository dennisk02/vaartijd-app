"use client";

import { dash } from "./colors";

/** Donker-thema tooltip voor dit dashboard specifiek -- de gedeelde
 * components/admin/reports/chart-tooltip.tsx blijft licht (die wordt ook
 * gebruikt door de rest van de admin-rapportages, die niet meeverhuizen
 * naar dit donkere thema). */
type TooltipPayloadItem = {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
};

export function ChartTooltip({
  active,
  label,
  payload,
  formatValue,
}: {
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipPayloadItem[];
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border px-3 py-2" style={{ background: dash.panel2, borderColor: dash.border }}>
      <p className="mb-1 text-xs" style={{ color: dash.mutedLight }}>
        {label}
      </p>
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const rawValue = Array.isArray(item.value) ? item.value[0] : item.value;
          const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
          return (
            <div key={`${item.name}-${index}`} className="flex items-center gap-2 text-sm">
              <span aria-hidden className="inline-block h-[2px] w-3 shrink-0" style={{ background: item.color }} />
              <span className="font-semibold" style={{ color: dash.text }}>
                {formatValue ? formatValue(numericValue) : numericValue}
              </span>
              <span style={{ color: dash.mutedLight }}>{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
