import "server-only";
import { prisma } from "@/lib/prisma";
import { afasFetch, isAfasConfigured, AfasApiError } from "@/integrations/afas/client";
import { fetchInvoiceFileUrl } from "@/integrations/rentman/client";

/// Nog geen geautoriseerde AFAS-UpdateConnector voor verkoopboekingen (zie
/// HANDOVER §10.4/§10.8) -- zelfde opzet als AFAS_PROJECT_CONNECTOR.
const AFAS_INVOICE_CONNECTOR = process.env.AFAS_INVOICE_CONNECTOR;

type InvoiceForAfas = {
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  amountExclVat: unknown;
  rentmanProjectNumber: string | null;
  pdfFileId: string | null;
};

/** Haalt de factuur-PDF op en zet 'm om naar base64 -- bevestigd te werken
 * via het gewone RENTMAN_API_TOKEN (2 sep 2026, zie HANDOVER §10.4). */
async function fetchInvoicePdfBase64(fileId: string): Promise<string | null> {
  const url = await fetchInvoiceFileUrl(fileId);
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * Bouwt de payload voor de (nog niet bestaande) AFAS-verkoopboekings-
 * connector. LET OP: net als bij projectSync.ts is dit een beste-inschatting
 * -- NIET bevestigd via metainfo (die connector bestaat nog niet). Het
 * bijvoegen van de PDF als `FileName`/`FileStream` volgt AFAS' gebruikelijke
 * generieke bijlage-patroon voor UpdateConnectors, maar is voor déze
 * connector niet apart geverifieerd -- controleer dit via metainfo zodra de
 * connector bestaat.
 */
function mapInvoiceToAfas(invoice: InvoiceForAfas, pdfBase64: string | null) {
  return {
    [AFAS_INVOICE_CONNECTOR ?? "SalesInvoice"]: {
      Element: {
        Fields: {
          // Aanname: factuurnummer, -datum, bedrag excl. btw, projectkenmerk.
          InvoiceNumber: invoice.invoiceNumber,
          Date: invoice.invoiceDate?.toISOString().slice(0, 10),
          Amount: Number(invoice.amountExclVat ?? 0),
          ExternalProjectId: invoice.rentmanProjectNumber,
        },
        ...(pdfBase64
          ? {
              Files: {
                FileName: `${invoice.invoiceNumber ?? "factuur"}.pdf`,
                FileStream: pdfBase64,
              },
            }
          : {}),
      },
    },
  };
}

async function updateStatus(
  id: string,
  data: { afasCreateStatus: "PENDING" | "SYNCED" | "ERROR"; afasCreateSyncedAt?: Date; afasCreateError?: string | null }
) {
  await prisma.rentmanInvoiceExport.update({ where: { id }, data });
}

export async function sendInvoiceToAfas(id: string) {
  const invoice = await prisma.rentmanInvoiceExport.findUnique({
    where: { id },
    select: { invoiceNumber: true, invoiceDate: true, amountExclVat: true, rentmanProjectNumber: true, pdfFileId: true },
  });
  if (!invoice) return;

  if (!isAfasConfigured() || !AFAS_INVOICE_CONNECTOR) {
    await updateStatus(id, {
      afasCreateStatus: "PENDING",
      afasCreateError: "AFAS_INVOICE_CONNECTOR is nog niet ingesteld -- wacht op een geautoriseerde connector (zie HANDOVER §10.8).",
    });
    return;
  }

  try {
    const pdfBase64 = invoice.pdfFileId ? await fetchInvoicePdfBase64(invoice.pdfFileId) : null;
    const payload = mapInvoiceToAfas(invoice, pdfBase64);
    await afasFetch(`connectors/${AFAS_INVOICE_CONNECTOR}`, { method: "POST", body: payload });
    await updateStatus(id, { afasCreateStatus: "SYNCED", afasCreateSyncedAt: new Date(), afasCreateError: null });
  } catch (error) {
    const message = error instanceof AfasApiError ? error.message : "Onbekende fout bij boeken van verkoopfactuur in AFAS.";
    await updateStatus(id, { afasCreateStatus: "ERROR", afasCreateError: message });
  }
}

/** Verzendt alle geselecteerde (afasCreateRequestedAt gezet, nog niet SYNCED) facturen. */
export async function sendSelectedInvoicesToAfas() {
  const rows = await prisma.rentmanInvoiceExport.findMany({
    where: { afasCreateRequestedAt: { not: null }, afasCreateStatus: { not: "SYNCED" } },
    select: { id: true },
  });
  for (const row of rows) {
    await sendInvoiceToAfas(row.id);
  }
  return rows.length;
}
