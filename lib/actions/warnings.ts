"use server";

import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getHoursReport, getOccupancyReport, getMealsServedReport } from "@/lib/actions/reports";
import { getRosterComparisonReport } from "@/lib/actions/roster-reports";

export type ReportWarningCategory = "GEWERKT" | "VERLOF" | "ZIEKTE" | "BEZETTING" | "MAALTIJDEN" | "ROOSTER";

export type ReportWarning = {
  id: string;
  category: ReportWarningCategory;
  scope: string;
  date: string;
  message: string;
};

function formatDeviation(actual: number, expected: number, unit: string) {
  const higher = actual > expected;
  return `${actual} ${unit} (${higher ? "boven" : "onder"} verwachte ${expected} ${unit})`;
}

/**
 * Verzamelt actuele trendafwijkingen uit alle rapportages (afgelopen 30
 * dagen, dagelijkse groepering) tot één overzicht, zodat een beheerder niet
 * elke grafiek los hoeft te openen om te zien wat er opvalt -- het
 * "waarschuwingsmechanisme" waar de klant om vroeg (sep 2026). Werkt bovenop
 * de bestaande trendafwijkingsdetectie (lib/trend.ts) die per rapportage al
 * bestond; dit voegt geen nieuwe detectielogica toe, alleen een gebundelde
 * weergave.
 *
 * Uren (gewerkt/verlof/ziekte) worden zowel crew-breed als per schip
 * gecheckt (schip = "locatie") -- ziekte/verlof heeft in Shiftbase zelf geen
 * schip, maar getHoursReport leidt dat per medewerker af uit de
 * roosterhistorie (zie getPrimaryShipForUsers in lib/actions/reports.ts),
 * dus is een schatting. Bezetting/maaltijden/rooster alleen crew-breed
 * resp. alle-schepen: per schip uitsplitsen zou het aantal aanroepen flink
 * vergroten (elke schip × elke rapportage) voor iets dat niet expliciet
 * gevraagd is -- alleen uren (waar wél expliciet om gevraagd is) krijgt de
 * per-schip uitsplitsing.
 */
export async function getReportWarnings(): Promise<ReportWarning[]> {
  await requireAdminScope("RAPPORTAGES");

  const ships = await prisma.ship.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });

  const [hours, occupancy, meals, roster, perShipHours] = await Promise.all([
    getHoursReport("LAST_30_DAYS", null, "DAY", null),
    getOccupancyReport("LAST_30_DAYS", null, "DAY", null),
    getMealsServedReport("LAST_30_DAYS", null, "DAY", null),
    getRosterComparisonReport("LAST_30_DAYS", null, "DAY", null),
    Promise.all(ships.map((ship) => getHoursReport("LAST_30_DAYS", ship.id, "DAY", null).then((r) => ({ ship, report: r })))),
  ]);

  const warnings: ReportWarning[] = [];

  for (const d of hours.deviations) {
    warnings.push({
      id: `gewerkt-alle-${d.date}`,
      category: "GEWERKT",
      scope: "Alle schepen",
      date: d.date,
      message: formatDeviation(d.actual, d.expected, "uur"),
    });
  }
  for (const d of hours.deviationsVerlof) {
    warnings.push({
      id: `verlof-alle-${d.date}`,
      category: "VERLOF",
      scope: "Hele bemanning",
      date: d.date,
      message: formatDeviation(d.actual, d.expected, "uur"),
    });
  }
  for (const d of hours.deviationsZiekte) {
    warnings.push({
      id: `ziekte-alle-${d.date}`,
      category: "ZIEKTE",
      scope: "Hele bemanning",
      date: d.date,
      message: formatDeviation(d.actual, d.expected, "uur"),
    });
  }
  for (const d of occupancy.deviations) {
    warnings.push({
      id: `bezetting-${d.date}`,
      category: "BEZETTING",
      scope: "Alle schepen",
      date: d.date,
      message: formatDeviation(d.actual, d.expected, "personen"),
    });
  }
  for (const d of meals.deviations) {
    warnings.push({
      id: `maaltijden-${d.date}`,
      category: "MAALTIJDEN",
      scope: "Alle schepen",
      date: d.date,
      message: formatDeviation(d.actual, d.expected, "maaltijden"),
    });
  }
  for (const d of roster.deviations) {
    warnings.push({
      id: `rooster-${d.date}`,
      category: "ROOSTER",
      scope: "Alle schepen",
      date: d.date,
      message: `${d.werkelijk} uur werkelijk tegenover ${d.gepland} uur gepland (${d.verschil > 0 ? "+" : ""}${d.verschil} uur)`,
    });
  }
  for (const { ship, report } of perShipHours) {
    for (const d of report.deviations) {
      warnings.push({
        id: `gewerkt-${ship.id}-${d.date}`,
        category: "GEWERKT",
        scope: ship.name,
        date: d.date,
        message: formatDeviation(d.actual, d.expected, "uur"),
      });
    }
    for (const d of report.deviationsVerlof) {
      warnings.push({
        id: `verlof-${ship.id}-${d.date}`,
        category: "VERLOF",
        scope: `${ship.name} (geschat)`,
        date: d.date,
        message: formatDeviation(d.actual, d.expected, "uur"),
      });
    }
    for (const d of report.deviationsZiekte) {
      warnings.push({
        id: `ziekte-${ship.id}-${d.date}`,
        category: "ZIEKTE",
        scope: `${ship.name} (geschat)`,
        date: d.date,
        message: formatDeviation(d.actual, d.expected, "uur"),
      });
    }
  }

  return warnings.sort((a, b) => b.date.localeCompare(a.date));
}
