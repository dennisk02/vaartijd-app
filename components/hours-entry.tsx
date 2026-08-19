"use client";

import { useState } from "react";
import { TimerWidget } from "@/components/timer-widget";
import { TimeEntryForm } from "@/components/time-entry-form";
import type { Dictionary } from "@/lib/i18n";

type Option = { id: string; name: string; number?: string | null };

export function HoursEntry({
  projects,
  ships,
  fixedProject,
  activeTimer,
  dict,
}: {
  projects: Option[];
  ships: Option[];
  fixedProject: Option | null;
  activeTimer: { startedAtIso: string; projectName: string; shipName: string | null } | null;
  dict: Dictionary;
}) {
  const [mode, setMode] = useState<"timer" | "manual">("timer");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("timer")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
            mode === "timer" ? "bg-white text-red-700 shadow-sm" : "text-slate-500"
          }`}
        >
          ⏱️ {dict.timer}
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          disabled={Boolean(activeTimer)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === "manual" ? "bg-white text-red-700 shadow-sm" : "text-slate-500"
          }`}
        >
          ✎ {dict.manual}
        </button>
      </div>

      {mode === "timer" ? (
        <TimerWidget
          activeTimer={activeTimer}
          projects={projects}
          ships={ships}
          fixedProject={fixedProject}
          dict={dict}
          variant="full"
        />
      ) : (
        <TimeEntryForm projects={projects} ships={ships} fixedProject={fixedProject} dict={dict} />
      )}
    </div>
  );
}
