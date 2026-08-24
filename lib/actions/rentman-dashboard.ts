"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScope } from "@/lib/dal";
import { syncRentmanDashboard } from "@/lib/rentman/dashboardSync";
import { RentmanApiError } from "@/lib/rentman/client";

export type RentmanDashboardSyncState =
  | {
      message?: string;
      error?: string;
    }
  | undefined;

export async function syncRentmanDashboardNow(
  _state: RentmanDashboardSyncState
): Promise<RentmanDashboardSyncState> {
  await requireAdminScope("RENTMAN_FINANCIEEL");

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

