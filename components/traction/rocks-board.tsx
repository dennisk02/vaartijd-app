"use client";

import { useMemo, useState, useTransition } from "react";
import { updateRockStatus, handoffRock, addRockUpdateNote } from "@/lib/actions/traction";
import { Select, Button, TextArea } from "@/components/ui";

const MONTH_NAMES = [
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
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function RockNotes({ rock }: { rock: RockRow }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-red-700 hover:underline">
        {open ? "Verbergen" : `Notities (${rock.updates.length})`}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg bg-slate-50 p-2.5">
          {rock.updates.length === 0 ? (
            <p className="text-xs text-slate-400">Nog geen notities.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {rock.updates.map((u) => (
                <li key={u.id} className="text-xs text-slate-600">
                  <span className="font-medium text-slate-800">{u.authorName}</span>{" "}
                  <span className="text-slate-400">{formatDateTime(u.createdAt)}</span>
                  <div>{u.note}</div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nieuwe notitie..."
              rows={2}
              className="flex-1 text-xs"
            />
            <Button
              type="button"
              className="text-xs"
              disabled={!note.trim() || pending}
              onClick={() =>
                startTransition(async () => {
                  await addRockUpdateNote(rock.id, note);
                  setNote("");
                })
              }
            >
              Toevoegen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RocksBoard({
  rocks,
  colleagues,
  statusOptions,
}: {
  rocks: RockRow[];
  colleagues: ColleagueOption[];
  statusOptions: string[];
}) {
  const [ownerFilter, setOwnerFilter] = useState("Alle");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [periodFilter, setPeriodFilter] = useState("Alle");
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
        <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="text-sm">
          {periods.map((p) => (
            <option key={p} value={p}>
              {p === "Alle" ? "Alle maanden" : `${MONTH_NAMES[Number(p.split("-")[1]) - 1]} ${p.split("-")[0]}`}
            </option>
          ))}
        </Select>
        <Select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="text-sm">
          <option value="Alle">Alle collega&apos;s</option>
          <option value="Niet toegewezen">Niet toegewezen</option>
          {colleagues.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm">
          <option value="Alle">Alle statussen</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-xs text-slate-400">
        {filtered.length} van {rocks.length} taken
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Geen taken gevonden.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((rock) => (
            <div key={rock.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{rock.task}</p>
                  <p className="text-xs text-slate-400">
                    {MONTH_NAMES[rock.month - 1]} {rock.year}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    defaultValue={rock.ownerId ?? ""}
                    onChange={(e) => startTransition(() => handoffRock(rock.id, e.target.value || null))}
                    className="text-xs"
                  >
                    <option value="">Niet toegewezen</option>
                    {colleagues.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    defaultValue={rock.status}
                    onChange={(e) => startTransition(() => updateRockStatus(rock.id, e.target.value))}
                    className="text-xs"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
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
