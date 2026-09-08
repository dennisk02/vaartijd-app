"use client";

import { useMemo, useState } from "react";
import { traction, rockStatusColors } from "./colors";
import { MONTH_NAMES } from "./rocks-board";

export type OverzichtRock = {
  id: string;
  month: number;
  task: string;
  ownerId: string | null;
  ownerName: string | null;
  status: string;
};
export type OverzichtColleague = { id: string; name: string };

type Filter = { label: string; predicate: (r: OverzichtRock) => boolean } | null;

const STATUS_BUCKETS = ["", "Loopt", "Gereed", "Niet meer van toepassing"] as const;
const STATUS_LABELS: Record<string, string> = {
  "": "Geen status",
  Loopt: "Loopt",
  Gereed: "Gereed",
  "Niet meer van toepassing": "Niet meer van toepassing",
};

/** Werkdruk telt taken die nog niet klaar/gestopt zijn -- zelfde principe als
 * het origineel ("open" rocks per persoon). */
function isOpen(status: string) {
  return status !== "Gereed" && status !== "Niet meer van toepassing";
}

export function OverzichtDashboard({
  rocks,
  colleagues,
  year,
}: {
  rocks: OverzichtRock[];
  colleagues: OverzichtColleague[];
  year: number;
}) {
  const [filter, setFilter] = useState<Filter>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { "": 0, Loopt: 0, Gereed: 0, "Niet meer van toepassing": 0 };
    for (const r of rocks) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  }, [rocks]);

  const perMonth = useMemo(() => {
    return MONTH_NAMES.map((_, i) => {
      const month = i + 1;
      const monthRocks = rocks.filter((r) => r.month === month);
      const counts: Record<string, number> = { "": 0, Loopt: 0, Gereed: 0, "Niet meer van toepassing": 0 };
      for (const r of monthRocks) counts[r.status] = (counts[r.status] ?? 0) + 1;
      return { month, total: monthRocks.length, counts };
    });
  }, [rocks]);
  const maxMonthTotal = Math.max(1, ...perMonth.map((m) => m.total));
  const currentMonth = new Date().getMonth() + 1;

  const workload = useMemo(() => {
    const rows = colleagues.map((c) => {
      const owned = rocks.filter((r) => r.ownerId === c.id);
      const open = owned.filter((r) => isOpen(r.status)).length;
      return { id: c.id, name: c.name, total: owned.length, open };
    });
    const unassigned = rocks.filter((r) => !r.ownerId);
    const avgOpen = rows.length > 0 ? rows.reduce((s, r) => s + r.open, 0) / rows.length : 0;
    return {
      rows: rows.sort((a, b) => b.total - a.total),
      unassignedCount: unassigned.length,
      overloadThreshold: Math.max(6, Math.ceil(avgOpen * 1.6)),
    };
  }, [rocks, colleagues]);

  const filteredRocks = filter ? rocks.filter(filter.predicate) : [];

  return (
    <div className="flex flex-col gap-7">
      {/* KPI-tegels */}
      <div>
        <p className="card-title mb-2.5 text-xs font-bold uppercase tracking-wide" style={{ color: traction.inkSoft }}>
          {year} in het kort
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setFilter({ label: "Alle taken", predicate: () => true })}
            className="rounded-lg border p-3.5 text-left"
            style={{ background: traction.paper, borderColor: traction.line }}
          >
            <div className="font-mono text-[26px] font-semibold" style={{ color: traction.navyDeep }}>{rocks.length}</div>
            <div className="text-xs" style={{ color: traction.inkSoft }}>Totaal taken</div>
          </button>
          {STATUS_BUCKETS.map((status) => {
            const colors = rockStatusColors(status);
            return (
              <button
                key={status || "geen"}
                type="button"
                onClick={() => setFilter({ label: STATUS_LABELS[status], predicate: (r) => r.status === status })}
                className="rounded-lg border p-3.5 text-left"
                style={{ background: traction.paper, borderColor: traction.line }}
              >
                <div className="font-mono text-[26px] font-semibold" style={{ color: colors.fg }}>{statusCounts[status] ?? 0}</div>
                <div className="text-xs" style={{ color: traction.inkSoft }}>{STATUS_LABELS[status]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Route: taken per maand */}
      <div>
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wide" style={{ color: traction.inkSoft }}>
          Taken per maand
        </p>
        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
          {perMonth.map(({ month, total, counts }) => (
            <button
              key={month}
              type="button"
              onClick={() => setFilter({ label: MONTH_NAMES[month - 1], predicate: (r) => r.month === month })}
              className="flex-1"
              style={{ minWidth: 64 }}
            >
              <div
                className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide"
                style={{ color: month === currentMonth ? traction.navyDeep : traction.inkSoft }}
              >
                {MONTH_NAMES[month - 1].slice(0, 3)}
              </div>
              <div
                className="flex h-14 flex-col-reverse overflow-hidden rounded-md border"
                style={{ borderColor: month === currentMonth ? traction.brass : traction.line, borderWidth: month === currentMonth ? 2 : 1, background: traction.noneBg }}
              >
                {STATUS_BUCKETS.map((status) => {
                  const count = counts[status] ?? 0;
                  if (count === 0) return null;
                  const colors = rockStatusColors(status);
                  return <div key={status || "geen"} style={{ height: `${(count / maxMonthTotal) * 100}%`, background: colors.fg }} />;
                })}
              </div>
              <div className="mt-1 font-mono text-[11px]" style={{ color: traction.inkSoft }}>{total}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Werkdruk per collega */}
      <div>
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wide" style={{ color: traction.inkSoft }}>
          Werkdruk per collega
        </p>
        <div className="flex flex-col gap-2.5">
          {workload.rows.map((row) => {
            const overloaded = row.open >= workload.overloadThreshold;
            const widthPct = Math.min(100, (row.total / Math.max(1, workload.rows[0]?.total || 1)) * 100);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setFilter({ label: row.name, predicate: (r) => r.ownerId === row.id })}
                className="flex flex-wrap items-center gap-3.5 rounded-lg border p-3 text-left"
                style={{ background: overloaded ? "#fff" : traction.paper, borderColor: overloaded ? traction.brass : traction.line, borderWidth: overloaded ? 2 : 1 }}
              >
                <span className="min-w-[110px] flex-none text-sm font-semibold" style={{ color: traction.navyDeep }}>
                  {row.name}
                  {overloaded && (
                    <span className="ml-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: traction.stopBg, color: traction.stop }}>
                      Zwaar belast
                    </span>
                  )}
                </span>
                <span className="h-3.5 flex-1 overflow-hidden rounded-full" style={{ minWidth: 100, background: traction.noneBg }}>
                  <span className="block h-full rounded-full" style={{ width: `${widthPct}%`, background: traction.navy }} />
                </span>
                <span className="flex-none whitespace-nowrap text-xs" style={{ color: traction.inkSoft }}>
                  {row.total} taken · {row.open} open
                </span>
              </button>
            );
          })}
          {workload.unassignedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter({ label: "Niet toegewezen", predicate: (r) => !r.ownerId })}
              className="rounded-lg border p-3 text-left text-sm italic"
              style={{ borderColor: traction.line, color: traction.inkSoft }}
            >
              {workload.unassignedCount} taak/taken nog niet toegewezen
            </button>
          )}
        </div>
      </div>

      {/* Gefilterde lijst */}
      {filter && (
        <div className="rounded-lg border p-4" style={{ background: traction.paper, borderColor: traction.brassSoft }}>
          <button type="button" onClick={() => setFilter(null)} className="float-right text-xs font-semibold" style={{ color: traction.inkSoft }}>
            Sluiten ✕
          </button>
          <p className="mb-2.5 text-sm font-semibold" style={{ color: traction.navyDeep }}>
            {filter.label} ({filteredRocks.length})
          </p>
          {filteredRocks.length === 0 ? (
            <p className="text-sm" style={{ color: traction.inkSoft }}>Geen taken.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <tbody>
                {filteredRocks.map((r) => {
                  const colors = rockStatusColors(r.status);
                  return (
                    <tr key={r.id} className="border-t" style={{ borderColor: traction.line }}>
                      <td className="py-1.5 pr-2 text-xs" style={{ color: traction.inkSoft }}>{MONTH_NAMES[r.month - 1].slice(0, 3)}</td>
                      <td className="py-1.5 pr-2">{r.task}</td>
                      <td className="py-1.5 pr-2 text-xs" style={{ color: traction.inkSoft }}>{r.ownerName ?? "Niet toegewezen"}</td>
                      <td className="py-1.5">
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: colors.bg, color: colors.fg }}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
