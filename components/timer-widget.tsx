"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTimer, stopTimer, resetTimer } from "@/lib/actions/timer";
import type { Dictionary } from "@/lib/i18n";
import { Button, Select } from "@/components/ui";
import { ProjectPicker } from "@/components/project-picker";

type Option = { id: string; name: string; number?: string | null };

type ActiveTimerInfo = {
  startedAtIso: string;
  projectName: string;
  shipName: string | null;
} | null;

function formatElapsed(seconds: number, withSeconds: boolean) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return withSeconds ? `${h}:${pad(m)}:${pad(s)}` : `${h}:${pad(m)}`;
}

export function TimerWidget({
  activeTimer,
  projects,
  ships,
  fixedProject = null,
  dict,
  variant,
}: {
  activeTimer: ActiveTimerInfo;
  projects: Option[];
  ships: Option[];
  fixedProject?: Option | null;
  dict: Dictionary;
  variant: "chip" | "full";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [projectId, setProjectId] = useState(
    fixedProject ? fixedProject.id : projects.length === 1 ? projects[0].id : (projects[0]?.id ?? "")
  );
  const [shipId, setShipId] = useState(ships.length === 1 ? ships[0].id : "");
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const running = Boolean(activeTimer);

  useEffect(() => {
    if (!running || !activeTimer) return;
    const startedAt = new Date(activeTimer.startedAtIso).getTime();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [running, activeTimer]);

  const workedSeconds = Math.max(0, elapsedSeconds - breakMinutes * 60);

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startTimer(projectId, shipId || null);
      if (result?.error) setError(result.error);
      router.refresh();
    });
  }

  function handleStop(withBreak: number) {
    setError(null);
    startTransition(async () => {
      const result = await stopTimer(withBreak);
      if (result?.error) setError(result.error);
      router.refresh();
    });
  }

  function handleReset() {
    startTransition(async () => {
      await resetTimer();
      router.refresh();
    });
  }

  if (variant === "chip") {
    if (!running) {
      return (
        <Link
          href="/uren"
          className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"
        >
          {dict.startShift}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={() => handleStop(0)}
        disabled={isPending}
        className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600"
      >
        {dict.stopShift}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!running && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {fixedProject ? (
            <div className="flex flex-1 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-700">
              {fixedProject.name}
            </div>
          ) : (
            <div className="flex-1">
              <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} dict={dict} />
            </div>
          )}
          <Select value={shipId} onChange={(e) => setShipId(e.target.value)} className="flex-1">
            <option value="">{dict.none}</option>
            {ships.map((ship) => (
              <option key={ship.id} value={ship.id}>
                {ship.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="rounded-3xl bg-red-700 p-6 text-center text-white">
        <div className="text-xs font-bold uppercase tracking-wider text-red-200">{dict.elapsed}</div>
        <div className="text-5xl font-extrabold tracking-tight tabular-nums">
          {formatElapsed(running ? elapsedSeconds : 0, running)}
        </div>
        <div className="mt-1 text-sm text-red-200">
          {running ? dict.recording : dict.tapStart}
        </div>
        {running && (
          <div className="mt-2 text-sm text-red-100">
            {activeTimer!.projectName}
            {activeTimer!.shipName ? ` · ${activeTimer!.shipName}` : ""}
          </div>
        )}
      </div>

      {running ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
          <span className="text-sm font-semibold text-slate-700">{dict.break}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setBreakMinutes((m) => Math.max(0, m - 5))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-xl font-bold text-red-700"
            >
              −
            </button>
            <span className="min-w-14 text-center text-lg font-extrabold">
              {breakMinutes} <span className="text-sm font-semibold text-slate-500">{dict.min}</span>
            </span>
            <button
              type="button"
              onClick={() => setBreakMinutes((m) => m + 5)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-700 text-xl font-bold text-white"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      {running && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4">
          <span className="text-sm font-bold text-red-800">{dict.totalWorked}</span>
          <span className="text-xl font-extrabold text-red-700">{formatElapsed(workedSeconds, false)}</span>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {running ? (
        <>
          <Button type="button" variant="danger" disabled={isPending} onClick={() => handleStop(breakMinutes)}>
            {dict.stopShift}
          </Button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="text-center text-sm font-semibold text-slate-500"
          >
            ↺ {dict.resetTimer}
          </button>
        </>
      ) : (
        <Button type="button" disabled={isPending || !projectId} onClick={handleStart}>
          {dict.startShift}
        </Button>
      )}
    </div>
  );
}
