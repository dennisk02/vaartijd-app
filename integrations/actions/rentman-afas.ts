"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScopeWrite } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { syncRecentRentmanInvoices } from "@/integrations/rentman/invoiceExportSync";
import { sendSelectedProjectsToAfas } from "@/integrations/afas/projectSync";
import { sendSelectedInvoicesToAfas } from "@/integrations/afas/invoiceSync";
import { RentmanApiError } from "@/integrations/rentman/client";

const PAGE_PATH = "/admin/rentman-afas";

export type RentmanAfasState = { message?: string; error?: string } | undefined;

/** Selecteert/deselecteert een recent bevestigd project als "klaar voor AFAS"
 * -- puur wachtrij zolang AFAS_PROJECT_CONNECTOR niet bestaat (zie
 * projectSync.ts). Vervangt de gelijknamige actie die voorheen op het
 * financiële dashboard stond (2 sep 2026, verplaatst naar deze losse pagina). */
export async function toggleProjectAfasExport(projectId: string, requested: boolean) {
  await requireAdminScopeWrite("AFAS");
  await prisma.projectRentmanLink.update({
    where: { projectId },
    data: { afasCreateRequestedAt: requested ? new Date() : null },
  });
  revalidatePath(PAGE_PATH);
}

/** Zelfde, voor een verkoopfactuur. */
export async function toggleInvoiceAfasExport(invoiceExportId: string, requested: boolean) {
  await requireAdminScopeWrite("AFAS");
  await prisma.rentmanInvoiceExport.update({
    where: { id: invoiceExportId },
    data: { afasCreateRequestedAt: requested ? new Date() : null },
  });
  revalidatePath(PAGE_PATH);
}

/** Haalt recente facturen opnieuw op uit Rentman (handmatige tegenhanger van
 * de nachtelijke cron, app/api/rentman/sync/route.ts). */
export async function syncRentmanInvoicesNow(_state: RentmanAfasState): Promise<RentmanAfasState> {
  await requireAdminScopeWrite("AFAS");
  try {
    const result = await syncRecentRentmanInvoices();
    revalidatePath(PAGE_PATH);
    return { message: `${result.invoiceCount} facturen bijgewerkt.` };
  } catch (error) {
    const message = error instanceof RentmanApiError ? error.message : "Onbekende fout bij ophalen van facturen.";
    return { error: message };
  }
}

/** Verzendt alle geselecteerde projecten naar AFAS. Zolang
 * AFAS_PROJECT_CONNECTOR niet is ingesteld, zet dit elk geselecteerd project
 * op PENDING met een uitlegtekst -- er wordt dan bewust geen AFAS-aanroep
 * gedaan (zie projectSync.ts). */
export async function sendSelectedProjectsNow(_state: RentmanAfasState): Promise<RentmanAfasState> {
  await requireAdminScopeWrite("AFAS");
  const count = await sendSelectedProjectsToAfas();
  revalidatePath(PAGE_PATH);
  return { message: count === 0 ? "Niets geselecteerd om te verzenden." : `${count} project(en) verwerkt, zie status per rij.` };
}

/** Zelfde, voor verkoopfacturen. */
export async function sendSelectedInvoicesNow(_state: RentmanAfasState): Promise<RentmanAfasState> {
  await requireAdminScopeWrite("AFAS");
  const count = await sendSelectedInvoicesToAfas();
  revalidatePath(PAGE_PATH);
  return { message: count === 0 ? "Niets geselecteerd om te verzenden." : `${count} factu(u)r(en) verwerkt, zie status per rij.` };
}
