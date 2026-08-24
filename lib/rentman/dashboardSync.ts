import "server-only";
import { prisma } from "@/lib/prisma";
import {
  fetchAllSubprojectsFinancial,
  fetchAllInvoicesForDashboard,
  type RentmanFinancialSubproject,
} from "@/lib/rentman/client";

/**
 * Berekent het financiële Rentman-dashboard (omzet/facturatie/opties/
 * annuleringen) en slaat het vooraf-berekend op, zodat de admin-pagina's
 * direct laden. Draait 's nachts via cron (of handmatig via /admin/rentman).
 * Alleen lezend richting Rentman -- zelfde principe als de projectsync.
 */

/// Alleen deze twee statussen tellen als "nog open, actie nodig" voor
/// Opvolging / In optie & aanvraag -- afgesproken met de klant, geen extra
/// termijn-/datumlogica.
const PENDING_STATUSES = ["Optie", "Aanvraag"];
const CANCELLED_STATUS = "Geannuleerd";

function monthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  return dateStr.slice(0, 7); // "2026-01"
}

type MonthAgg = {
  projectCount: number;
  totalRevenue: number;
  totalInvoiced: number;
  statusBreakdown: Record<string, { count: number; revenue: number; invoiced: number }>;
  cancelledCount: number;
  cancelledRevenue: number;
  topCancelled: { name: string; number: string | null; amount: number } | null;
};

function aggregateByMonth(subprojects: RentmanFinancialSubproject[]) {
  const months = new Map<string, MonthAgg>();

  for (const sp of subprojects) {
    const month = monthKey(sp.created);
    if (!month) continue;
    const revenue = Number(sp.project_total_price ?? 0);
    const invoiced = Number(sp.already_invoiced ?? 0);
    const statusName = sp.status?.name ?? "Onbekend";

    let agg = months.get(month);
    if (!agg) {
      agg = {
        projectCount: 0,
        totalRevenue: 0,
        totalInvoiced: 0,
        statusBreakdown: {},
        cancelledCount: 0,
        cancelledRevenue: 0,
        topCancelled: null,
      };
      months.set(month, agg);
    }
    agg.projectCount++;
    agg.totalRevenue += revenue;
    agg.totalInvoiced += invoiced;

    const statusAgg = agg.statusBreakdown[statusName] ?? { count: 0, revenue: 0, invoiced: 0 };
    statusAgg.count++;
    statusAgg.revenue += revenue;
    statusAgg.invoiced += invoiced;
    agg.statusBreakdown[statusName] = statusAgg;

    if (statusName === CANCELLED_STATUS) {
      agg.cancelledCount++;
      agg.cancelledRevenue += revenue;
      if (!agg.topCancelled || revenue > agg.topCancelled.amount) {
        agg.topCancelled = {
          name: sp.name,
          number: sp.project?.number != null ? String(sp.project.number) : null,
          amount: revenue,
        };
      }
    }
  }

  return months;
}

export async function syncRentmanDashboard() {
  const year = new Date().getUTCFullYear();
  const [subprojects, invoices] = await Promise.all([
    fetchAllSubprojectsFinancial(year),
    fetchAllInvoicesForDashboard(year),
  ]);

  // --- Maandsnapshot (op aanmaakmaand van het subproject) ---
  const months = aggregateByMonth(subprojects);
  for (const [month, agg] of months) {
    const data = {
      projectCount: agg.projectCount,
      totalRevenue: agg.totalRevenue,
      totalInvoiced: agg.totalInvoiced,
      statusBreakdown: agg.statusBreakdown,
      cancelledCount: agg.cancelledCount,
      cancelledRevenue: agg.cancelledRevenue,
      topCancelledName: agg.topCancelled?.name ?? null,
      topCancelledNumber: agg.topCancelled?.number ?? null,
      topCancelledAmount: agg.topCancelled?.amount ?? null,
    };
    await prisma.rentmanMonthlySnapshot.upsert({
      where: { month },
      update: data,
      create: { month, ...data },
    });
  }
  // Oude maandsnapshots opruimen die buiten de huidige jaarscope vallen (bv.
  // nog aanwezig van vóór de invoering van de jaarfilter) -- alleen als de
  // verse ophaal daadwerkelijk maanden opleverde, zelfde veiligheidsprincipe
  // als bij de Opvolging-opschoning hieronder.
  if (months.size > 0) {
    await prisma.rentmanMonthlySnapshot.deleteMany({
      where: { month: { notIn: [...months.keys()] } },
    });
  }

  // --- Opvolging / In optie & aanvraag: alleen status Optie of Aanvraag ---
  const pending = subprojects.filter((sp) => PENDING_STATUSES.includes(sp.status?.name ?? ""));
  for (const sp of pending) {
    const month = monthKey(sp.created) ?? monthKey(sp.planperiod_start) ?? "onbekend";
    const data = {
      name: sp.name,
      rentmanProjectNumber: sp.project?.number != null ? String(sp.project.number) : null,
      status: sp.status?.name ?? "Onbekend",
      revenue: Number(sp.project_total_price ?? 0),
      planperiodStart: sp.planperiod_start ? new Date(sp.planperiod_start) : null,
      month,
    };
    await prisma.rentmanPendingProject.upsert({
      where: { rentmanSubprojectId: String(sp.id) },
      update: data,
      create: { rentmanSubprojectId: String(sp.id), ...data },
    });
  }
  // Rijen opruimen die niet meer Optie/Aanvraag zijn -- alleen als de verse
  // ophaal daadwerkelijk iets opleverde (voorkomt dat een lege/mislukte
  // ophaal per ongeluk alles wegvaagt).
  if (pending.length > 0) {
    await prisma.rentmanPendingProject.deleteMany({
      where: { rentmanSubprojectId: { notIn: pending.map((sp) => String(sp.id)) } },
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
  // Zelfde opschoning als bij de maandsnapshots hierboven.
  if (invoicedMonths.size > 0) {
    await prisma.rentmanInvoicedMonthly.deleteMany({
      where: { month: { notIn: [...invoicedMonths.keys()] } },
    });
  }

  return {
    subprojectCount: subprojects.length,
    monthCount: months.size,
    pendingCount: pending.length,
    invoiceCount: invoices.length,
  };
}
