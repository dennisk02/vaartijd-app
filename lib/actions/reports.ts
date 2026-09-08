"use server";

import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  getPeriodRange,
  bucketKey,
  bucketRangeKeys,
  trimToDataRange,
  type ReportPeriod,
  type Granularity,
} from "@/lib/reports";
import { analyzeTrend, type TrendAnalysis } from "@/lib/trend";

const TREND_WINDOW = 4;

function deviationBuckets(keys: string[], deviations: TrendAnalysis["deviations"]) {
  return deviations.map((d) => ({ key: keys[d.index], actual: Math.round(d.actual * 10) / 10, expected: Math.round(d.expected * 10) / 10 }));
}

/**
 * Uren, gegroepeerd per gekozen granulariteit (dag/week/maand/kwartaal),
 * over de gekozen periode. Optioneel gefilterd op één schip (`shipId`) --
 * `undefined`/`null` betekent alle schepen (en kantoor-/niet-scheeps-
 * gebonden uren, want TimeEntry.shipId is nullable). "Gewogen gemiddelde" =
 * totaal aantal uren / aantal buckets met daadwerkelijk geregistreerde uren.
 * Toont alleen het bereik waar daadwerkelijk data zit (trimToDataRange) --
 * anders zou bv. "Dit jaar" met pas sinds juni data maandenlang lege
 * nulwaarden tonen. Bevat een lijst van buckets die significant van de
 * lineaire trend afwijken (lib/trend.ts) -- de voorspellingslijn zelf
 * wordt niet getoond, alleen gebruikt om afwijkingen te herkennen.
 */
export async function getHoursReport(period: ReportPeriod, shipId?: string | null, granularity: Granularity = "DAY") {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const entries = await prisma.timeEntry.findMany({
    where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
    select: { date: true, hours: true },
  });

  const byBucket = new Map<string, number>();
  let totalHours = 0;
  let bucketsWithEntries = 0;
  for (const entry of entries) {
    const key = bucketKey(entry.date, granularity);
    const hours = Number(entry.hours);
    if (!byBucket.has(key)) bucketsWithEntries++;
    byBucket.set(key, (byBucket.get(key) ?? 0) + hours);
    totalHours += hours;
  }

  const trimmed = trimToDataRange(entries.map((e) => e.date), start, end);
  const keys = trimmed ? bucketRangeKeys(trimmed.start, trimmed.end, granularity) : [];
  const values = keys.map((k) => Math.round((byBucket.get(k) ?? 0) * 100) / 100);
  const data = keys.map((date, i) => ({ date, hours: values[i] }));

  const weightedAverage = bucketsWithEntries > 0 ? totalHours / bucketsWithEntries : 0;
  const { deviations } = analyzeTrend(values, TREND_WINDOW);

  return {
    data,
    totalHours,
    weightedAverage,
    unit: "uur" as const,
    deviations: deviationBuckets(keys, deviations).map((d) => ({ date: d.key, actual: d.actual, expected: d.expected })),
  };
}

/**
 * Scheepsbezetting, gegroepeerd per gekozen granulariteit (dag + nacht
 * apart, opgeteld binnen elke bucket). Optioneel gefilterd op één schip.
 * Bezetting = passagiers + bemanning per registratie. "Gewogen gemiddelde"
 * = totaal aantal geregistreerde personen / aantal registraties. Afwijkingen
 * op het bucket-totaal (dag + nacht samen). Toont alleen het bereik met
 * daadwerkelijk data (zie getHoursReport hierboven).
 */
export async function getOccupancyReport(period: ReportPeriod, shipId?: string | null, granularity: Granularity = "DAY") {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const records = await prisma.shipOccupancy.findMany({
    where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
    select: { date: true, dayPart: true, passengerCount: true, crewCount: true },
  });

  const byBucket = new Map<string, { dag: number; nacht: number }>();
  let totalPersons = 0;

  for (const record of records) {
    const key = bucketKey(record.date, granularity);
    const bucket = byBucket.get(key) ?? { dag: 0, nacht: 0 };
    const total = record.passengerCount + record.crewCount;
    if (record.dayPart === "DAY") bucket.dag += total;
    else bucket.nacht += total;
    byBucket.set(key, bucket);
    totalPersons += total;
  }

  const trimmed = trimToDataRange(records.map((r) => r.date), start, end);
  const keys = trimmed ? bucketRangeKeys(trimmed.start, trimmed.end, granularity) : [];
  const data = keys.map((date) => {
    const bucket = byBucket.get(date) ?? { dag: 0, nacht: 0 };
    return { date, dag: bucket.dag, nacht: bucket.nacht };
  });
  const totals = data.map((d) => d.dag + d.nacht);

  const weightedAverage = records.length > 0 ? totalPersons / records.length : 0;
  const { deviations } = analyzeTrend(totals, TREND_WINDOW);

  return {
    data,
    weightedAverage,
    unit: "personen" as const,
    deviations: deviationBuckets(keys, deviations).map((d) => ({ date: d.key, actual: d.actual, expected: d.expected })),
  };
}

/**
 * Aantal geserveerde maaltijden, gegroepeerd per gekozen granulariteit.
 * Optioneel gefilterd op één schip. "Gewogen gemiddelde" = totaal aantal
 * maaltijden / aantal buckets met registraties. Toont alleen het bereik
 * met daadwerkelijk data (zie getHoursReport hierboven).
 */
export async function getMealsServedReport(period: ReportPeriod, shipId?: string | null, granularity: Granularity = "DAY") {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const records = await prisma.mealCount.findMany({
    where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
    select: { date: true, countServed: true },
  });

  const byBucket = new Map<string, number>();
  let totalServed = 0;
  let bucketsWithEntries = 0;
  for (const record of records) {
    const key = bucketKey(record.date, granularity);
    if (!byBucket.has(key)) bucketsWithEntries++;
    byBucket.set(key, (byBucket.get(key) ?? 0) + record.countServed);
    totalServed += record.countServed;
  }

  const trimmed = trimToDataRange(records.map((r) => r.date), start, end);
  const keys = trimmed ? bucketRangeKeys(trimmed.start, trimmed.end, granularity) : [];
  const values = keys.map((k) => byBucket.get(k) ?? 0);
  const data = keys.map((date, i) => ({ date, count: values[i] }));

  const weightedAverage = bucketsWithEntries > 0 ? totalServed / bucketsWithEntries : 0;
  const { deviations } = analyzeTrend(values, TREND_WINDOW);

  return {
    data,
    totalServed,
    weightedAverage,
    unit: "maaltijden" as const,
    deviations: deviationBuckets(keys, deviations).map((d) => ({ date: d.key, actual: d.actual, expected: d.expected })),
  };
}

// Voedselverspilling heeft sinds de uitbreiding naar 4 velden per maaltijd
// (sep 2026) een eigen, uitgebreider dashboard op /admin/voedselverspilling
// (lib/actions/food-waste-reports.ts) -- de simpele dagelijkse grafiek die
// hier stond is daarin opgegaan, geen losse rapportage meer op deze pagina.
