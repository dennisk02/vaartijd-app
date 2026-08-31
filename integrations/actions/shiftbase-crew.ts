"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScope } from "@/lib/dal";
import { syncShiftbaseCrew } from "@/integrations/shiftbase/sync";
import { ShiftbaseApiError } from "@/integrations/shiftbase/client";

export type ShiftbaseCrewSyncState =
  | {
      message?: string;
      error?: string;
    }
  | undefined;

export async function syncShiftbaseCrewNow(_state: ShiftbaseCrewSyncState): Promise<ShiftbaseCrewSyncState> {
  await requireAdminScope("SHIFTBASE");

  try {
    const result = await syncShiftbaseCrew();
    revalidatePath("/admin/shiftbase");
    revalidatePath("/admin/ships");
    revalidatePath("/admin/projects");
    revalidatePath("/admin/users");
    return {
      message:
        `${result.departments} schepen/projecten, ${result.users} medewerkers verwerkt. ` +
        `Uren: ${result.timesheets.processed} verwerkt, ${result.timesheets.skippedNotApproved} nog niet goedgekeurd overgeslagen, ` +
        `${result.timesheets.skippedNoShip} zonder gekoppeld schip, ${result.timesheets.skippedNoUser} zonder gekoppelde medewerker.`,
    };
  } catch (error) {
    console.error("Onverwachte fout bij Shiftbase-vaarbemanning-import:", error);
    const message =
      error instanceof ShiftbaseApiError ? error.message : "Onbekende fout bij importeren vanuit Shiftbase.";
    return { error: message };
  }
}
