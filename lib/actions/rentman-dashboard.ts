"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
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
  await requireAdmin();

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

export type ManualMonthlyEntryState =
  | {
      message?: string;
      error?: string;
    }
  | undefined;

const numberOrNull = (value: FormDataEntryValue | null) => {
  const str = String(value ?? "").trim();
  return str === "" ? null : Number(str);
};

export async function saveManualMonthlyEntry(
  _state: ManualMonthlyEntryState,
  formData: FormData
): Promise<ManualMonthlyEntryState> {
  const user = await requireAdmin();

  const month = String(formData.get("month") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  if (!month || !location) {
    return { error: "Maand en locatie zijn verplicht." };
  }

  await prisma.rentmanManualMonthlyEntry.upsert({
    where: { month_location: { month, location } },
    update: {
      revenueTotal: numberOrNull(formData.get("revenueTotal")),
      deliveryRevenue: numberOrNull(formData.get("deliveryRevenue")),
      pickupRevenue: numberOrNull(formData.get("pickupRevenue")),
      newRequests: numberOrNull(formData.get("newRequests")),
      inOption: numberOrNull(formData.get("inOption")),
      confirmed: numberOrNull(formData.get("confirmed")),
      cancelled: numberOrNull(formData.get("cancelled")),
      note: String(formData.get("note") ?? "").trim() || null,
      updatedById: user.id,
    },
    create: {
      month,
      location,
      revenueTotal: numberOrNull(formData.get("revenueTotal")),
      deliveryRevenue: numberOrNull(formData.get("deliveryRevenue")),
      pickupRevenue: numberOrNull(formData.get("pickupRevenue")),
      newRequests: numberOrNull(formData.get("newRequests")),
      inOption: numberOrNull(formData.get("inOption")),
      confirmed: numberOrNull(formData.get("confirmed")),
      cancelled: numberOrNull(formData.get("cancelled")),
      note: String(formData.get("note") ?? "").trim() || null,
      updatedById: user.id,
    },
  });

  revalidatePath("/admin/rentman-financieel");
  return { message: "Opgeslagen." };
}
