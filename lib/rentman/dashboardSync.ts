import "server-only";
import { prisma } from "@/lib/prisma";
import {
  fetchAllSubprojectsFinancial,
  fetchAllInvoicesForDashboard,
  type RentmanFinancialSubproject,
} from "@/lib/rentman/client";

/**
 * Ververst de ruwe brondata van het financiële Rentman-dashboard (omzet/
 * facturatie/opties/annuleringen). Draait 's nachts via cron (of handmatig
 * via /admin/rentman-financieel). Alleen lezend richting Rentman -- zelfde
 * principe als de projectsync.
 *
 * Slaat bewust GEEN vooraf-geaggregeerde cijfers op -- elk subproject wordt
 * los bewaard in `RentmanSubprojectSnapshot`, en alle KPI's/grafieken/
 * tabellen van de 5 tabbladen worden er bij het opbouwen van de pagina uit
 * afgeleid (zie lib/rentman/dashboardAggregate.ts). Bij ~800 rijen is dat
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
 * Business unit: projectnaam start met "EVENTO" -> EVENTO; anders bepaald
 * via het magazijn (`asset_location_from`, bv. "/stocklocations/4"):
 * /stocklocations/4 -> M&R Utrecht, /stocklocations/1 -> M&R Kampen,
 * onbekend/leeg (bv. oude projecten van vóór de magazijn-koppeling) valt
 * terug op M&R Kampen. Rechtstreeks overgenomen uit het referentiedashboard
 * (v6.1), waar dit expliciet als correcte fallback bevestigd is.
 */
function businessUnitOf(sp: RentmanFinancialSubproject): string {
  if (sp.name.trim().toUpperCase().startsWith("EVENTO")) return "EVENTO";
  if (sp.asset_location_from === "/stocklocations/4") return "M&R Utrecht";
  return "M&R Kampen";
}

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
  const [subprojects, invoices] = await Promise.all([
    fetchAllSubprojectsFinancial(year),
    fetchAllInvoicesForDashboard(year),
  ]);

  // --- Ruwe subproject-snapshot (bron voor alle tabbladen) ---
  for (const sp of subprojects) {
    const month = monthKey(sp.created);
    if (!month || !sp.created) continue; // geen bruikbare aanmaakdatum, sla over
    const data = {
      name: sp.name,
      rentmanProjectNumber: sp.project?.number != null ? String(sp.project.number) : null,
      status: sp.status?.name ?? "Onbekend",
      revenue: Number(sp.project_total_price ?? 0),
      cancelledRevenue: cancelledRevenueOf(sp),
      invoiced: Number(sp.already_invoiced ?? 0),
      month,
      createdAt: new Date(sp.created),
      planperiodStart: sp.planperiod_start ? new Date(sp.planperiod_start) : null,
      planperiodEnd: sp.planperiod_end ? new Date(sp.planperiod_end) : null,
      city: cityOf(sp),
      businessUnit: businessUnitOf(sp),
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
