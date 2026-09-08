"use server";

import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getPeriodRange, type ReportPeriod } from "@/lib/reports";

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
 * registraties in de periode = Geen data.
 */
export async function getFoodWasteLocationSummary(period: ReportPeriod): Promise<LocationSummaryRow[]> {
  await requireAdminScope("RAPPORTAGES");
  const { start, end } = getPeriodRange(period);

  const ships = await prisma.ship.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const rows = await prisma.foodWaste.findMany({
    where: { date: { gte: start, lt: end } },
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

export type MonthlyTrendRow = { month: string; foodUsedKg: number; operationalWasteKg: number; wastePercent: number };

/** Bedrijfsbrede maandtrend, alle schepen samen. */
export async function getFoodWasteMonthlyTrend(): Promise<MonthlyTrendRow[]> {
  await requireAdminScope("RAPPORTAGES");

  const rows = await prisma.foodWaste.findMany({
    select: { date: true, foodUsedKg: true, passengerWasteKg: true, kitchenWasteKg: true },
  });

  const byMonth = new Map<string, { foodUsedKg: number; operationalWasteKg: number }>();
  for (const row of rows) {
    const month = row.date.toISOString().slice(0, 7);
    const bucket = byMonth.get(month) ?? { foodUsedKg: 0, operationalWasteKg: 0 };
    bucket.foodUsedKg += Number(row.foodUsedKg);
    bucket.operationalWasteKg += Number(row.passengerWasteKg) + Number(row.kitchenWasteKg);
    byMonth.set(month, bucket);
  }

  return Array.from(byMonth.entries())
    .map(([month, { foodUsedKg, operationalWasteKg }]) => ({
      month,
      foodUsedKg: Math.round(foodUsedKg * 10) / 10,
      operationalWasteKg: Math.round(operationalWasteKg * 10) / 10,
      wastePercent: foodUsedKg > 0 ? Math.round((operationalWasteKg / foodUsedKg) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
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
