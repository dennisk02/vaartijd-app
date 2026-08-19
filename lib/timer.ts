import "server-only";
import { prisma } from "@/lib/prisma";

export async function getActiveTimer(userId: string) {
  return prisma.activeTimer.findUnique({
    where: { userId },
    include: { project: true, ship: true },
  });
}
