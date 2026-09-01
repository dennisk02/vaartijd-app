"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScopeWrite } from "@/lib/dal";
import { syncPendingTimeEntries } from "@/integrations/shiftbase/hoursSync";
import { isShiftbaseHoursExportEnabled } from "@/integrations/shiftbase/client";

export type ShiftbaseSyncActionState =
  | {
      message?: string;
      error?: string;
    }
  | undefined;

export async function syncShiftbaseNow(_state: ShiftbaseSyncActionState): Promise<ShiftbaseSyncActionState> {
  await requireAdminScopeWrite("SHIFTBASE");

  if (!isShiftbaseHoursExportEnabled()) {
    return {
      error:
        "Urenexport naar Shiftbase staat uit -- het endpoint/de veldnamen zijn nog niet geverifieerd. " +
        "Bevestig eerst via de verkenner hieronder en zet dan SHIFTBASE_HOURS_EXPORT_ENABLED=true.",
    };
  }

  const processed = await syncPendingTimeEntries();
  revalidatePath("/admin/shiftbase");
  revalidatePath("/uren");
  return { message: `${processed} regel(s) verwerkt.` };
}
