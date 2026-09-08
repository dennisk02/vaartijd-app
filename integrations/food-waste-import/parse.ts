import "server-only";
import * as XLSX from "xlsx";
import type { MealType } from "@prisma/client";
import { shipNameForLocation } from "./shipMapping";

const MEAL_TYPE_BY_LABEL: Record<string, MealType> = {
  breakfast: "BREAKFAST",
  lunch: "LUNCH",
  dinner: "DINNER",
};

const REQUIRED_COLUMNS = [
  "Date",
  "Location / Vessel",
  "Meal",
  "Food Used (kg)",
  "Passenger Waste (kg)",
  "Kitchen Waste (kg)",
];

export type ParsedFoodWasteRow = {
  rowNumber: number;
  date: Date;
  location: string;
  shipName: string | null;
  mealType: MealType | null;
  foodUsedKg: number;
  prepWasteKg: number;
  passengerWasteKg: number;
  kitchenWasteKg: number;
  reportedWasteKg: number | null;
  reportedWastePercent: number | null;
  notes: string | null;
  sourceFile: string | null;
};

export type ParseResult = {
  rows: ParsedFoodWasteRow[];
  headerRow: string[];
};

/** Cijfers uit een cel halen, ongeacht of dit een getal, tekst ("8.00") of
 * een percentagenotatie ("18.8%") is. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (text === "") return null;
  const numeric = Number(text.replace("%", "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

/** Percentage altijd als 0-100 teruggeven, ongeacht of de bron een fractie
 * (0.188) of al een percentage (18.8) gebruikte. */
function toPercent(value: unknown): number | null {
  const raw = toNumber(value);
  if (raw === null) return null;
  return raw <= 1 ? raw * 100 : raw;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const text = String(value ?? "").trim();
  const parsed = new Date(text);
  return parsed;
}

function toText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

/**
 * Leest het "Raw Data"-tabblad van River Roots' Food Waste Dashboard
 * (Victor Mshati, sep 2026) en zet elke rij om naar een FoodWaste-kandidaat.
 * Koppelt meteen aan een Ship-naam (shipNameForLocation) en MealType, maar
 * beslist zelf niets over onbekende locaties/maaltijden -- dat is aan de
 * aanroeper (zie lib/actions/food-waste-import.ts), zodat de admin een
 * duidelijk overzicht krijgt van wat wel/niet is geïmporteerd.
 *
 * Gebruikt SheetJS (`xlsx`, rechtstreeks van cdn.sheetjs.com i.p.v. de
 * verouderde npm-registry-versie -- zie package.json) i.p.v. `exceljs`: dit
 * specifieke bestand gebruikt consistent namespace-geprefixte XML-tags
 * (`<x:workbook>` i.p.v. de gebruikelijke standaard-namespace), wat exceljs'
 * eigen parser niet herkent maar SheetJS wel probleemloos leest.
 */
export async function parseFoodWasteWorkbook(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets["Raw Data"];
  if (!sheet) {
    throw new Error('Tabblad "Raw Data" niet gevonden in dit bestand.');
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  const headerRow = (rows[0] ?? []).map(toText);
  const colIndex = (name: string) => {
    const idx = headerRow.findIndex((h) => h === name);
    return idx === -1 ? null : idx;
  };

  const missing = REQUIRED_COLUMNS.filter((name) => colIndex(name) === null);
  if (missing.length > 0) {
    throw new Error(`Verwachte kolommen ontbreken in "Raw Data": ${missing.join(", ")}.`);
  }

  const col = {
    date: colIndex("Date")!,
    location: colIndex("Location / Vessel")!,
    meal: colIndex("Meal")!,
    foodUsed: colIndex("Food Used (kg)")!,
    prepWaste: colIndex("Preparation Waste (kg)"),
    passengerWaste: colIndex("Passenger Waste (kg)")!,
    kitchenWaste: colIndex("Kitchen Waste (kg)")!,
    reportedWaste: colIndex("Reported Total Waste (kg)"),
    reportedPercent: colIndex("Reported Waste %"),
    notes: colIndex("Notes"),
    sourceFile: colIndex("Source File"),
  };

  const parsed: ParsedFoodWasteRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const location = toText(row[col.location]);
    if (!location) continue; // lege rij overslaan

    const mealLabel = toText(row[col.meal]).toLowerCase();

    parsed.push({
      rowNumber: i + 1,
      date: toDate(row[col.date]),
      location,
      shipName: shipNameForLocation(location),
      mealType: MEAL_TYPE_BY_LABEL[mealLabel] ?? null,
      foodUsedKg: toNumber(row[col.foodUsed]) ?? 0,
      prepWasteKg: col.prepWaste !== null ? (toNumber(row[col.prepWaste]) ?? 0) : 0,
      passengerWasteKg: toNumber(row[col.passengerWaste]) ?? 0,
      kitchenWasteKg: toNumber(row[col.kitchenWaste]) ?? 0,
      reportedWasteKg: col.reportedWaste !== null ? toNumber(row[col.reportedWaste]) : null,
      reportedWastePercent: col.reportedPercent !== null ? toPercent(row[col.reportedPercent]) : null,
      notes: col.notes !== null ? toText(row[col.notes]) || null : null,
      sourceFile: col.sourceFile !== null ? toText(row[col.sourceFile]) || null : null,
    });
  }

  return { rows: parsed, headerRow };
}

/**
 * Herberekent het operationele verspillingspercentage uit de kilo's
 * (passagiers + keuken t.o.v. voedsel gebruikt) en vergelijkt dat met het
 * door de locatie zelf gerapporteerde percentage. Bij een afwijking van
 * meer dan 2 procentpunt wordt de rij gevlagd -- zelfde controle als
 * Victor's brondashboard, dat bewust nooit stilzwijgend "corrigeert".
 */
export function computeDataQualityFlag(row: ParsedFoodWasteRow): string | null {
  if (row.reportedWastePercent === null || row.foodUsedKg <= 0) return null;
  const recalculated = ((row.passengerWasteKg + row.kitchenWasteKg) / row.foodUsedKg) * 100;
  const diff = Math.abs(recalculated - row.reportedWastePercent);
  if (diff <= 2) return null;
  return `Herberekend % (${recalculated.toFixed(1)}%) wijkt af van gerapporteerd % (${row.reportedWastePercent.toFixed(1)}%).`;
}
