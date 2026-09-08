"use client";

import { useState } from "react";
import { traction } from "./colors";

export type CoreValueRow = { id: string; label: string; meaning: string[]; measurement: string[] };

/** Kernwaarden-balk onder de header: klikbare pillen die een detailvenster
 * openen met de "betekenis" en "hoe meten we dit"-toelichting. Overgenomen
 * uit het origineel (§10.9). */
export function KernwaardenStrip({ coreValues }: { coreValues: CoreValueRow[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null ? coreValues[openIndex] : null;

  if (coreValues.length === 0) return null;

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-center gap-3.5 border-b-[3px] px-7 py-4"
        style={{
          background: `linear-gradient(135deg, ${traction.navyDeep} 0%, ${traction.navy} 55%, ${traction.navyMid} 100%)`,
          borderColor: traction.brass,
        }}
      >
        <span
          className="mr-1.5 font-serif text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color: traction.brassSoft }}
        >
          Kernwaarden
        </span>
        {coreValues.map((cv, i) => (
          <button
            key={cv.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="flex items-center gap-2 rounded-full border px-4 py-2 pl-3 text-left transition-colors"
            style={{ background: "rgba(255,255,255,.06)", borderColor: traction.brass }}
          >
            <span
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: traction.brass, color: traction.navyDeep }}
            >
              {i + 1}
            </span>
            <span className="font-serif text-[13.5px] font-semibold text-white">{cv.label}</span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
          style={{ background: "rgba(10,32,40,.62)" }}
          onClick={() => setOpenIndex(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border p-6"
            style={{ background: traction.paperCard, borderColor: traction.line }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2.5 font-serif text-lg font-bold" style={{ color: traction.navyDeep }}>
              {open.label}
            </h2>
            {open.meaning.length > 0 && (
              <>
                <p className="mb-1.5 mt-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: traction.brass }}>
                  Betekenis
                </p>
                {open.meaning.map((p, i) => (
                  <p key={i} className="mb-2.5 text-[13.5px] leading-relaxed" style={{ color: traction.ink }}>
                    {p}
                  </p>
                ))}
              </>
            )}
            {open.measurement.length > 0 && (
              <>
                <p className="mb-1.5 mt-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: traction.brass }}>
                  Hoe meten we dit
                </p>
                <ul className="list-disc pl-[18px]">
                  {open.measurement.map((m, i) => (
                    <li key={i} className="mb-1 text-[13px] leading-relaxed" style={{ color: traction.ink }}>
                      {m}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: traction.line, color: traction.inkSoft }}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
