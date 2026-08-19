"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isDateSubmitted } from "@/lib/day-submission";
import { todayAtMidnight } from "@/lib/dates";

export async function startTimer(projectId: string, shipId: string | null) {
  const user = await getUser();
  if (!projectId) return { error: "Kies eerst een project." };

  if (await isDateSubmitted(user.id, todayAtMidnight())) {
    return { error: "Deze dag is al ingediend." };
  }

  await prisma.activeTimer.upsert({
    where: { userId: user.id },
    update: { projectId, shipId, startedAt: new Date() },
    create: { userId: user.id, projectId, shipId, startedAt: new Date() },
  });

  revalidatePath("/uren");
  revalidatePath("/");
  return { message: "Timer gestart." };
}

export async function stopTimer(breakMinutes: number) {
  const user = await getUser();

  const active = await prisma.activeTimer.findUnique({ where: { userId: user.id } });
  if (!active) return { error: "Er loopt geen timer." };

  const endTime = new Date();
  const totalMinutes = Math.max(
    0,
    Math.round((endTime.getTime() - active.startedAt.getTime()) / 60000) - Math.max(0, breakMinutes)
  );
  const hours = Math.round((totalMinutes / 60) * 100) / 100;
  const date = new Date(active.startedAt.toISOString().slice(0, 10));

  await prisma.$transaction([
    prisma.timeEntry.create({
      data: {
        userId: user.id,
        projectId: active.projectId,
        shipId: active.shipId,
        date,
        startTime: active.startedAt,
        endTime,
        breakMinutes: Math.max(0, breakMinutes),
        mode: "TIMER",
        hours,
      },
    }),
    prisma.activeTimer.delete({ where: { userId: user.id } }),
  ]);

  revalidatePath("/uren");
  revalidatePath("/");
  return { message: "Uren opgeslagen." };
}

export async function resetTimer() {
  const user = await getUser();
  await prisma.activeTimer.deleteMany({ where: { userId: user.id } });
  revalidatePath("/uren");
  revalidatePath("/");
}
