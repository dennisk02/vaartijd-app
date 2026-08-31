"use server";

import { requireAdminScope } from "@/lib/dal";
import { shiftbaseGet, ShiftbaseApiError } from "@/integrations/shiftbase/client";

export type ShiftbaseQueryState =
  | {
      result?: string;
      error?: string;
    }
  | undefined;

export async function queryShiftbase(_state: ShiftbaseQueryState, formData: FormData): Promise<ShiftbaseQueryState> {
  await requireAdminScope("SHIFTBASE");

  const path = String(formData.get("path") || "").trim();
  if (!path) {
    return { error: "Vul een pad in, bijvoorbeeld /timesheets?min_date=2026-07-01&max_date=2026-07-07." };
  }

  try {
    const data = await shiftbaseGet(path);
    return { result: JSON.stringify(data, null, 2) };
  } catch (error) {
    const message = error instanceof ShiftbaseApiError ? error.message : "Onbekende fout bij het bevragen van Shiftbase.";
    const body = error instanceof ShiftbaseApiError && error.body ? `\n\n${JSON.stringify(error.body, null, 2)}` : "";
    return { error: `${message}${body}` };
  }
}
