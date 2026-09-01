"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScopeWrite } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { syncRentmanDashboard } from "@/integrations/rentman/dashboardSync";
import { RentmanApiError } from "@/integrations/rentman/client";

export type RentmanDashboardSyncState =
  | {
      message?: string;
      error?: string;
    }
  | undefined;

export async function syncRentmanDashboardNow(
  _state: RentmanDashboardSyncState
): Promise<RentmanDashboardSyncState> {
  await requireAdminScopeWrite("RENTMAN_FINANCIEEL");

  try {
    const result = await syncRentmanDashboard();
    revalidatePath("/admin/rentman-financieel");
    return {
      message: `${result.subprojectCount} subprojecten verwerkt over ${result.monthCount} maanden, ${result.pendingCount} in optie/aanvraag, ${result.invoiceCount} facturen.`,
    };
  } catch (error) {
    console.error("Onverwachte fout bij Rentman-dashboardsync:", error);
    const message = error instanceof RentmanApiError ? error.message : "Onbekende fout bij berekenen van het dashboard.";
    return { error: message };
  }
}

/** Selecteert/deselecteert een Rentman-project als "klaar om door te zetten
 * naar AFAS" -- puur een wachtrij/checklist (§10.4/§17): er is nog geen
 * geautoriseerde AFAS-UpdateConnector voor projectaanmaak, dus dit doet
 * bewust geen echte AFAS-aanroep. */
export async function toggleAfasCreateRequested(projectId: string, requested: boolean) {
  await requireAdminScopeWrite("RENTMAN_FINANCIEEL");
  await prisma.projectRentmanLink.update({
    where: { projectId },
    data: { afasCreateRequestedAt: requested ? new Date() : null },
  });
  revalidatePath("/admin/rentman-financieel");
}

