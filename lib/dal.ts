import "server-only";
import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
import { getSessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const verifySession = cache(async () => {
  const session = await getSessionPayload();
  if (!session?.userId) {
    redirect("/login");
  }
  return { userId: session.userId, role: session.role };
});

export const getUser = cache(async () => {
  const session = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      afasEmployeeNumber: true,
      language: true,
      active: true,
      canLogOccupancy: true,
      canLogMeals: true,
      canLogWaste: true,
      useDefaultProject: true,
      defaultProjectId: true,
      projectGroup: true,
      defaultProject: { select: { id: true, name: true } },
    },
  });

  if (!user || !user.active) {
    redirect("/login");
  }

  return user;
});

export async function requireAdmin() {
  const user = await getUser();
  if (user.role !== "ADMIN") {
    forbidden();
  }
  return user;
}
