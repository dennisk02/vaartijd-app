"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function submitDay(dateStr: string) {
  const user = await getUser();
  const date = new Date(dateStr);

  await prisma.daySubmission.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: { submittedAt: new Date() },
    create: { userId: user.id, date, submittedAt: new Date() },
  });

  revalidatePath("/dag-indienen");
  revalidatePath("/geschiedenis");
  revalidatePath("/");
  redirect("/");
}
