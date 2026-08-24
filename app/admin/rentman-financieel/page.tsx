import { prisma } from "@/lib/prisma";
import { isRentmanConfigured } from "@/lib/rentman/client";
import { Card } from "@/components/ui";
import { RentmanDashboardSyncControls } from "@/components/admin/rentman-dashboard/sync-controls";
import { RentmanDashboardTabs } from "@/components/admin/rentman-dashboard/tabs";
import { OverviewTab } from "@/components/admin/rentman-dashboard/overview-tab";
import { PerMonthTab, type StatusBreakdown } from "@/components/admin/rentman-dashboard/per-month-tab";
import { CancelledTab } from "@/components/admin/rentman-dashboard/cancelled-tab";
import { MaandoverlegTab } from "@/components/admin/rentman-dashboard/maandoverleg-tab";
import { PendingTab } from "@/components/admin/rentman-dashboard/pending-tab";

export default async function RentmanFinancieelPage() {
  const configured = isRentmanConfigured();

  const [snapshots, invoicedMonthly, pending, manualEntries] = await Promise.all([
    prisma.rentmanMonthlySnapshot.findMany({ orderBy: { month: "asc" } }),
    prisma.rentmanInvoicedMonthly.findMany({ orderBy: { month: "asc" } }),
    prisma.rentmanPendingProject.findMany({ orderBy: { revenue: "desc" } }),
    prisma.rentmanManualMonthlyEntry.findMany({ orderBy: [{ month: "desc" }, { location: "asc" }] }),
  ]);

  const lastComputed = snapshots.length > 0 ? snapshots[snapshots.length - 1].computedAt : null;

  const months = snapshots.map((s) => s.month);
  const monthPoints = snapshots.map((s) => ({
    month: s.month,
    projectCount: s.projectCount,
    totalRevenue: Number(s.totalRevenue),
    totalInvoiced: Number(s.totalInvoiced),
  }));
  const pendingRevenue = pending.reduce((sum, p) => sum + Number(p.revenue), 0);
  const cancelledRevenue = snapshots.reduce((sum, s) => sum + Number(s.cancelledRevenue), 0);
  const cancelledCount = snapshots.reduce((sum, s) => sum + s.cancelledCount, 0);

  return (
    <div className="flex flex-col gap-6">
      {!configured && (
        <Card className="border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-800">
            Rentman-koppeling is nog niet geconfigureerd. Vul <code>RENTMAN_API_TOKEN</code> in via de
            omgevingsvariabelen.
          </p>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-medium text-slate-800">Rentman financieel dashboard</h1>
            <p className="text-sm text-slate-500">
              Omzet, facturatie, annuleringen en openstaande opties/aanvragen -- draait elke nacht automatisch
              mee met de Rentman-projectsync. Alleen lezend richting Rentman.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Laatst berekend: {lastComputed ? new Date(lastComputed).toLocaleString("nl-NL") : "nog niet uitgevoerd"}
            </p>
          </div>
          <RentmanDashboardSyncControls />
        </div>
      </Card>

      {snapshots.length === 0 ? (
        <Card className="text-sm text-slate-500">
          Nog geen data berekend. Klik op &quot;Nu herberekenen&quot; hierboven om de eerste berekening te
          starten.
        </Card>
      ) : (
        <RentmanDashboardTabs
          tabs={[
            {
              id: "overzicht",
              label: "Omzet & facturatie",
              content: (
                <OverviewTab
                  points={monthPoints}
                  pendingRevenue={pendingRevenue}
                  cancelledRevenue={cancelledRevenue}
                  cancelledCount={cancelledCount}
                />
              ),
            },
            {
              id: "permaand",
              label: "Per maand",
              content: (
                <PerMonthTab
                  months={snapshots.map((s) => ({
                    month: s.month,
                    totalRevenue: Number(s.totalRevenue),
                    statusBreakdown: s.statusBreakdown as StatusBreakdown,
                  }))}
                />
              ),
            },
            {
              id: "geannuleerd",
              label: "Geannuleerd",
              content: (
                <CancelledTab
                  points={snapshots.map((s) => ({
                    month: s.month,
                    cancelledCount: s.cancelledCount,
                    cancelledRevenue: Number(s.cancelledRevenue),
                    topCancelledName: s.topCancelledName,
                    topCancelledNumber: s.topCancelledNumber,
                    topCancelledAmount: s.topCancelledAmount != null ? Number(s.topCancelledAmount) : null,
                  }))}
                />
              ),
            },
            {
              id: "maandoverleg",
              label: "Maandoverleg",
              content: (
                <MaandoverlegTab
                  invoicedMonthly={invoicedMonthly.map((r) => ({ month: r.month, invoicedExclVat: Number(r.invoicedExclVat) }))}
                  manualEntries={manualEntries.map((e) => ({
                    id: e.id,
                    month: e.month,
                    location: e.location,
                    revenueTotal: e.revenueTotal != null ? Number(e.revenueTotal) : null,
                    deliveryRevenue: e.deliveryRevenue != null ? Number(e.deliveryRevenue) : null,
                    pickupRevenue: e.pickupRevenue != null ? Number(e.pickupRevenue) : null,
                    newRequests: e.newRequests,
                    inOption: e.inOption,
                    confirmed: e.confirmed,
                    cancelled: e.cancelled,
                    note: e.note,
                  }))}
                  months={months}
                />
              ),
            },
            {
              id: "opvolging",
              label: "Opvolging (optie & aanvraag)",
              content: (
                <PendingTab
                  projects={pending.map((p) => ({
                    id: p.id,
                    name: p.name,
                    rentmanProjectNumber: p.rentmanProjectNumber,
                    status: p.status,
                    revenue: Number(p.revenue),
                    planperiodStart: p.planperiodStart,
                  }))}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
