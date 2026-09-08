"use client";

import { useTransition } from "react";
import { updateCoreValue, addCoreValue, deleteCoreValue } from "@/lib/actions/traction";
import { traction } from "./colors";

export type CoreValueRow = { id: string; label: string; meaning: string[]; measurement: string[] };

const fieldStyle = { borderColor: traction.line, color: traction.ink, background: "#fff" };

function CoreValueCard({ cv }: { cv: CoreValueRow }) {
  const [, startTransition] = useTransition();
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: traction.line, background: traction.paper }}>
      <div className="mb-2.5 flex items-center gap-2">
        <input
          defaultValue={cv.label}
          onBlur={(e) => startTransition(() => updateCoreValue(cv.id, { label: e.target.value }))}
          className="flex-1 rounded-md border p-1.5 text-sm font-semibold"
          style={{ ...fieldStyle, color: traction.navyDeep }}
        />
        <button
          type="button"
          onClick={() => startTransition(() => deleteCoreValue(cv.id))}
          className="text-xs font-semibold"
          style={{ color: traction.stop }}
        >
          Verwijderen
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide" style={{ color: traction.brass }}>
            Betekenis (één alinea per regel)
          </label>
          <textarea
            defaultValue={cv.meaning.join("\n")}
            onBlur={(e) => startTransition(() => updateCoreValue(cv.id, { meaningText: e.target.value }))}
            rows={4}
            className="w-full rounded-md border p-2 text-sm"
            style={fieldStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide" style={{ color: traction.brass }}>
            Hoe meten we dit (één bullet per regel)
          </label>
          <textarea
            defaultValue={cv.measurement.join("\n")}
            onBlur={(e) => startTransition(() => updateCoreValue(cv.id, { measurementText: e.target.value }))}
            rows={4}
            className="w-full rounded-md border p-2 text-sm"
            style={fieldStyle}
          />
        </div>
      </div>
    </div>
  );
}

export function CoreValuesEditor({ coreValues }: { coreValues: CoreValueRow[] }) {
  const [, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {coreValues.map((cv) => (
        <CoreValueCard key={cv.id} cv={cv} />
      ))}
      <button
        type="button"
        onClick={() => startTransition(() => addCoreValue())}
        className="self-start rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
        style={{ background: traction.navy }}
      >
        + Kernwaarde toevoegen
      </button>
    </div>
  );
}
