"use client";

import { useTransition } from "react";
import {
  updateGoalGroupTitle,
  updateGoalItem,
  addGoalItem,
  deleteGoalItem,
  addGoalGroup,
  deleteGoalGroup,
} from "@/lib/actions/traction";
import { traction } from "./colors";

export type GoalItemRow = { id: string; label: string; target: string; status: string };
export type GoalGroupRow = { id: string; title: string; items: GoalItemRow[] };

const fieldStyle = { border: "1px solid transparent", background: "transparent", color: traction.ink };

function GoalItemRowView({ item, statusOptions }: { item: GoalItemRow; statusOptions: string[] }) {
  const [, startTransition] = useTransition();
  return (
    <tr className="border-t" style={{ borderColor: traction.line }}>
      <td className="py-1.5 pr-2">
        <input
          defaultValue={item.label}
          onBlur={(e) => startTransition(() => updateGoalItem(item.id, { label: e.target.value }))}
          className="w-full rounded-md px-2 py-1 text-sm"
          style={fieldStyle}
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          defaultValue={item.target}
          onBlur={(e) => startTransition(() => updateGoalItem(item.id, { target: e.target.value }))}
          className="w-full max-w-[140px] rounded-md px-2 py-1 font-mono text-sm"
          style={fieldStyle}
        />
      </td>
      <td className="py-1.5 pr-2">
        <select
          defaultValue={item.status}
          onChange={(e) => startTransition(() => updateGoalItem(item.id, { status: e.target.value }))}
          className="rounded-full border px-2.5 py-1 text-xs font-semibold"
          style={{ borderColor: traction.line, background: "#fff", color: traction.ink }}
        >
          <option value="">Geen status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5 text-right">
        <button
          type="button"
          onClick={() => startTransition(() => deleteGoalItem(item.id))}
          className="px-1.5 text-base"
          style={{ color: traction.inkSoft }}
          title="Verwijderen"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function GoalGroupTable({ group, statusOptions }: { group: GoalGroupRow; statusOptions: string[] }) {
  const [, startTransition] = useTransition();
  return (
    <div className="mb-6">
      <div className="mb-1.5 flex items-center gap-2">
        <input
          defaultValue={group.title}
          onBlur={(e) => startTransition(() => updateGoalGroupTitle(group.id, e.target.value))}
          className="flex-1 rounded-md px-1.5 py-0.5 text-[13.5px] font-bold"
          style={{ color: traction.navyDeep, background: "transparent", border: "1px solid transparent" }}
        />
        <button
          type="button"
          onClick={() => startTransition(() => deleteGoalGroup(group.id))}
          className="text-xs"
          style={{ color: traction.inkSoft }}
        >
          Groep verwijderen
        </button>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: traction.inkSoft }}>
            <th className="border-b pb-1" style={{ borderColor: traction.line }}>Omschrijving</th>
            <th className="border-b pb-1" style={{ borderColor: traction.line }}>Target</th>
            <th className="border-b pb-1" style={{ borderColor: traction.line }}>Status</th>
            <th className="border-b pb-1" style={{ borderColor: traction.line }} />
          </tr>
        </thead>
        <tbody>
          {group.items.map((item) => (
            <GoalItemRowView key={item.id} item={item} statusOptions={statusOptions} />
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => startTransition(() => addGoalItem(group.id))}
        className="mt-2 text-xs font-semibold"
        style={{ color: traction.navy }}
      >
        + Regel toevoegen
      </button>
    </div>
  );
}

export function DoelenCategorySection({
  category,
  year,
  groups,
  statusOptions,
}: {
  category: string;
  year: number;
  groups: GoalGroupRow[];
  statusOptions: string[];
}) {
  const [, startTransition] = useTransition();
  return (
    <div>
      {groups.map((group) => (
        <GoalGroupTable key={group.id} group={group} statusOptions={statusOptions} />
      ))}
      <button
        type="button"
        onClick={() => startTransition(() => addGoalGroup(year, category))}
        className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
        style={{ background: traction.navy }}
      >
        + Nieuwe groep
      </button>
    </div>
  );
}
