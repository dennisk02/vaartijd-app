import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, ProjectGroup } from "@prisma/client";

/// Rentman-subprojecten met dit voorvoegsel horen bij administratie 21
/// (Evento); alle andere projecten horen bij administratie 02 (Events). Zie
/// ook lib/rentman/sync.ts en de afspraak met de gebruiker hierover.
const EVENTO_PREFIX = "EVENTO - ";

/// Alleen de velden die de projectkeuze-UI daadwerkelijk gebruikt -- scheelt
/// zowel database- als netwerkverkeer t.o.v. hele rijen ophalen, zeker
/// zodra Rentman-syncs weer honderden inactieve projecten aanleveren.
const PROJECT_OPTION_SELECT = {
  id: true,
  name: true,
  rentmanProjectNumber: true,
  rentmanStartsAt: true,
} satisfies Prisma.ProjectSelect;

type ProjectOption = Prisma.ProjectGetPayload<{ select: typeof PROJECT_OPTION_SELECT }>;

function projectGroupWhere(group: ProjectGroup): Prisma.ProjectWhereInput {
  if (group === "EVENTO") return { name: { startsWith: EVENTO_PREFIX } };
  if (group === "EVENTS") return { NOT: { name: { startsWith: EVENTO_PREFIX } } };
  return {};
}

/**
 * Sorteert projecten op basis van hoe dicht hun Rentman-startdatum bij nu
 * ligt (verleden of toekomst) -- het meest relevante/"recente" project komt
 * zo bovenaan. Projecten zonder startdatum (bv. handmatig aangemaakt) komen
 * achteraan, gesorteerd op naam.
 */
function sortByRecency(projects: ProjectOption[]): ProjectOption[] {
  const now = Date.now();
  return [...projects].sort((a, b) => {
    const distanceA = a.rentmanStartsAt ? Math.abs(a.rentmanStartsAt.getTime() - now) : Infinity;
    const distanceB = b.rentmanStartsAt ? Math.abs(b.rentmanStartsAt.getTime() - now) : Infinity;
    if (distanceA !== distanceB) return distanceA - distanceB;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Geeft de projecten die een medewerker mag kiezen: alleen de actieve,
 * toegewezen projecten als er iets is toegewezen, anders (nog niets
 * toegewezen door de beheerder) alle actieve projecten binnen de
 * projectgroep van de medewerker (Events/Evento/Alle). Binnen beide gevallen
 * staat het project met de dichtstbijzijnde startdatum bovenaan. Filtering
 * (actief + projectgroep) gebeurt in de database-query zelf, niet achteraf
 * in JS.
 */
export async function getProjectOptionsForUser(userId: string, projectGroup: ProjectGroup = "ALL") {
  const assigned = await prisma.project.findMany({
    where: { assignedUsers: { some: { id: userId } }, active: true },
    select: PROJECT_OPTION_SELECT,
  });

  const pool =
    assigned.length > 0
      ? assigned
      : await prisma.project.findMany({
          where: { active: true, ...projectGroupWhere(projectGroup) },
          select: PROJECT_OPTION_SELECT,
        });

  return sortByRecency(pool);
}

/** Zelfde principe als getProjectOptionsForUser, maar dan voor schepen. */
export async function getShipOptionsForUser(userId: string) {
  const select = { id: true, name: true, capacity: true } satisfies Prisma.ShipSelect;

  const assigned = await prisma.ship.findMany({
    where: { assignedUsers: { some: { id: userId } }, active: true },
    orderBy: { name: "asc" },
    select,
  });

  if (assigned.length > 0) return assigned;

  return prisma.ship.findMany({ where: { active: true }, orderBy: { name: "asc" }, select });
}
