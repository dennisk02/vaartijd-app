"use client";

import { useMemo, useState, useTransition } from "react";
import { updateRockStatus, handoffRock, addRockUpdateNote, carryForwardRock } from "@/lib/actions/traction";
import { traction, rockStatusColors } from "./colors";

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

export type ColleagueOption = { id: string; name: string };
export type RockUpdateRow = { id: string; note: string; createdAt: string; authorName: string };
export type RockRow = {
  id: string;
  year: number;
  month: number;
  task: string;
  ownerId: string | null;
  ownerName: string | null;
  status: string;
  updates: RockUpdateRow[];
  carriedFromLabel: string | null;
  carriedToLabel: string | null;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const selectStyle = { borderColor: traction.line, color: traction.ink, background: "#fff" };

function RockNotes({ rock }: { rock: RockRow }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold" style={{ color: traction.navy }}>
        {open ? "Verbergen" : `Notities (${rock.updates.length})`}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg p-2.5" style={{ background: traction.paper }}>
          {rock.updates.length === 0 ? (
            <p className="text-xs italic" style={{ color: traction.inkSoft }}>Nog geen notities.</p>
          ) : (
            <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
              {rock.updates.map((u) => (
                <li key={u.id} className="flex gap-2.5 text-xs" style={{ color: traction.ink }}>
                  <span className="flex-shrink-0 whitespace-nowrap" style={{ color: traction.inkSoft }}>
                    {formatDateTime(u.createdAt)}
                  </span>
                  <span>
                    <span className="font-semibold">{u.authorName}:</span> {u.note}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nieuwe notitie..."
              rows={2}
              className="flex-1 rounded-md border p-1.5 text-xs"
              style={selectStyle}
            />
            <button
              type="button"
              disabled={!note.trim() || pending}
              onClick={() =>
                startTransition(async () => {
                  await addRockUpdateNote(rock.id, note);
                  setNote("");
                })
              }
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: traction.navy }}
            >
              Toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RockStatusSelect({ rock, statusOptions }: { rock: RockRow; statusOptions: string[] }) {
  const [, startTransition] = useTransition();
  const colors = rockStatusColors(rock.status);
  return (
    <select
      defaultValue={rock.status}
      onChange={(e) => startTransition(() => updateRockStatus(rock.id, e.target.value))}
      className="rounded-full border-0 px-3 py-1.5 text-xs font-semibold"
      style={{ background: colors.bg, color: colors.fg }}
    >
      <option value="">Geen status</option>
      {statusOptions.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function RocksBoard({
  rocks,
  colleagues,
  statusOptions,
  defaultPeriod,
}: {
  rocks: RockRow[];
  colleagues: ColleagueOption[];
  statusOptions: string[];
  defaultPeriod?: string;
}) {
  const [ownerFilter, setOwnerFilter] = useState("Alle");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [periodFilter, setPeriodFilter] = useState(defaultPeriod ?? "Alle");
  const [, startTransition] = useTransition();

  const periods = useMemo(() => {
    const set = new Set(rocks.map((r) => `${r.year}-${String(r.month).padStart(2, "0")}`));
    return ["Alle", ...[...set].sort().reverse()];
  }, [rocks]);

  const filtered = useMemo(() => {
    return rocks.filter((r) => {
      const period = `${r.year}-${String(r.month).padStart(2, "0")}`;
      const matchesOwner = ownerFilter === "Alle" || (ownerFilter === "Niet toegewezen" ? !r.ownerId : r.ownerId === ownerFilter);
      const matchesStatus = statusFilter === "Alle" || r.status === statusFilter;
      const matchesPeriod = periodFilter === "Alle" || period === periodFilter;
      return matchesOwner && matchesStatus && matchesPeriod;
    });
  }, [rocks, ownerFilter, statusFilter, periodFilter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={selectStyle}>
          {periods.map((p) => (
            <option key={p} value={p}>
              {p === "Alle" ? "Alle maanden" : `${MONTH_NAMES[Number(p.split("-")[1]) - 1]} ${p.split("-")[0]}`}
            </option>
          ))}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={selectStyle}>
          <option value="Alle">Alle collega&apos;s</option>
          <option value="Niet toegewezen">Niet toegewezen</option>
          {colleagues.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={selectStyle}>
          <option value="Alle">Alle statussen</option>
          <option value="">Geen status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs" style={{ color: traction.inkSoft }}>
        {filtered.length} van {rocks.length} taken
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: traction.inkSoft }}>Geen taken gevonden.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((rock) => (
            <div
              key={rock.id}
              className="rounded-xl border p-3.5"
              style={{ background: rock.carriedToLabel ? traction.paper : "#fff", borderColor: traction.line, opacity: rock.carriedToLabel ? 0.62 : 1 }}
            >
              {rock.carriedFromLabel && (
                <span
                  className="mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                  style={{ background: traction.brassSoft, color: traction.navy }}
                >
                  Doorgezet vanuit {rock.carriedFromLabel}
                </span>
              )}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: traction.ink, textDecoration: rock.carriedToLabel ? "line-through" : "none" }}>
                    {rock.task}
                  </p>
                  <p className="text-xs" style={{ color: traction.inkSoft }}>
                    {MONTH_NAMES[rock.month - 1]} {rock.year}
                    {rock.carriedToLabel && ` · doorgezet naar ${rock.carriedToLabel}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    defaultValue={rock.ownerId ?? ""}
                    onChange={(e) => startTransition(() => handoffRock(rock.id, e.target.value || null))}
                    className="rounded-md border px-2 py-1.5 text-xs"
                    style={selectStyle}
                  >
                    <option value="">Niet toegewezen</option>
                    {colleagues.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <RockStatusSelect rock={rock} statusOptions={statusOptions} />
                  {!rock.carriedToLabel && (
                    <button
                      type="button"
                      title="Doorzetten naar volgende maand"
                      onClick={() => startTransition(() => carryForwardRock(rock.id))}
                      className="rounded-md px-2.5 py-1.5 text-[11.5px] font-bold text-white"
                      style={{ background: traction.brass }}
                    >
                      Doorzetten →
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <RockNotes rock={rock} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
