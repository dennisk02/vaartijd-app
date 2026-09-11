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
 *
 * Ziekte/verlof (AbsenceEntry) is bewust *niet* hier ondergebracht, maar
 * als aparte gewerkt/verlof/ziekte-uitsplitsing in getHoursReport (lib/
 * actions/reports.ts) -- dat sluit aan bij hoe de gebruiker naar de
 * bestaande "Uren"-grafiek keek en voorkomt een derde, overlappende
 * rapportage naast deze en de urengrafiek.
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
