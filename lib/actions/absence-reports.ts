"use server";

import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  getPeriodRange,
  bucketKey,
  bucketRangeKeys,
  trimToDataRange,
  filterByWeekday,
  type ReportPeriod,
  type Granularity,
} from "@/lib/reports";

/**
 * Ziekte- en verlofuren, gegroepeerd per gekozen granulariteit, uit
 * Shiftbase (`AbsenceEntry`, zie integrations/shiftbase/sync.ts). Geen
 * schip-filter -- Shiftbase's afwezigheidsregistratie is niet aan een
 * afdeling/schip gebonden (in tegenstelling tot uren/bezetting/maaltijden).
 * Optioneel `weekday` (0=zondag..6=zaterdag) beperkt tot één dag van de
 * week, zelfde opzet als de andere rapportages (lib/actions/reports.ts).
 */
export async function getAbsenceReport(period: ReportPeriod, granularity: Granularity = "DAY", weekday?: number | null) {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const allRows = await prisma.absenceEntry.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true, hours: true, isSick: true },
  });
  const rows = filterByWeekday(allRows, weekday);

  const byBucket = new Map<string, { sick: number; leave: number }>();
  let totalSickHours = 0;
  let totalLeaveHours = 0;
  for (const row of rows) {
    const key = bucketKey(row.date, granularity);
    const bucket = byBucket.get(key) ?? { sick: 0, leave: 0 };
    const hours = Number(row.hours);
    if (row.isSick) {
      bucket.sick += hours;
      totalSickHours += hours;
    } else {
      bucket.leave += hours;
      totalLeaveHours += hours;
    }
    byBucket.set(key, bucket);
  }

  const trimmed = trimToDataRange(rows.map((r) => r.date), start, end);
  const keys = trimmed ? bucketRangeKeys(trimmed.start, trimmed.end, granularity, weekday) : [];
  const data = keys.map((date) => {
    const bucket = byBucket.get(date) ?? { sick: 0, leave: 0 };
    return { date, ziekte: Math.round(bucket.sick * 100) / 100, verlof: Math.round(bucket.leave * 100) / 100 };
  });

  return {
    data,
    totalSickHours: Math.round(totalSickHours * 100) / 100,
    totalLeaveHours: Math.round(totalLeaveHours * 100) / 100,
    unit: "uur" as const,
  };
}

export type RosterComparisonRow = { date: string; gepland: number; werkelijk: number };
export type RosterComparisonDeviation = { date: string; gepland: number; werkelijk: number; verschil: number };

const DEVIATION_MIN_HOURS = 2;
const DEVIATION_MIN_RATIO = 0.2;

/**
 * Gepland rooster (`RosterEntry`) versus daadwerkelijk gewerkte uren
 * (`TimeEntry`), per bucket naast elkaar. Optioneel gefilterd op één schip.
 * Afwijkingen hier zijn een directe vergelijking (|werkelijk - gepland|),
 * geen statistische trendafwijking zoals bij de andere rapportages (lib/
 * trend.ts) -- "wijkt af van het rooster" is hier een absoluut, geen
 * historisch gemiddelde, betekenisvol. Een bucket telt als afwijkend bij
 * >= 2 uur verschil én >= 20% van het geplande aantal uren (of geheel
 * ongepland gewerkt/juist niet gewerkt terwijl wel gepland).
 */
export async function getRosterComparisonReport(
  period: ReportPeriod,
  shipId?: string | null,
  granularity: Granularity = "DAY",
  weekday?: number | null
) {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const [allPlanned, allWorked] = await Promise.all([
    prisma.rosterEntry.findMany({
      where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
      select: { date: true, hours: true },
    }),
    prisma.timeEntry.findMany({
      where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
      select: { date: true, hours: true },
    }),
  ]);
  const planned = filterByWeekday(allPlanned, weekday);
  const worked = filterByWeekday(allWorked, weekday);

  const plannedByBucket = new Map<string, number>();
  for (const row of planned) {
    const key = bucketKey(row.date, granularity);
    plannedByBucket.set(key, (plannedByBucket.get(key) ?? 0) + Number(row.hours));
  }
  const workedByBucket = new Map<string, number>();
  for (const row of worked) {
    const key = bucketKey(row.date, granularity);
    workedByBucket.set(key, (workedByBucket.get(key) ?? 0) + Number(row.hours));
  }

  const trimmed = trimToDataRange([...planned.map((p) => p.date), ...worked.map((w) => w.date)], start, end);
  const keys = trimmed ? bucketRangeKeys(trimmed.start, trimmed.end, granularity, weekday) : [];
  const data: RosterComparisonRow[] = keys.map((date) => ({
    date,
    gepland: Math.round((plannedByBucket.get(date) ?? 0) * 100) / 100,
    werkelijk: Math.round((workedByBucket.get(date) ?? 0) * 100) / 100,
  }));

  const deviations: RosterComparisonDeviation[] = [];
  for (const row of data) {
    const verschil = Math.round((row.werkelijk - row.gepland) * 100) / 100;
    const absVerschil = Math.abs(verschil);
    const isDeviation =
      absVerschil >= DEVIATION_MIN_HOURS && (row.gepland === 0 || absVerschil / row.gepland >= DEVIATION_MIN_RATIO);
    if (isDeviation) deviations.push({ date: row.date, gepland: row.gepland, werkelijk: row.werkelijk, verschil });
  }

  const totalPlanned = data.reduce((sum, d) => sum + d.gepland, 0);
  const totalWorked = data.reduce((sum, d) => sum + d.werkelijk, 0);

  return {
    data,
    totalPlanned: Math.round(totalPlanned * 100) / 100,
    totalWorked: Math.round(totalWorked * 100) / 100,
    deviations,
  };
}
