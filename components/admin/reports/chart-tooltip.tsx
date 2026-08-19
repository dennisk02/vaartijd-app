"use client";

import { chartColors } from "./palette";

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
    <div
      className="rounded-lg border px-3 py-2 shadow-sm"
      style={{ background: chartColors.surface, borderColor: chartColors.gridline }}
    >
      <p className="mb-1 text-xs" style={{ color: chartColors.mutedInk }}>
        {label}
      </p>
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const rawValue = Array.isArray(item.value) ? item.value[0] : item.value;
          const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
          return (
            <div key={`${item.name}-${index}`} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className="inline-block h-[2px] w-3 shrink-0"
                style={{ background: item.color }}
              />
              <span className="font-semibold" style={{ color: chartColors.primaryInk }}>
                {formatValue ? formatValue(numericValue) : numericValue}
              </span>
              <span style={{ color: chartColors.secondaryInk }}>{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
