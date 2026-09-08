"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScopeWrite } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { parseFoodWasteWorkbook, computeDataQualityFlag } from "@/integrations/food-waste-import/parse";

export type ImportSummary = {
  totalRows: number;
  created: number;
  updated: number;
  flagged: number;
  skippedUnmappedLocations: { location: string; count: number }[];
  skippedUnknownMeal: number;
  skippedInvalidDate: number;
  skippedExistingCrewRows: number;
};

export type FoodWasteImportState = { summary: ImportSummary } | { error: string } | undefined;

function rowKey(shipId: string, date: Date, mealType: string) {
  return `${shipId}|${date.toISOString().slice(0, 10)}|${mealType}`;
}

/**
 * Importeert River Roots' Food Waste Dashboard (het "Raw Data"-tabblad) --
 * zolang niet elke locatie zelf in Vaartijd invoert (zie /afval). Beschermt
 * bewust elke al bestaande CREW-rij: een import overschrijft nooit
 * handmatig ingevoerde bemanningsdata, alleen eerdere IMPORT-rijen (bv. een
 * gecorrigeerde versie van hetzelfde bestand opnieuw inlezen).
 */
export async function importFoodWasteWorkbook(
  _state: FoodWasteImportState,
  formData: FormData
): Promise<FoodWasteImportState> {
  const user = await requireAdminScopeWrite("RAPPORTAGES");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Kies eerst een Excel-bestand (.xlsx)." };
  }

  let parsed;
  try {
    parsed = await parseFoodWasteWorkbook(await file.arrayBuffer());
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Kon het bestand niet lezen." };
  }

  const ships = await prisma.ship.findMany({ select: { id: true, name: true } });
  const shipIdByName = new Map(ships.map((s) => [s.name.trim(), s.id]));

  const existingRows = await prisma.foodWaste.findMany({
    where: { source: "IMPORT" },
    select: { id: true, shipId: true, date: true, mealType: true },
  });
  const existingByKey = new Map(existingRows.map((r) => [rowKey(r.shipId, r.date, r.mealType), r.id]));
  const crewRows = await prisma.foodWaste.findMany({
    where: { source: "CREW" },
    select: { shipId: true, date: true, mealType: true },
  });
  const crewKeys = new Set(crewRows.map((r) => rowKey(r.shipId, r.date, r.mealType)));

  const summary: ImportSummary = {
    totalRows: parsed.rows.length,
    created: 0,
    updated: 0,
    flagged: 0,
    skippedUnmappedLocations: [],
    skippedUnknownMeal: 0,
    skippedInvalidDate: 0,
    skippedExistingCrewRows: 0,
  };
  const unmappedCounts = new Map<string, number>();

  for (const row of parsed.rows) {
    if (Number.isNaN(row.date.getTime())) {
      summary.skippedInvalidDate++;
      continue;
    }
    if (!row.mealType) {
      summary.skippedUnknownMeal++;
      continue;
    }
    const shipId = row.shipName ? shipIdByName.get(row.shipName) : undefined;
    if (!shipId) {
      unmappedCounts.set(row.location, (unmappedCounts.get(row.location) ?? 0) + 1);
      continue;
    }

    const key = rowKey(shipId, row.date, row.mealType);
    if (crewKeys.has(key)) {
      summary.skippedExistingCrewRows++;
      continue;
    }

    const dataQualityFlag = computeDataQualityFlag(row);
    if (dataQualityFlag) summary.flagged++;

    const data = {
      shipId,
      date: row.date,
      mealType: row.mealType,
      foodUsedKg: row.foodUsedKg,
      prepWasteKg: row.prepWasteKg,
      passengerWasteKg: row.passengerWasteKg,
      kitchenWasteKg: row.kitchenWasteKg,
      source: "IMPORT" as const,
      sourceFile: row.sourceFile ?? file.name,
      dataQualityFlag,
      notes: row.notes,
      createdById: user.id,
    };

    const existingId = existingByKey.get(key);
    if (existingId) {
      await prisma.foodWaste.update({ where: { id: existingId }, data });
      summary.updated++;
    } else {
      await prisma.foodWaste.create({ data });
      summary.created++;
    }
  }

  summary.skippedUnmappedLocations = Array.from(unmappedCounts.entries()).map(([location, count]) => ({
    location,
    count,
  }));

  revalidatePath("/admin/voedselverspilling");
  revalidatePath("/admin/rapportages");
  return { summary };
}
