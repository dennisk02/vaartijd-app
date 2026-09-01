"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScopeWrite } from "@/lib/dal";
import { syncRentmanProjects } from "@/integrations/rentman/sync";
import { RentmanApiError } from "@/integrations/rentman/client";

export type RentmanActionState =
  | {
      message?: string;
      error?: string;
    }
  | undefined;

export async function syncRentmanNow(_state: RentmanActionState): Promise<RentmanActionState> {
  await requireAdminScopeWrite("RENTMAN");

  try {
    const result = await syncRentmanProjects();
    revalidatePath("/admin/rentman");
    revalidatePath("/admin/projects");
    return { message: `${result.count} project(en) verwerkt.` };
  } catch (error) {
    if (!(error instanceof RentmanApiError)) {
      // Onverwachte fout (bv. een databasefout) -- loggen zodat dit in de
      // servergegevens terug te vinden is, niet alleen als generieke melding.
      console.error("Onverwachte fout bij Rentman-sync:", error);
    }
    const message = error instanceof RentmanApiError ? error.message : "Onbekende fout bij synchroniseren met Rentman.";
    return { error: message };
  }
}
