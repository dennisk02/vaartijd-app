import { prisma } from "@/lib/prisma";
import { isRentmanConfigured } from "@/lib/rentman/client";
import { requireAdminScope } from "@/lib/dal";
import { RentmanDashboardSyncControls } from "@/components/admin/rentman-dashboard/sync-controls";
import { RentmanDashboardTabs } from "@/components/admin/rentman-dashboard/tabs";
import { OverviewTab } from "@/components/admin/rentman-dashboard/overview-tab";
import { PerMonthTab } from "@/components/admin/rentman-dashboard/per-month-tab";
import { CancelledTab } from "@/components/admin/rentman-dashboard/cancelled-tab";
import { MaandoverlegTab } from "@/components/admin/rentman-dashboard/maandoverleg-tab";
import { FollowUpTab } from "@/components/admin/rentman-dashboard/follow-up-tab";
import { PendingTab } from "@/components/admin/rentman-dashboard/pending-tab";
import { dash } from "@/components/admin/rentman-dashboard/colors";
import type { Subproject } from "@/lib/rentman/dashboardAggregate";

export default async function RentmanFinancieelPage() {
  await requireAdminScope("RENTMAN_FINANCIEEL");
  const configured = isRentmanConfigured();

  const [snapshotRows, invoicedMonthly] = await Promise.all([
    prisma.rentmanSubprojectSnapshot.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.rentmanInvoicedMonthly.findMany({ orderBy: { month: "asc" } }),
  ]);

  const subs: Subproject[] = snapshotRows.map((r) => ({
    id: r.rentmanSubprojectId,
    name: r.name,
    projectNumber: r.rentmanProjectNumber,
    status: r.status,
    revenue: Number(r.revenue),
    cancelledRevenue: r.cancelledRevenue != null ? Number(r.cancelledRevenue) : null,
    invoiced: Number(r.invoiced),
    month: r.month,
    createdAt: r.createdAt,
    planperiodStart: r.planperiodStart,
    planperiodEnd: r.planperiodEnd,
  }));

  const months = [...new Set(subs.map((s) => s.month))].sort();
  const lastComputed = snapshotRows.length > 0 ? snapshotRows.reduce((max, r) => (r.computedAt > max ? r.computedAt : max), snapshotRows[0].computedAt) : null;

  return (
    // Full-bleed t.o.v. de max-w-2xl van app/admin/layout.tsx -- dit dashboard
    // mag (op uitdrukkelijk verzoek van de klant) de volledige paginabreedte
    // gebruiken, i.t.t. de rest van het beheerscherm.
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8" style={{ background: dash.bg }}>
      <div className="mx-auto flex max-w-[1700px] flex-col gap-3.5 py-4" style={{ background: dash.bg, color: dash.text }}>
        {!configured && (
          <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: dash.warnBg, borderLeft: `3px solid ${dash.orange}`, color: dash.warnText }}>
            Rentman-koppeling is nog niet geconfigureerd. Vul <code>RENTMAN_API_TOKEN</code> in via de
            omgevingsvariabelen.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold" style={{ color: dash.heading }}>
              Rentman Dashboard — Moods &amp; Roots
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: dash.green }}>
                LIVE {new Date().getFullYear()}
              </span>
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: dash.muted }}>
              {lastComputed ? `Live data · ${lastComputed.toLocaleString("nl-NL")}` : "Nog niet berekend"} · {subs.length} projecten
              · Excl. BTW
            </p>
          </div>
          <RentmanDashboardSyncControls />
        </div>

        {subs.length === 0 ? (
          <div className="rounded-[10px] border p-4 text-sm" style={{ background: dash.panel, borderColor: dash.border, color: dash.muted }}>
            Nog geen data berekend. Klik op &quot;Nu herberekenen&quot; hierboven om de eerste berekening te
            starten.
          </div>
        ) : (
          <RentmanDashboardTabs
            tabs={[
              { id: "overzicht", label: "📈 Omzet & Facturatie", content: <OverviewTab subs={subs} /> },
              { id: "projecten", label: "📋 Projecten per maand", content: <PerMonthTab subs={subs} months={months} /> },
              { id: "geannuleerd", label: "❌ Geannuleerd", content: <CancelledTab subs={subs} months={months} /> },
              {
                id: "maandoverleg",
                label: "📝 Maandoverleg",
                content: (
                  <MaandoverlegTab
                    invoicedMonthly={invoicedMonthly.map((r) => ({ month: r.month, invoicedExclVat: Number(r.invoicedExclVat) }))}
                  />
                ),
              },
              { id: "opvolging", label: "⚠ Opvolging", content: <FollowUpTab subs={subs} /> },
              { id: "inoptie", label: "🔴 In optie & aanvraag", content: <PendingTab subs={subs} /> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
