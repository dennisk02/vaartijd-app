import { NextResponse } from "next/server";
import { requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { fetchInvoiceFileUrl } from "@/integrations/rentman/client";

/// Leidt door naar een verse getekende Rentman-S3-URL (elke keer opnieuw
/// opgehaald, i.p.v. de URL zelf op te slaan -- die is maar ~10 uur geldig).
/// Puur lezend, dus requireAdminScope (geen -Write): een kijktoegang-account
/// mag een factuur-PDF gewoon bekijken.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminScope("AFAS");
  const { id } = await params;

  const row = await prisma.rentmanInvoiceExport.findUnique({ where: { id }, select: { pdfFileId: true } });
  if (!row?.pdfFileId) {
    return NextResponse.json({ error: "Geen PDF gekoppeld aan deze factuur." }, { status: 404 });
  }

  const url = await fetchInvoiceFileUrl(row.pdfFileId);
  if (!url) {
    return NextResponse.json({ error: "Kon de PDF niet ophalen uit Rentman." }, { status: 502 });
  }

  return NextResponse.redirect(url);
}
