"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScope, requireAdminScopeWrite } from "@/lib/dal";
import { syncPendingTimeEntries } from "@/integrations/afas/hoursSync";
import { testAfasConnection, AfasApiError } from "@/integrations/afas/client";

export type AfasActionState =
  | {
      message?: string;
      error?: string;
    }
  | undefined;

export async function syncNow(_state: AfasActionState): Promise<AfasActionState> {
  await requireAdminScopeWrite("AFAS");
  const processed = await syncPendingTimeEntries();
  revalidatePath("/admin/afas");
  revalidatePath("/uren");
  return { message: `${processed} regel(s) verwerkt.` };
}

export async function testConnection(_state: AfasActionState): Promise<AfasActionState> {
  await requireAdminScope("AFAS");
  try {
    await testAfasConnection();
    return { message: "Verbinding met AFAS is gelukt." };
  } catch (error) {
    const message = error instanceof AfasApiError ? error.message : "Onbekende fout bij het testen van de verbinding.";
    return { error: message };
  }
}
