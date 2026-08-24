"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { verifyTotpToken } from "@/lib/totp";
import type { TotpFormState } from "@/lib/definitions";

/**
 * Bevestigt de verplichte TOTP-instelprocedure (zie app/2fa-instellen). Zet
 * bij een geldige code het onbevestigde secret definitief vast en herstelt
 * de sessie-cookie met `totpEnabled: true`, zodat proxy.ts niet langer naar
 * /2fa-instellen terugstuurt.
 */
export async function confirmTotpSetup(_state: TotpFormState, formData: FormData): Promise<TotpFormState> {
  const user = await getUser();

  if (user.totpEnabled) {
    redirect("/");
  }

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { totpSecretPending: true } });
  if (!record?.totpSecretPending) {
    return { message: "Start de instelprocedure opnieuw door de pagina te verversen." };
  }

  const code = String(formData.get("code") ?? "").trim();
  if (!verifyTotpToken(record.totpSecretPending, code)) {
    return { message: "Onjuiste code. Probeer opnieuw." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: record.totpSecretPending, totpSecretPending: null, totpEnabled: true },
  });

  await createSession({ userId: user.id, role: user.role, totpEnabled: true });
  redirect("/");
}
