import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, ProjectGroup } from "@prisma/client";

/// EVENTS_EVENTO/RIVER_ROOTS-onderscheid is gebaseerd op herkomst (wel/niet
/// een `ProjectShiftbaseLink`/`ShipShiftbaseLink`), niet op naam -- zie de
/// ProjectGroup-enum-comment in prisma/schema.prisma. Het "EVENTO - "-
/// naamvoorvoegsel is een aparte, interne regel voor Rentman-
/// administratieroutering (02 Events / 21 Evento, zie `EVENTO_PREFIX` in
/// lib/rentman/sync.ts) en speelt geen rol meer in deze zichtbaarheidskeuze.
///
/// Sinds de integratiekoppelingen losgemaakt zijn van Project/Ship (§10.6,
/// 27 aug 2026) leest deze kernlogica de koppeltabellen via een relatie i.p.v.
/// platte kolommen -- functioneel ongewijzigd, alleen de queryvorm is anders.

/// Alleen de velden die de projectkeuze-UI daadwerkelijk gebruikt -- scheelt
/// zowel database- als netwerkverkeer t.o.v. hele rijen ophalen, zeker
/// zodra Rentman-syncs weer honderden inactieve projecten aanleveren.
const PROJECT_OPTION_SELECT = {
  id: true,
  name: true,
  rentmanLink: { select: { rentmanProjectNumber: true, rentmanStartsAt: true } },
} satisfies Prisma.ProjectSelect;

type ProjectOption = Prisma.ProjectGetPayload<{ select: typeof PROJECT_OPTION_SELECT }>;

function projectGroupWhere(group: ProjectGroup): Prisma.ProjectWhereInput {
  return group === "RIVER_ROOTS" ? { shiftbaseLink: { isNot: null } } : { shiftbaseLink: null };
}

function shipGroupWhere(group: ProjectGroup): Prisma.ShipWhereInput {
  return group === "RIVER_ROOTS" ? { shiftbaseLink: { isNot: null } } : { shiftbaseLink: null };
}

/**
 * Sorteert projecten op basis van hoe dicht hun Rentman-startdatum bij nu
 * ligt (verleden of toekomst) -- het meest relevante/"recente" project komt
 * zo bovenaan. Projecten zonder startdatum (bv. handmatig aangemaakt, of geen
 * Rentman-herkomst) komen achteraan, gesorteerd op naam.
 */
function sortByRecency(projects: ProjectOption[]): ProjectOption[] {
  const now = Date.now();
  return [...projects].sort((a, b) => {
    const startA = a.rentmanLink?.rentmanStartsAt ?? null;
    const startB = b.rentmanLink?.rentmanStartsAt ?? null;
    const distanceA = startA ? Math.abs(startA.getTime() - now) : Infinity;
    const distanceB = startB ? Math.abs(startB.getTime() - now) : Infinity;
    if (distanceA !== distanceB) return distanceA - distanceB;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Geeft de projecten die een medewerker mag kiezen: alleen de actieve,
 * toegewezen projecten als er iets is toegewezen, anders (nog niets
 * toegewezen door de beheerder) alle actieve projecten binnen de
 * projectgroep van de medewerker (Events & Evento / River Roots). Binnen
 * beide gevallen staat het project met de dichtstbijzijnde startdatum
 * bovenaan. Filtering (actief + projectgroep) gebeurt in de database-query
 * zelf, niet achteraf in JS.
 */
export async function getProjectOptionsForUser(userId: string, projectGroup: ProjectGroup = "EVENTS_EVENTO") {
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
export async function getShipOptionsForUser(userId: string, projectGroup: ProjectGroup = "EVENTS_EVENTO") {
  const select = { id: true, name: true, capacity: true } satisfies Prisma.ShipSelect;

  const assigned = await prisma.ship.findMany({
    where: { assignedUsers: { some: { id: userId } }, active: true },
    orderBy: { name: "asc" },
    select,
  });

  if (assigned.length > 0) return assigned;

  return prisma.ship.findMany({
    where: { active: true, ...shipGroupWhere(projectGroup) },
    orderBy: { name: "asc" },
    select,
  });
}
