import "server-only";
import { prisma } from "@/lib/prisma";
import {
  fetchAllSubprojectsFinancial,
  fetchAllInvoicesForDashboard,
  fetchAllProjectCustomFields,
  businessUnitFor,
  type RentmanFinancialSubproject,
} from "@/integrations/rentman/client";

/**
 * Ververst de ruwe brondata van het financiële Rentman-dashboard (omzet/
 * facturatie/opties/annuleringen). Draait 's nachts via cron (of handmatig
 * via /admin/rentman-financieel). Alleen lezend richting Rentman -- zelfde
 * principe als de projectsync.
 *
 * Slaat bewust GEEN vooraf-geaggregeerde cijfers op -- elk subproject wordt
 * los bewaard in `RentmanSubprojectSnapshot`, en alle KPI's/grafieken/
 * tabellen van de 5 tabbladen worden er bij het opbouwen van de pagina uit
 * afgeleid (zie integrations/rentman/dashboardAggregate.ts). Bij ~800 rijen is dat
 * in-memory triviaal snel, en het voorkomt dat elke nieuwe doorsnede een
 * eigen vooraf-berekende tabel nodig heeft.
 */

const CANCELLED_STATUS = "Geannuleerd";

function monthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  return dateStr.slice(0, 7); // "2026-01"
}

/**
 * Alleen gevuld bij status "Geannuleerd": Rentman zet `project_total_price`
 * op 0 zodra een subproject geannuleerd wordt, maar `project_total_price_cancelled`
 * behoudt het offertebedrag van vóór de annulering (zie client.ts). Bewust
 * niet in `revenue` zelf verwerkt, zodat "gederfde omzet" nooit meetelt in
 * de actieve omzettotalen.
 */
function cancelledRevenueOf(sp: RentmanFinancialSubproject): number | null {
  if ((sp.status?.name ?? "") !== CANCELLED_STATUS) return null;
  return Number(sp.project_total_price_cancelled ?? 0);
}

/**
 * Annuleringsreden: een custom keuzelijst-veld op het Project ("Reden
 * annulering", `custom_9`), door de klant zelf toegevoegd in Rentman (sep
 * 2026). Rentman geeft alleen het ruwe keuze-ID terug (bv. "5"), geen tekst
 * -- deze koppeling is handmatig vastgesteld door één testinvoer te
 * vergelijken met de daadwerkelijke Rentman-UI (project "EVENTO - Stern
 * Partyservice Huussien", custom_9=5 -> "Event geannuleerd"). Er is geen
 * metadata-endpoint in de Rentman-API om keuzelijst-opties op te vragen, dus
 * deze mapping moet hier handmatig bijgewerkt worden als de klant een optie
 * toevoegt/wijzigt in Rentman. Onbekende/nieuwe ID's vallen terug op
 * `Onbekende reden (id <n>)` i.p.v. een crash of stille misclassificatie.
 */
const CANCELLATION_REASON_OPTIONS: Record<string, string> = {
  "0": "Niet bekend",
  "1": "Prijs",
  "2": "Datum bezet",
  "3": "Naar concurrent",
  "4": "Materiaal tekort",
  "5": "Event geannuleerd",
  "6": "Transportkosten",
  "7": "Geen reactie klant",
};

function cancellationReasonLabel(rawId: string | undefined): string | null {
  if (rawId === undefined) return null;
  return CANCELLATION_REASON_OPTIONS[rawId] ?? `Onbekende reden (id ${rawId})`;
}

/**
 * Bron aanvraag: het andere custom keuzelijst-veld op het Project (`custom_8`),
 * zelfde soort koppeling als CANCELLATION_REASON_OPTIONS hierboven -- ook
 * bevestigd via dezelfde testinvoer (project "EVENTO - Stern Partyservice
 * Huussien", custom_8=3 -> "Website"). In tegenstelling tot de
 * annuleringsreden geldt dit voor élk subproject, niet alleen geannuleerde
 * (elke aanvraag heeft een herkomst).
 */
const REQUEST_SOURCE_OPTIONS: Record<string, string> = {
  "0": "Niet bekend",
  "1": "Email",
  "2": "Telefoon",
  "3": "Website",
  "4": "Beurs/netwerk",
  "5": "Doorverwijzing",
};

function requestSourceLabel(rawId: string | undefined): string | null {
  if (rawId === undefined) return null;
  return REQUEST_SOURCE_OPTIONS[rawId] ?? `Onbekende bron (id ${rawId})`;
}

// businessUnitFor() verhuisde naar integrations/rentman/client.ts (2 sep 2026) --
// gedeeld met de projectsync (§10.6/§10.8, ProjectRentmanLink.rentmanBusinessUnit)
// zodat beide altijd dezelfde EVENTO/M&R Kampen/M&R Utrecht-classificatie gebruiken.

/**
 * Categorie: sleutelwoord-classificatie op de naam van het Rentman
 * project-type (project.project_type.name) -- er is geen expliciet
 * categorie-veld in Rentman. Onbekend/ontbrekend project-type valt terug op
 * "Overig", net als het referentiedashboard (v6.1) doet.
 */
function categoryOf(sp: RentmanFinancialSubproject): string {
  const typeName = (sp.project?.project_type?.name ?? "").toLowerCase();
  if (typeName.includes("foodtruck")) return "Foodtruck";
  if (typeName.includes("bbq")) return "BBQ";
  if (typeName.includes("food") || typeName.includes("buffet")) return "Catering";
  if (typeName.includes("verhuur")) return "Verhuur";
  return "Overig";
}

function cityOf(sp: RentmanFinancialSubproject): string | null {
  return sp.location?.visit_city || sp.location?.mailing_city || null;
}

export async function syncRentmanDashboard() {
  const year = new Date().getUTCFullYear();
  const [subprojects, invoices, projectCustomFields] = await Promise.all([
    fetchAllSubprojectsFinancial(year),
    fetchAllInvoicesForDashboard(year),
    fetchAllProjectCustomFields(),
  ]);
  // custom_9 = "Reden annulering", custom_8 = "Bron aanvraag" (zie
  // cancellationReasonLabel/requestSourceLabel hierboven) -- apart per
  // project opgehaald, want de geëxpandeerde Project-respons op
  // /subprojects bevat zelf geen `custom`-veld.
  const cancellationReasonByProjectId = new Map(
    projectCustomFields.map((p) => [String(p.id), p.custom?.custom_9])
  );
  const requestSourceByProjectId = new Map(
    projectCustomFields.map((p) => [String(p.id), p.custom?.custom_8])
  );

  // --- Ruwe subproject-snapshot (bron voor alle tabbladen) ---
  for (const sp of subprojects) {
    const month = monthKey(sp.created);
    if (!month || !sp.created) continue; // geen bruikbare aanmaakdatum, sla over
    const isCancelled = (sp.status?.name ?? "") === CANCELLED_STATUS;
    const projectId = sp.project?.id != null ? String(sp.project.id) : null;
    const data = {
      name: sp.name,
      rentmanProjectNumber: sp.project?.number != null ? String(sp.project.number) : null,
      status: sp.status?.name ?? "Onbekend",
      revenue: Number(sp.project_total_price ?? 0),
      cancelledRevenue: cancelledRevenueOf(sp),
      cancellationReason: isCancelled && projectId ? cancellationReasonLabel(cancellationReasonByProjectId.get(projectId)) : null,
      // Bron aanvraag geldt voor élk subproject, niet alleen geannuleerde --
      // elke aanvraag heeft een herkomst.
      requestSource: projectId ? requestSourceLabel(requestSourceByProjectId.get(projectId)) : null,
      invoiced: Number(sp.already_invoiced ?? 0),
      month,
      createdAt: new Date(sp.created),
      planperiodStart: sp.planperiod_start ? new Date(sp.planperiod_start) : null,
      planperiodEnd: sp.planperiod_end ? new Date(sp.planperiod_end) : null,
      city: cityOf(sp),
      businessUnit: businessUnitFor(sp),
      category: categoryOf(sp),
    };
    await prisma.rentmanSubprojectSnapshot.upsert({
      where: { rentmanSubprojectId: String(sp.id) },
      update: data,
      create: { rentmanSubprojectId: String(sp.id), ...data },
    });
  }
  // Rijen opruimen die niet meer in de verse jaarscope voorkomen (bv. omdat
  // het jaar is omgeslagen, of het subproject verwijderd is in Rentman) --
  // alleen als de verse ophaal daadwerkelijk iets opleverde (voorkomt dat
  // een lege/mislukte ophaal per ongeluk alles wegvaagt).
  const freshIds = subprojects.filter((sp) => sp.created).map((sp) => String(sp.id));
  if (freshIds.length > 0) {
    await prisma.rentmanSubprojectSnapshot.deleteMany({
      where: { rentmanSubprojectId: { notIn: freshIds } },
    });
  }

  // --- Gefactureerd per factuurdatum (voor Maandoverleg) ---
  const invoicedMonths = new Map<string, number>();
  for (const inv of invoices) {
    const month = monthKey(inv.date);
    if (!month) continue;
    const amount = Number(inv.price ?? 0);
    invoicedMonths.set(month, (invoicedMonths.get(month) ?? 0) + amount);
  }
  for (const [month, amount] of invoicedMonths) {
    await prisma.rentmanInvoicedMonthly.upsert({
      where: { month },
      update: { invoicedExclVat: amount },
      create: { month, invoicedExclVat: amount },
    });
  }
  // Zelfde opschoning als bij de subproject-snapshots hierboven.
  if (invoicedMonths.size > 0) {
    await prisma.rentmanInvoicedMonthly.deleteMany({
      where: { month: { notIn: [...invoicedMonths.keys()] } },
    });
  }

  return {
    subprojectCount: freshIds.length,
    monthCount: new Set(subprojects.map((sp) => monthKey(sp.created)).filter(Boolean)).size,
    pendingCount: subprojects.filter((sp) => ["Optie", "Aanvraag"].includes(sp.status?.name ?? "")).length,
    invoiceCount: invoices.length,
  };
}
