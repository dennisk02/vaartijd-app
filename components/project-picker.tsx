"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";

export type ProjectPickerOption = { id: string; name: string; number?: string | null };

const inputClasses =
  "w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-base focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 disabled:bg-slate-50 disabled:text-slate-400";

/**
 * Doorzoekbare projectkeuze: typen (letter of cijfer, ook op projectnummer)
 * filtert de lijst eronder, in plaats van door een lange native <select> te
 * moeten scrollen. `name` is optioneel en rendert een hidden input zodat dit
 * component ook binnen een gewoon <form> (server action) gebruikt kan
 * worden; zonder `name` werkt het puur als controlled component (bv. in de
 * timer-widget).
 */
export function ProjectPicker({
  projects,
  value,
  onChange,
  dict,
  name,
  disabled = false,
  clearLabel,
}: {
  projects: ProjectPickerOption[];
  value: string;
  onChange: (id: string) => void;
  dict: Dictionary;
  name?: string;
  disabled?: boolean;
  /** Toont een "geen keuze"-optie bovenaan de lijst (voor optionele velden zoals een vast project). Zonder deze prop is een keuze verplicht, zoals bij urenregistratie. */
  clearLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = projects.find((project) => project.id === value) ?? null;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (project) => project.name.toLowerCase().includes(q) || (project.number ?? "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  function selectProject(project: ProjectPickerOption) {
    onChange(project.id);
    setQuery("");
    setOpen(false);
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
          🔍
        </span>
        <input
          type="text"
          disabled={disabled}
          value={open ? query : (selected?.name ?? (clearLabel && !value ? clearLabel : ""))}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter") {
              event.preventDefault();
              if (filtered.length > 0) selectProject(filtered[0]);
            }
          }}
          placeholder={dict.searchProject}
          className={inputClasses}
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {clearLabel && !query.trim() && (
            <button
              type="button"
              onClick={clearSelection}
              className={`block w-full px-3 py-2 text-left text-sm italic hover:bg-red-50 ${
                !value ? "bg-red-50 font-semibold text-red-700" : "text-slate-500"
              }`}
            >
              {clearLabel}
            </button>
          )}
          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">{dict.noProjectsFound}</p>}
          {filtered.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => selectProject(project)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-red-50 ${
                project.id === value ? "bg-red-50 font-semibold text-red-700" : "text-slate-700"
              }`}
            >
              {project.number ? `${project.number} · ` : ""}
              {project.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
