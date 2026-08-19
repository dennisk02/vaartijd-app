"use client";

import { useMemo, useState } from "react";

/**
 * Zelfde functie als `CheckboxGroup` (components/ui.tsx), maar met een
 * zoekveld erboven -- nodig zodra de lijst te lang wordt om doorheen te
 * scrollen (bv. de 100+ Rentman-projecten in het toewijzingenscherm).
 * Aangevinkte items blijven onthouden, ook als ze door het zoeken tijdelijk
 * niet zichtbaar zijn (checked-state staat los van welke items gerenderd
 * worden).
 */
export function SearchableCheckboxGroup({
  name,
  items,
  defaultCheckedIds,
  searchPlaceholder = "Zoeken...",
  emptyLabel = "Nog niets beschikbaar om toe te wijzen.",
  noResultsLabel = "Niets gevonden.",
  selectedLabel = "geselecteerd",
}: {
  name: string;
  items: { id: string; label: string }[];
  defaultCheckedIds: string[];
  searchPlaceholder?: string;
  emptyLabel?: string;
  noResultsLabel?: string;
  selectedLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState(() => new Set(defaultCheckedIds));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  function toggle(id: string) {
    setChecked((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
        />
        <span className="whitespace-nowrap text-xs text-slate-500">
          {checked.size} {selectedLabel}
        </span>
      </div>
      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {filtered.length === 0 && <p className="px-1 py-1 text-sm text-slate-500">{noResultsLabel}</p>}
        {filtered.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 rounded px-1 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              name={name}
              value={item.id}
              checked={checked.has(item.id)}
              onChange={() => toggle(item.id)}
              className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}
