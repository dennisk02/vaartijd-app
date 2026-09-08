"use server";

import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  getPeriodRange,
  bucketKey,
  bucketRangeKeys,
  nextBucketKeys,
  type ReportPeriod,
  type Granularity,
} from "@/lib/reports";
import { analyzeTrend, nextMonths, type TrendAnalysis } from "@/lib/trend";

const FORECAST_BUCKETS = 4;
const FORECAST_MONTHS = 2;

function monthRangeKeys(startMonth: string, endMonth: string): string[] {
  const [startY, startM] = startMonth.split("-").map(Number);
  const [endY, endM] = endMonth.split("-").map(Number);
  const keys: string[] = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return keys;
}

function monthDeviations(months: string[], deviations: TrendAnalysis["deviations"]) {
  return deviations.map((d) => ({
    month: months[d.index],
    actual: Math.round(d.actual * 10) / 10,
    expected: Math.round(d.expected * 10) / 10,
  }));
}

export type LocationStatus = "ACTION" | "WATCH" | "NO_DATA";

export type LocationSummaryRow = {
  shipId: string;
  shipName: string;
  entries: number;
  foodUsedKg: number;
  passengerWasteKg: number;
  kitchenWasteKg: number;
  prepWasteKg: number;
  operationalWasteKg: number;
  fullWasteKg: number;
  operationalWastePercent: number;
  flaggedRows: number;
  status: LocationStatus;
};

/**
 * Locatie-overzicht met Action/Watch/Geen data-status, zelfde indeling als
 * River Roots' eigen Food Waste Dashboard (Victor Mshati, sep 2026):
 * >=10% operationele verspilling = Action, >0% en <10% = Watch, geen
 * registraties in de periode = Geen data. Optioneel gefilterd op één schip
 * -- dan blijft er hooguit één rij over (de tabel zelf is al een
 * uitsplitsing per schip, dus dit is vooral handig om snel op één locatie
 * te focussen zonder te scrollen).
 */
export async function getFoodWasteLocationSummary(period: ReportPeriod, shipId?: string | null): Promise<LocationSummaryRow[]> {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const ships = await prisma.ship.findMany({
    where: { active: true, ...(shipId ? { id: shipId } : {}) },
    orderBy: { name: "asc" },
  });
  const rows = await prisma.foodWaste.findMany({
    where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
    select: {
      shipId: true,
      foodUsedKg: true,
      passengerWasteKg: true,
      kitchenWasteKg: true,
      prepWasteKg: true,
      dataQualityFlag: true,
    },
  });

  const byShip = new Map<string, typeof rows>();
  for (const row of rows) {
    const bucket = byShip.get(row.shipId);
    if (bucket) bucket.push(row);
    else byShip.set(row.shipId, [row]);
  }

  const summary: LocationSummaryRow[] = ships.map((ship) => {
    const shipRows = byShip.get(ship.id) ?? [];
    const foodUsedKg = shipRows.reduce((sum, r) => sum + Number(r.foodUsedKg), 0);
    const passengerWasteKg = shipRows.reduce((sum, r) => sum + Number(r.passengerWasteKg), 0);
    const kitchenWasteKg = shipRows.reduce((sum, r) => sum + Number(r.kitchenWasteKg), 0);
    const prepWasteKg = shipRows.reduce((sum, r) => sum + Number(r.prepWasteKg), 0);
    const operationalWasteKg = passengerWasteKg + kitchenWasteKg;
    const fullWasteKg = operationalWasteKg + prepWasteKg;
    const operationalWastePercent = foodUsedKg > 0 ? (operationalWasteKg / foodUsedKg) * 100 : 0;
    const flaggedRows = shipRows.filter((r) => r.dataQualityFlag).length;

    const status: LocationStatus = shipRows.length === 0 ? "NO_DATA" : operationalWastePercent >= 10 ? "ACTION" : "WATCH";

    return {
      shipId: ship.id,
      shipName: ship.name,
      entries: shipRows.length,
      foodUsedKg: Math.round(foodUsedKg * 10) / 10,
      passengerWasteKg: Math.round(passengerWasteKg * 10) / 10,
      kitchenWasteKg: Math.round(kitchenWasteKg * 10) / 10,
      prepWasteKg: Math.round(prepWasteKg * 10) / 10,
      operationalWasteKg: Math.round(operationalWasteKg * 10) / 10,
      fullWasteKg: Math.round(fullWasteKg * 10) / 10,
      operationalWastePercent: Math.round(operationalWastePercent * 10) / 10,
      flaggedRows,
      status,
    };
  });

  // Locaties met data eerst, hoogste verspillingspercentage bovenaan --
  // zelfde volgorde als het brondashboard ("Location ranking").
  return summary.sort((a, b) => {
    if (a.entries === 0 && b.entries === 0) return a.shipName.localeCompare(b.shipName);
    if (a.entries === 0) return 1;
    if (b.entries === 0) return -1;
    return b.operationalWastePercent - a.operationalWastePercent;
  });
}

export type FoodWasteKpis = {
  foodUsedKg: number;
  operationalWasteKg: number;
  weightedWastePercent: number;
  locationsInAction: number;
  flaggedRows: number;
};

/** KPI-tegels bovenaan het dashboard, zelfde vier kerncijfers als het
 * "Dashboard"-tabblad van het brondocument. */
export async function getFoodWasteKpis(period: ReportPeriod, shipId?: string | null): Promise<FoodWasteKpis> {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const rows = await prisma.foodWaste.findMany({
    where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
    select: { shipId: true, foodUsedKg: true, passengerWasteKg: true, kitchenWasteKg: true, dataQualityFlag: true },
  });

  const foodUsedKg = rows.reduce((sum, r) => sum + Number(r.foodUsedKg), 0);
  const operationalWasteKg = rows.reduce((sum, r) => sum + Number(r.passengerWasteKg) + Number(r.kitchenWasteKg), 0);
  const flaggedRows = rows.filter((r) => r.dataQualityFlag).length;

  const byShip = new Map<string, { foodUsedKg: number; operationalWasteKg: number }>();
  for (const row of rows) {
    const bucket = byShip.get(row.shipId) ?? { foodUsedKg: 0, operationalWasteKg: 0 };
    bucket.foodUsedKg += Number(row.foodUsedKg);
    bucket.operationalWasteKg += Number(row.passengerWasteKg) + Number(row.kitchenWasteKg);
    byShip.set(row.shipId, bucket);
  }
  const locationsInAction = Array.from(byShip.values()).filter(
    (b) => b.foodUsedKg > 0 && (b.operationalWasteKg / b.foodUsedKg) * 100 >= 10
  ).length;

  return {
    foodUsedKg: Math.round(foodUsedKg * 10) / 10,
    operationalWasteKg: Math.round(operationalWasteKg * 10) / 10,
    weightedWastePercent: foodUsedKg > 0 ? Math.round((operationalWasteKg / foodUsedKg) * 1000) / 10 : 0,
    locationsInAction,
    flaggedRows,
  };
}

export type DailyWasteRow = { date: string; foodUsedKg: number; operationalWasteKg: number };

/** Voedselverspilling (food used + operationeel afval), gegroepeerd per
 * gekozen granulariteit (dag/week/maand/kwartaal), optioneel per schip --
 * met trendvoorspelling en afwijkingen, zelfde opzet als de andere
 * rapportages (lib/actions/reports.ts). */
export async function getFoodWasteDailyReport(period: ReportPeriod, shipId?: string | null, granularity: Granularity = "DAY") {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const rows = await prisma.foodWaste.findMany({
    where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
    select: { date: true, foodUsedKg: true, passengerWasteKg: true, kitchenWasteKg: true },
  });

  const byBucket = new Map<string, { foodUsedKg: number; operationalWasteKg: number }>();
  for (const row of rows) {
    const key = bucketKey(row.date, granularity);
    const bucket = byBucket.get(key) ?? { foodUsedKg: 0, operationalWasteKg: 0 };
    bucket.foodUsedKg += Number(row.foodUsedKg);
    bucket.operationalWasteKg += Number(row.passengerWasteKg) + Number(row.kitchenWasteKg);
    byBucket.set(key, bucket);
  }

  const keys = bucketRangeKeys(start, end, granularity);
  const data: DailyWasteRow[] = keys.map((date) => {
    const bucket = byBucket.get(date) ?? { foodUsedKg: 0, operationalWasteKg: 0 };
    return { date, foodUsedKg: Math.round(bucket.foodUsedKg * 10) / 10, operationalWasteKg: Math.round(bucket.operationalWasteKg * 10) / 10 };
  });

  const wasteValues = data.map((d) => d.operationalWasteKg);
  const { forecast, deviations } = analyzeTrend(wasteValues, FORECAST_BUCKETS);
  const forecastKeys = keys.length > 0 ? nextBucketKeys(keys[keys.length - 1], FORECAST_BUCKETS, granularity) : [];

  return {
    data,
    forecast: forecastKeys.map((date, i) => ({ date, operationalWasteKg: Math.round(forecast[i] * 10) / 10 })),
    deviations: deviations.map((d) => ({
      date: keys[d.index],
      actual: Math.round(d.actual * 10) / 10,
      expected: Math.round(d.expected * 10) / 10,
    })),
  };
}

export type MonthlyTrendRow = { month: string; foodUsedKg: number; operationalWasteKg: number; wastePercent: number };

/** Maandtrend, optioneel per schip -- met trendvoorspelling (2 maanden
 * vooruit) en gevlagde afwijkende maanden. */
export async function getFoodWasteMonthlyTrend(shipId?: string | null) {
  await requireAdminScope("RAPPORTAGES");

  const rows = await prisma.foodWaste.findMany({
    where: shipId ? { shipId } : {},
    select: { date: true, foodUsedKg: true, passengerWasteKg: true, kitchenWasteKg: true },
  });

  if (rows.length === 0) {
    return { data: [] as MonthlyTrendRow[], forecast: [] as { month: string; operationalWasteKg: number }[], deviations: [] as { month: string; actual: number; expected: number }[] };
  }

  const byMonth = new Map<string, { foodUsedKg: number; operationalWasteKg: number }>();
  for (const row of rows) {
    const month = row.date.toISOString().slice(0, 7);
    const bucket = byMonth.get(month) ?? { foodUsedKg: 0, operationalWasteKg: 0 };
    bucket.foodUsedKg += Number(row.foodUsedKg);
    bucket.operationalWasteKg += Number(row.passengerWasteKg) + Number(row.kitchenWasteKg);
    byMonth.set(month, bucket);
  }

  const sortedMonths = Array.from(byMonth.keys()).sort();
  const months = monthRangeKeys(sortedMonths[0], sortedMonths[sortedMonths.length - 1]);

  const data: MonthlyTrendRow[] = months.map((month) => {
    const bucket = byMonth.get(month) ?? { foodUsedKg: 0, operationalWasteKg: 0 };
    return {
      month,
      foodUsedKg: Math.round(bucket.foodUsedKg * 10) / 10,
      operationalWasteKg: Math.round(bucket.operationalWasteKg * 10) / 10,
      wastePercent: bucket.foodUsedKg > 0 ? Math.round((bucket.operationalWasteKg / bucket.foodUsedKg) * 1000) / 10 : 0,
    };
  });

  const wasteValues = data.map((d) => d.operationalWasteKg);
  const { forecast, deviations } = analyzeTrend(wasteValues, FORECAST_MONTHS);
  const forecastMonths = months.length > 0 ? nextMonths(months[months.length - 1], FORECAST_MONTHS) : [];

  return {
    data,
    forecast: forecastMonths.map((month, i) => ({ month, operationalWasteKg: Math.round(forecast[i] * 10) / 10 })),
    deviations: monthDeviations(months, deviations),
  };
}

export type MealAnalysisRow = {
  mealType: "BREAKFAST" | "LUNCH" | "DINNER";
  label: string;
  entries: number;
  foodUsedKg: number;
  operationalWasteKg: number;
  wastePercent: number;
};

const MEAL_LABELS: Record<MealAnalysisRow["mealType"], string> = {
  BREAKFAST: "Ontbijt",
  LUNCH: "Lunch",
  DINNER: "Diner",
};

/** Uitsplitsing per maaltijdtype -- welke maaltijd de meeste verspilling
 * veroorzaakt, zelfde vraag als Victor's "Meal Analysis"-tabblad. */
export async function getFoodWasteMealAnalysis(period: ReportPeriod, shipId?: string | null): Promise<MealAnalysisRow[]> {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const rows = await prisma.foodWaste.findMany({
    where: { date: { gte: start, lt: end }, ...(shipId ? { shipId } : {}) },
    select: { mealType: true, foodUsedKg: true, passengerWasteKg: true, kitchenWasteKg: true },
  });

  const byMeal = new Map<string, { entries: number; foodUsedKg: number; operationalWasteKg: number }>();
  for (const row of rows) {
    const bucket = byMeal.get(row.mealType) ?? { entries: 0, foodUsedKg: 0, operationalWasteKg: 0 };
    bucket.entries++;
    bucket.foodUsedKg += Number(row.foodUsedKg);
    bucket.operationalWasteKg += Number(row.passengerWasteKg) + Number(row.kitchenWasteKg);
    byMeal.set(row.mealType, bucket);
  }

  return (["BREAKFAST", "LUNCH", "DINNER"] as const).map((mealType) => {
    const bucket = byMeal.get(mealType) ?? { entries: 0, foodUsedKg: 0, operationalWasteKg: 0 };
    return {
      mealType,
      label: MEAL_LABELS[mealType],
      entries: bucket.entries,
      foodUsedKg: Math.round(bucket.foodUsedKg * 10) / 10,
      operationalWasteKg: Math.round(bucket.operationalWasteKg * 10) / 10,
      wastePercent: bucket.foodUsedKg > 0 ? Math.round((bucket.operationalWasteKg / bucket.foodUsedKg) * 1000) / 10 : 0,
    };
  });
}

export type FlaggedRow = {
  id: string;
  shipName: string;
  date: string;
  mealType: string;
  dataQualityFlag: string;
  sourceFile: string | null;
};

export type SourceFileCoverage = {
  sourceFile: string;
  rows: number;
  shipsCovered: number;
  earliestDate: string;
  latestDate: string;
};

/** Data-kwaliteitsoverzicht: gevlagde rijen + dekking per geïmporteerd bronbestand. */
export async function getFoodWasteDataQuality(): Promise<{ flagged: FlaggedRow[]; sources: SourceFileCoverage[] }> {
  await requireAdminScope("RAPPORTAGES");

  const [flaggedRows, importRows] = await Promise.all([
    prisma.foodWaste.findMany({
      where: { dataQualityFlag: { not: null } },
      include: { ship: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.foodWaste.findMany({
      where: { source: "IMPORT", sourceFile: { not: null } },
      select: { sourceFile: true, shipId: true, date: true },
    }),
  ]);

  const bySource = new Map<string, { rows: number; ships: Set<string>; dates: string[] }>();
  for (const row of importRows) {
    const key = row.sourceFile!;
    const bucket = bySource.get(key) ?? { rows: 0, ships: new Set<string>(), dates: [] };
    bucket.rows++;
    bucket.ships.add(row.shipId);
    bucket.dates.push(row.date.toISOString().slice(0, 10));
    bySource.set(key, bucket);
  }

  const sources: SourceFileCoverage[] = Array.from(bySource.entries())
    .map(([sourceFile, { rows, ships, dates }]) => ({
      sourceFile,
      rows,
      shipsCovered: ships.size,
      earliestDate: dates.reduce((a, b) => (a < b ? a : b)),
      latestDate: dates.reduce((a, b) => (a > b ? a : b)),
    }))
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));

  return {
    flagged: flaggedRows.map((r) => ({
      id: r.id,
      shipName: r.ship.name,
      date: r.date.toISOString().slice(0, 10),
      mealType: r.mealType,
      dataQualityFlag: r.dataQualityFlag!,
      sourceFile: r.sourceFile,
    })),
    sources,
  };
}
