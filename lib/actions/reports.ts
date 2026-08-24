"use server";

import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getPeriodRange, type ReportPeriod } from "@/lib/reports";

/**
 * Uren per project, per dag, over de gekozen periode.
 * "Gewogen gemiddelde" = totaal aantal uren / aantal dagen waarop
 * daadwerkelijk uren zijn geregistreerd (niet gedeeld door alle
 * kalenderdagen, anders zou een periode met veel niet-werkdagen het
 * gemiddelde kunstmatig verlagen).
 */
export async function getHoursReport(period: ReportPeriod) {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const entries = await prisma.timeEntry.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true, hours: true },
  });

  const byDate = new Map<string, number>();
  let totalHours = 0;
  for (const entry of entries) {
    const key = entry.date.toISOString().slice(0, 10);
    const hours = Number(entry.hours);
    byDate.set(key, (byDate.get(key) ?? 0) + hours);
    totalHours += hours;
  }

  const data = Array.from(byDate.entries())
    .map(([date, hours]) => ({ date, hours: Math.round(hours * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weightedAverage = data.length > 0 ? totalHours / data.length : 0;

  return { data, totalHours, weightedAverage, unit: "uur" as const };
}

/**
 * Scheepsbezetting per dag (dag + nacht apart), over de gekozen periode.
 * Bezetting = passagiers + bemanning per registratie.
 * "Gewogen gemiddelde" = totaal aantal geregistreerde personen / aantal
 * registraties (elke dag/nacht-registratie telt naar rato mee, in plaats
 * van een gemiddelde van dag-totalen die zelf al een optelling zijn).
 */
export async function getOccupancyReport(period: ReportPeriod) {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const records = await prisma.shipOccupancy.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true, dayPart: true, passengerCount: true, crewCount: true },
  });

  const byDate = new Map<string, { date: string; dag: number; nacht: number }>();
  let totalPersons = 0;

  for (const record of records) {
    const key = record.date.toISOString().slice(0, 10);
    const bucket = byDate.get(key) ?? { date: key, dag: 0, nacht: 0 };
    const total = record.passengerCount + record.crewCount;
    if (record.dayPart === "DAY") bucket.dag += total;
    else bucket.nacht += total;
    byDate.set(key, bucket);
    totalPersons += total;
  }

  const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const weightedAverage = records.length > 0 ? totalPersons / records.length : 0;

  return { data, weightedAverage, unit: "personen" as const };
}

/**
 * Aantal geserveerde maaltijden per dag, over de gekozen periode.
 * "Gewogen gemiddelde" = totaal aantal maaltijden / aantal dagen met
 * registraties.
 */
export async function getMealsServedReport(period: ReportPeriod) {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const records = await prisma.mealCount.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true, countServed: true },
  });

  const byDate = new Map<string, number>();
  let totalServed = 0;
  for (const record of records) {
    const key = record.date.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + record.countServed);
    totalServed += record.countServed;
  }

  const data = Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weightedAverage = data.length > 0 ? totalServed / data.length : 0;

  return { data, totalServed, weightedAverage, unit: "maaltijden" as const };
}

/**
 * Voedselverspilling in kg per dag, over de gekozen periode.
 * "Gewogen gemiddelde" hier = gram afval per geserveerde maaltijd
 * (totaal kg afval x 1000 / totaal aantal maaltijden in dezelfde periode)
 * -- een eerlijkere maat dan een gemiddelde van dagtotalen, omdat een dag
 * met weinig geserveerde maaltijden anders even zwaar meetelt als een
 * drukke dag.
 */
export async function getFoodWasteReport(period: ReportPeriod) {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const [wasteRecords, mealRecords] = await Promise.all([
    prisma.foodWaste.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, kg: true },
    }),
    prisma.mealCount.aggregate({
      where: { date: { gte: start, lt: end } },
      _sum: { countServed: true },
    }),
  ]);

  const byDate = new Map<string, number>();
  let totalKg = 0;
  for (const record of wasteRecords) {
    const key = record.date.toISOString().slice(0, 10);
    const kg = Number(record.kg);
    byDate.set(key, (byDate.get(key) ?? 0) + kg);
    totalKg += kg;
  }

  const data = Array.from(byDate.entries())
    .map(([date, kg]) => ({ date, kg: Math.round(kg * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalMealsServed = mealRecords._sum.countServed ?? 0;
  const wastePerMealGrams = totalMealsServed > 0 ? (totalKg * 1000) / totalMealsServed : 0;

  return { data, totalKg, weightedAverage: wastePerMealGrams, unit: "gram afval / maaltijd" as const };
}
