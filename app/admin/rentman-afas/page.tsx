import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { Card } from "@/components/ui";
import { RentmanAfasTabs } from "@/components/admin/rentman-afas/tabs";
import { ProjectExportTab } from "@/components/admin/rentman-afas/project-export-tab";
import { InvoiceExportTab } from "@/components/admin/rentman-afas/invoice-export-tab";

/**
 * Rentman -> AFAS overzicht/wachtrij (§10.8, 2 sep 2026) -- bewust los van
 * het financiële dashboard (/admin/rentman-financieel): op uitdrukkelijk
 * verzoek van de klant staat dit niet meer "in het dashboard". Twee
 * onderdelen, allebei al volledig aangesloten op een (nog niet bestaande)
 * AFAS-connector zodat alleen die laatste stap hoeft te worden ingevuld
 * zodra Willem een UpdateConnector vrijgeeft voor projectaanmaak resp.
 * verkoopboekingen.
 */
export default async function RentmanAfasPage() {
  await requireAdminScope("AFAS");

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [confirmedProjects, recentInvoices] = await Promise.all([
    prisma.project.findMany({
      where: { rentmanLink: { rentmanStatus: "Bevestigd", rentmanStatusChangedAt: { gte: oneWeekAgo } } },
      orderBy: { rentmanLink: { rentmanStatusChangedAt: "desc" } },
      include: { rentmanLink: true },
    }),
    prisma.rentmanInvoiceExport.findMany({
      where: { invoiceDate: { gte: oneWeekAgo } },
      orderBy: { invoiceDate: "desc" },
    }),
  ]);

  const projectConnectorConfigured = Boolean(process.env.AFAS_PROJECT_CONNECTOR);
  const invoiceConnectorConfigured = Boolean(process.env.AFAS_DELIVERY_NOTE_CONNECTOR);

  return (
    // Full-bleed t.o.v. de max-w-2xl van app/admin/layout.tsx -- de tabellen
    // hier (6-8 kolommen) pasten niet leesbaar binnen die breedte (op
    // verzoek van de klant verbreed, 3 sep 2026). Zelfde CSS-truc als
    // /admin/rentman-financieel (§10.5).
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 py-2">
        <div>
          <h1 className="text-xl font-semibold text-red-800">Rentman → AFAS</h1>
          <p className="text-sm text-slate-500">
            Recent bevestigde projecten en recente verkoopfacturen die naar AFAS moeten -- klaar om direct te
            verzenden zodra de AFAS-koppeling daarvoor geactiveerd is.
          </p>
        </div>

        <Card>
          <RentmanAfasTabs
            tabs={[
              {
                id: "projecten",
                label: "🏗️ Projecten",
                content: (
                  <ProjectExportTab
                    connectorConfigured={projectConnectorConfigured}
                    rows={confirmedProjects.map((p) => ({
                      projectId: p.id,
                      name: p.rentmanLink?.rentmanProjectName ?? p.name,
                      rentmanProjectNumber: p.rentmanLink?.rentmanProjectNumber ?? null,
                      rentmanStartsAt: p.rentmanLink?.rentmanStartsAt?.toISOString() ?? null,
                      rentmanEndsAt: p.rentmanLink?.rentmanEndsAt?.toISOString() ?? null,
                      rentmanStatusChangedAt: p.rentmanLink?.rentmanStatusChangedAt?.toISOString() ?? null,
                      afasCreateRequestedAt: p.rentmanLink?.afasCreateRequestedAt?.toISOString() ?? null,
                      afasCreateStatus: p.rentmanLink?.afasCreateStatus ?? "PENDING",
                      afasCreateError: p.rentmanLink?.afasCreateError ?? null,
                    }))}
                  />
                ),
              },
              {
                id: "facturen",
                label: "🧾 Verkoopfacturen",
                content: (
                  <InvoiceExportTab
                    connectorConfigured={invoiceConnectorConfigured}
                    rows={recentInvoices.map((i) => ({
                      id: i.id,
                      invoiceNumber: i.invoiceNumber,
                      invoiceDate: i.invoiceDate?.toISOString() ?? null,
                      amountExclVat: i.amountExclVat != null ? Number(i.amountExclVat) : null,
                      rentmanProjectNumber: i.rentmanProjectNumber,
                      projectName: i.projectName,
                      customerName: i.customerName,
                      pdfFileId: i.pdfFileId,
                      afasCreateRequestedAt: i.afasCreateRequestedAt?.toISOString() ?? null,
                      afasCreateStatus: i.afasCreateStatus,
                      afasCreateError: i.afasCreateError,
                    }))}
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
