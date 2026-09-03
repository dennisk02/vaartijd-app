import "server-only";
import { prisma } from "@/lib/prisma";
import { afasFetch, isAfasConfigured, afasErrorMessage } from "@/integrations/afas/client";
import { fetchInvoiceFileUrl, fetchInvoiceLines } from "@/integrations/rentman/client";

/// Connector-naam bevestigd door Willem van Melis/Royaal (2 sep 2026, zie
/// HANDOVER §10.8): niet een directe verkoopfactuur-connector, maar
/// "FbDeliveryNote" -- we maken een gereed gemelde pakbon aan (met de
/// factuur-PDF als bijlage), die AFAS zelf kan omzetten naar een
/// verkoopfactuur. Vul die letterlijk in als AFAS_DELIVERY_NOTE_CONNECTOR
/// zodra hij geautoriseerd is (metainfo/update/FbDeliveryNote gaf op
/// 2 sep 2026 nog een 500).
const AFAS_DELIVERY_NOTE_CONNECTOR = process.env.AFAS_DELIVERY_NOTE_CONNECTOR;

type InvoiceForAfas = {
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  rentmanProjectNumber: string | null;
  pdfFileId: string | null;
};

/** Haalt de factuur-PDF op en zet 'm om naar base64 -- bevestigd te werken
 * via het gewone RENTMAN_API_TOKEN (2 sep 2026, zie HANDOVER §10.4/§10.8). */
async function fetchInvoicePdfBase64(fileId: string): Promise<string | null> {
  const url = await fetchInvoiceFileUrl(fileId);
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * Bouwt de payload voor de (nog niet geautoriseerde) AFAS FbDeliveryNote-
 * UpdateConnector. LET OP: dit is een beste-inschatting-structuur, NIET
 * bevestigd via metainfo (die connector bestaat nog niet voor onze
 * omgeving). Verifieer/pas aan zodra `metainfo/update/FbDeliveryNote`
 * beschikbaar is.
 *
 * De regels komen uit Rentmans `invoicelines` (integrations/rentman/client.ts,
 * fetchInvoiceLines) -- dat zijn grootboek-/btw-samenvattingsregels (per
 * grootboekcode, bv. "Omzet verhuurde materialen"/8060), NIET de product-/
 * dienstregels van de factuur-PDF zelf (die blijven zichtbaar via de
 * bijgevoegde PDF, niet via de API terug te halen -- afhankelijk van het
 * gebruikte documentsjabloon in Rentman). Voor een boeking is dat precies
 * wat nodig is: elke regel heeft al een grootboekcode + btw-tarief.
 */
function mapInvoiceToAfas(
  invoice: InvoiceForAfas,
  lines: { ledgercode: string | null; vatrate: number | null; priceincl: number | null }[],
  pdfBase64: string | null
) {
  return {
    [AFAS_DELIVERY_NOTE_CONNECTOR ?? "FbDeliveryNote"]: {
      Element: {
        Fields: {
          // Aanname: pakbonnummer/-datum, projectkenmerk, "gereed gemeld".
          OrNu: invoice.invoiceNumber,
          Date: invoice.invoiceDate?.toISOString().slice(0, 10),
          ExternalProjectId: invoice.rentmanProjectNumber,
          Reported: true,
        },
        Objects: {
          FbDeliveryNoteLines: {
            Element: lines.map((line) => ({
              Fields: {
                // Aanname: grootboekcode, btw-tarief, bedrag incl. btw.
                GlAc: line.ledgercode,
                VaRc: line.vatrate,
                Am: line.priceincl,
              },
            })),
          },
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
    select: { rentmanInvoiceId: true, invoiceNumber: true, invoiceDate: true, rentmanProjectNumber: true, pdfFileId: true },
  });
  if (!invoice) return;

  if (!isAfasConfigured() || !AFAS_DELIVERY_NOTE_CONNECTOR) {
    await updateStatus(id, {
      afasCreateStatus: "PENDING",
      afasCreateError:
        "AFAS_DELIVERY_NOTE_CONNECTOR is nog niet ingesteld -- FbDeliveryNote is bevestigd als benodigde connector (zie HANDOVER §10.8), maar nog niet geautoriseerd voor onze AFAS-omgeving.",
    });
    return;
  }

  try {
    const [lines, pdfBase64] = await Promise.all([
      fetchInvoiceLines(invoice.rentmanInvoiceId),
      invoice.pdfFileId ? fetchInvoicePdfBase64(invoice.pdfFileId) : Promise.resolve(null),
    ]);
    const payload = mapInvoiceToAfas(
      invoice,
      lines.map((l) => ({ ledgercode: l.ledgercode ?? null, vatrate: l.vatrate ?? null, priceincl: l.priceincl ?? null })),
      pdfBase64
    );
    await afasFetch(`connectors/${AFAS_DELIVERY_NOTE_CONNECTOR}`, { method: "POST", body: payload });
    await updateStatus(id, { afasCreateStatus: "SYNCED", afasCreateSyncedAt: new Date(), afasCreateError: null });
  } catch (error) {
    const message = afasErrorMessage(error, "Onbekende fout bij aanmaken pakbon in AFAS.");
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
