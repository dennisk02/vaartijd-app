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
import { analyzeTrend, type TrendAnalysis } from "@/lib/trend";

const TREND_WINDOW = 4;

function deviationBuckets(keys: string[], deviations: TrendAnalysis["deviations"]) {
  return deviations.map((d) => ({ key: keys[d.index], actual: Math.round(d.actual * 10) / 10, expected: Math.round(d.expected * 10) / 10 }));
}

type HoursBucket = { gewerkt: number; verlof: number; ziekte: number };

/**
 * Uren, gegroepeerd per gekozen granulariteit (dag/week/maand/kwartaal),
 * over de gekozen periode -- uitgesplitst in gewerkt (TimeEntry), verlof en
 * ziekte (AbsenceEntry uit Shiftbase, zie integrations/shiftbase/sync.ts).
 * Optioneel gefilterd op één schip (`shipId`) -- `undefined`/`null`
 * betekent alle schepen (en kantoor-/niet-scheepsgebonden uren, want
 * TimeEntry.shipId is nullable). **Het schip-filter werkt alleen op
 * gewerkte uren**: Shiftbase's afwezigheidsregistratie is niet aan een
 * afdeling/schip gebonden, dus verlof/ziekte tonen altijd de hele
 * bemanning ongeacht `shipId` -- de UI (hours-report-chart.tsx) maakt dit
 * expliciet zichtbaar zodra er een schip gekozen is. "Gewogen gemiddelde"
 * per categorie = totaal aantal uren van die categorie / aantal buckets
 * met minstens één registratie van die categorie. Toont alleen het bereik
 * waar daadwerkelijk data zit (trimToDataRange, over alle drie categorieën
 * samen) -- anders zou bv. "Dit jaar" met pas sinds juni data maandenlang
 * lege nulwaarden tonen. Bevat een lijst van buckets die significant van de
 * lineaire trend afwijken (lib/trend.ts), alleen op de gewerkte uren (de
 * meest actionable van de drie) -- de voorspellingslijn zelf wordt niet
 * getoond, alleen gebruikt om afwijkingen te herkennen. Optioneel
 * `weekday` (0=zondag..6=zaterdag, zie WEEKDAY_OPTIONS) beperkt tot één dag
 * van de week -- voor "vergelijk dezelfde dag" (bv. alle maandagen van dit
 * jaar).
 */
export async function getHoursReport(
  period: ReportPeriod,
  shipId?: string | null,
  granularity: Granularity = "DAY",
  weekday?: number | null
) {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const [allEntries, allAbsences] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
      select: { date: true, hours: true },
    }),
    prisma.absenceEntry.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, hours: true, isSick: true },
    }),
  ]);
  const entries = filterByWeekday(allEntries, weekday);
  const absences = filterByWeekday(allAbsences, weekday);

  const byBucket = new Map<string, HoursBucket>();
  const bucketsSeenGewerkt = new Set<string>();
  const bucketsSeenVerlof = new Set<string>();
  const bucketsSeenZiekte = new Set<string>();
  let totalGewerkt = 0;
  let totalVerlof = 0;
  let totalZiekte = 0;

  for (const entry of entries) {
    const key = bucketKey(entry.date, granularity);
    const bucket = byBucket.get(key) ?? { gewerkt: 0, verlof: 0, ziekte: 0 };
    bucketsSeenGewerkt.add(key);
    const hours = Number(entry.hours);
    bucket.gewerkt += hours;
    byBucket.set(key, bucket);
    totalGewerkt += hours;
  }
  for (const row of absences) {
    const key = bucketKey(row.date, granularity);
    const bucket = byBucket.get(key) ?? { gewerkt: 0, verlof: 0, ziekte: 0 };
    const hours = Number(row.hours);
    if (row.isSick) {
      bucketsSeenZiekte.add(key);
      bucket.ziekte += hours;
      totalZiekte += hours;
    } else {
      bucketsSeenVerlof.add(key);
      bucket.verlof += hours;
      totalVerlof += hours;
    }
    byBucket.set(key, bucket);
  }
  const bucketsWithGewerkt = bucketsSeenGewerkt.size;
  const bucketsWithVerlof = bucketsSeenVerlof.size;
  const bucketsWithZiekte = bucketsSeenZiekte.size;

  const trimmed = trimToDataRange([...entries.map((e) => e.date), ...absences.map((a) => a.date)], start, end);
  const keys = trimmed ? bucketRangeKeys(trimmed.start, trimmed.end, granularity, weekday) : [];
  const data = keys.map((date) => {
    const bucket = byBucket.get(date) ?? { gewerkt: 0, verlof: 0, ziekte: 0 };
    return {
      date,
      gewerkt: Math.round(bucket.gewerkt * 100) / 100,
      verlof: Math.round(bucket.verlof * 100) / 100,
      ziekte: Math.round(bucket.ziekte * 100) / 100,
    };
  });

  const { deviations } = analyzeTrend(
    data.map((d) => d.gewerkt),
    TREND_WINDOW
  );

  return {
    data,
    totalHours: totalGewerkt,
    totalVerlofHours: Math.round(totalVerlof * 100) / 100,
    totalZiekteHours: Math.round(totalZiekte * 100) / 100,
    weightedAverage: bucketsWithGewerkt > 0 ? totalGewerkt / bucketsWithGewerkt : 0,
    weightedAverageVerlof: bucketsWithVerlof > 0 ? totalVerlof / bucketsWithVerlof : 0,
    weightedAverageZiekte: bucketsWithZiekte > 0 ? totalZiekte / bucketsWithZiekte : 0,
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
 * daadwerkelijk data (zie getHoursReport hierboven). Optioneel `weekday`
 * (0=zondag..6=zaterdag) beperkt tot één dag van de week.
 */
export async function getOccupancyReport(
  period: ReportPeriod,
  shipId?: string | null,
  granularity: Granularity = "DAY",
  weekday?: number | null
) {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const allRecords = await prisma.shipOccupancy.findMany({
    where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
    select: { date: true, dayPart: true, passengerCount: true, crewCount: true },
  });
  const records = filterByWeekday(allRecords, weekday);

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
  const keys = trimmed ? bucketRangeKeys(trimmed.start, trimmed.end, granularity, weekday) : [];
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
 * met daadwerkelijk data (zie getHoursReport hierboven). Optioneel
 * `weekday` (0=zondag..6=zaterdag) beperkt tot één dag van de week.
 */
export async function getMealsServedReport(
  period: ReportPeriod,
  shipId?: string | null,
  granularity: Granularity = "DAY",
  weekday?: number | null
) {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const allRecords = await prisma.mealCount.findMany({
    where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
    select: { date: true, countServed: true },
  });
  const records = filterByWeekday(allRecords, weekday);

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
  const keys = trimmed ? bucketRangeKeys(trimmed.start, trimmed.end, granularity, weekday) : [];
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
