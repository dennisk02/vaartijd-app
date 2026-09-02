import "server-only";
import { prisma } from "@/lib/prisma";
import { fetchRecentInvoicesForExport, fetchAllInvoiceFilesSince } from "@/integrations/rentman/client";

/// Veiligheidsmarge net als bij ProjectRentmanLink (§10.4): de pagina zelf
/// toont alleen de laatste week, maar deze sync haalt een ruimer venster op
/// zodat een gemiste sync-run geen facturen laat verdwijnen uit de wachtrij.
const SYNC_WINDOW_DAYS = 60;

/**
 * Ververst RentmanInvoiceExport met alle facturen van de laatste
 * SYNC_WINDOW_DAYS dagen (§10.8) -- draait via de Rentman-cron
 * (app/api/rentman/sync/route.ts) en handmatig via de "Nu bijwerken"-knop op
 * /admin/rentman-afas. Bestaande checklist-/AFAS-sync-status
 * (afasCreateRequestedAt/afasCreateStatus/...) blijft bij een hersync
 * onaangeroerd -- alleen de Rentman-brongegevens worden bijgewerkt.
 */
export async function syncRecentRentmanInvoices() {
  const since = new Date();
  since.setDate(since.getDate() - SYNC_WINDOW_DAYS);
  const sinceIso = since.toISOString();

  const [invoices, files] = await Promise.all([
    fetchRecentInvoicesForExport(sinceIso),
    fetchAllInvoiceFilesSince(sinceIso),
  ]);

  const pdfFileIdByInvoiceId = new Map<string, string>();
  for (const file of files) {
    if (file.file_item != null) {
      pdfFileIdByInvoiceId.set(String(file.file_item), String(file.id));
    }
  }

  for (const invoice of invoices) {
    const rentmanInvoiceId = String(invoice.id);
    // Rentman heeft geen los "factuurnummer"-veld op de invoices-resource --
    // de gegenereerde `displayname` ("Factuur V21260350") is de enige bron.
    const invoiceNumber = invoice.displayname?.replace(/^Factuur\s+/i, "").trim() || null;

    const fields = {
      invoiceNumber,
      invoiceDate: invoice.date ? new Date(invoice.date) : null,
      amountExclVat: invoice.price != null ? Number(invoice.price) : null,
      amountInclVat: invoice.price_invat != null ? Number(invoice.price_invat) : null,
      rentmanProjectNumber:
        invoice.project?.number !== undefined && invoice.project?.number !== null ? String(invoice.project.number) : null,
      projectName: invoice.project?.name ?? null,
      customerName: invoice.customer?.name ?? null,
      pdfFileId: pdfFileIdByInvoiceId.get(rentmanInvoiceId) ?? null,
    };

    await prisma.rentmanInvoiceExport.upsert({
      where: { rentmanInvoiceId },
      update: fields,
      create: { rentmanInvoiceId, ...fields },
    });
  }

  return { invoiceCount: invoices.length };
}
