"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { syncPendingTimeEntries } from "@/lib/shiftbase/hoursSync";

export type ShiftbaseSyncActionState =
  | {
      message?: string;
      error?: string;
    }
  | undefined;

export async function syncShiftbaseNow(_state: ShiftbaseSyncActionState): Promise<ShiftbaseSyncActionState> {
  await requireAdmin();
  const processed = await syncPendingTimeEntries();
  revalidatePath("/admin/shiftbase");
  revalidatePath("/uren");
  return { message: `${processed} regel(s) verwerkt.` };
}
