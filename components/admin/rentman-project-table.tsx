"use client";

import { useMemo, useState } from "react";

type RentmanProjectRow = {
  id: string;
  name: string;
  active: boolean;
  rentmanProjectNumber: string | null;
  rentmanProjectName: string | null;
  rentmanStatus: string | null;
  rentmanStartsAt: string | null;
  rentmanEndsAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("nl-NL");
}

/**
 * Tabelweergave van alle Rentman-gesynchroniseerde projecten, met een
 * statusfilter en zoekveld -- bij ~1.300+ projecten (volledige Rentman-
 * historie, zie HANDOVER §17.7) was de vorige kaartenlijst onoverzichtelijk.
 */
export function RentmanProjectTable({ projects }: { projects: RentmanProjectRow[] }) {
  const [status, setStatus] = useState("Alle");
  const [query, setQuery] = useState("");

  const statuses = useMemo(() => {
    const set = new Set(projects.map((p) => p.rentmanStatus ?? "Onbekend"));
    return ["Alle", ...[...set].sort()];
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesStatus = status === "Alle" || (p.rentmanStatus ?? "Onbekend") === status;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.rentmanProjectNumber ?? "").toLowerCase().includes(q) ||
        (p.rentmanProjectName ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [projects, status, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op naam of nummer..."
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-400">
        {filtered.length} van {projects.length} projecten
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Periode</th>
              <th className="px-3 py-2 text-right">Actief</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Geen projecten gevonden.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-400">{p.rentmanProjectNumber ?? "-"}</td>
                <td className="px-3 py-2 font-medium text-slate-900">{p.rentmanProjectName ?? p.name}</td>
                <td className="px-3 py-2">
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {p.rentmanStatus ?? "Onbekend"}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {p.rentmanStartsAt ? `${formatDate(p.rentmanStartsAt)} - ${formatDate(p.rentmanEndsAt)}` : "-"}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.active ? "Actief" : "Inactief"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
