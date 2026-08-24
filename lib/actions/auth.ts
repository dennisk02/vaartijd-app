"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  createPendingTotpSession,
  getPendingTotpSession,
  clearPendingTotpSession,
  deleteSession,
} from "@/lib/session";
import { verifyTotpToken } from "@/lib/totp";
import { LoginFormSchema, type LoginFormState, type TotpFormState } from "@/lib/definitions";

export async function login(_state: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password } = validatedFields.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { message: "Onjuiste combinatie van e-mailadres en wachtwoord." };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { message: "Onjuiste combinatie van e-mailadres en wachtwoord." };
  }

  // 2FA is verplicht voor alle accounts. Al ingesteld -> eerst de TOTP-code
  // verifiëren (tussenstap-cookie, nog geen volledige sessie). Nog niet
  // ingesteld -> wél meteen een volledige sessie (er is nog niets om tegen
  // te verifiëren), maar proxy.ts dwingt vervolgens /2fa-instellen af
  // totdat de instelprocedure is afgerond.
  if (user.totpEnabled) {
    await createPendingTotpSession({ userId: user.id });
    redirect("/2fa-verify");
  }

  await createSession({ userId: user.id, role: user.role, totpEnabled: false });
  redirect("/2fa-instellen");
}

export async function verifyTotpLogin(_state: TotpFormState, formData: FormData): Promise<TotpFormState> {
  const pending = await getPendingTotpSession();
  if (!pending?.userId) {
    redirect("/login");
  }

  const code = String(formData.get("code") ?? "").trim();

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user || !user.active || !user.totpEnabled || !user.totpSecret) {
    redirect("/login");
  }

  if (!verifyTotpToken(user.totpSecret, code)) {
    return { message: "Onjuiste code. Probeer opnieuw." };
  }

  await clearPendingTotpSession();
  await createSession({ userId: user.id, role: user.role, totpEnabled: true });
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
