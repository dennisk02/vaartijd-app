"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { AppLanguage } from "@/lib/i18n";

export async function setLanguage(language: AppLanguage) {
  const user = await getUser();
  await prisma.user.update({ where: { id: user.id }, data: { language } });
  revalidatePath("/");
}
