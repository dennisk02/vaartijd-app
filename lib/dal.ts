import "server-only";
import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
import { getSessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { AdminScope } from "@prisma/client";

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
      adminScopes: true,
      totpEnabled: true,
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

/**
 * Toegang tot één specifiek admin-onderdeel: volledige beheerders (`role
 * === "ADMIN"`) omzeilen deze check altijd; overige gebruikers moeten
 * `scope` expliciet toegewezen hebben gekregen (`adminScopes`, zie
 * app/admin/users/[id]/page.tsx). Gebruikt door elke `/admin/<sectie>`-
 * pagina en de bijbehorende server actions, i.p.v. het alles-of-niets
 * `requireAdmin()` hierboven.
 */
export async function requireAdminScope(scope: AdminScope) {
  const user = await getUser();
  if (user.role !== "ADMIN" && !user.adminScopes.includes(scope)) {
    forbidden();
  }
  return user;
}

/** Toegang tot de admin-shell zelf: minstens één onderdeel toegewezen. */
export async function requireAnyAdminScope() {
  const user = await getUser();
  if (user.role !== "ADMIN" && user.adminScopes.length === 0) {
    forbidden();
  }
  return user;
}

/**
 * Niet-gooiende variant van requireAdminScope, voor de externe
 * cron/secret-trigger-routes (app/api/*\/sync, .../crew-import) -- die
 * gebruiken hun eigen secret-gebaseerde autorisatie als primair pad en deze
 * check alleen als terugval voor een ingelogde beheerderssessie, dus een
 * boolean i.p.v. forbidden()/redirect() past daar beter bij dan de
 * page-georiënteerde requireAdminScope hierboven.
 */
export async function userHasAdminScope(userId: string, scope: AdminScope) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, adminScopes: true } });
  if (!user) return false;
  return user.role === "ADMIN" || user.adminScopes.includes(scope);
}
