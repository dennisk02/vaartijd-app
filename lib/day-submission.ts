import "server-only";
import { prisma } from "@/lib/prisma";

export async function isDateSubmitted(userId: string, date: Date) {
  const record = await prisma.daySubmission.findUnique({
    where: { userId_date: { userId, date } },
    select: { submittedAt: true },
  });
  return Boolean(record?.submittedAt);
}
