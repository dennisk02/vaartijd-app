import "server-only";
import { prisma } from "@/lib/prisma";
import { fetchAllSubprojects, type RentmanSubproject } from "@/lib/rentman/client";

/// Alleen subprojecten met een van deze statussen worden als actief (dus
/// kiesbaar voor urenregistratie) getoond. Alle andere statussen -- ook nieuwe
/// die hier niet in staan -- worden inactief gehouden/gemaakt.
const INCLUDED_STATUSES = [
  "Bevestigd",
  "Klaargezet",
  "Op locatie",
  "Schoonmaken & nakijken",
  "Retour ophalen",
];
const SYNC_STATE_KEY = "rentman_projects_last_modified";

function mapToInternalProject(subproject: RentmanSubproject) {
  const statusName = subproject.status?.name ?? null;

  return {
    rentmanSubprojectId: String(subproject.id),
    name: subproject.name,
    rentmanProjectName: subproject.project?.name ?? null,
    // Rentman geeft dit veld terug als getal, niet als string -- expliciet
    // omzetten (Prisma verwacht hier een String).
    rentmanProjectNumber:
      subproject.project?.number !== undefined && subproject.project?.number !== null
        ? String(subproject.project.number)
        : null,
    rentmanStatus: statusName,
    rentmanStartsAt: subproject.planperiod_start ? new Date(subproject.planperiod_start) : null,
    rentmanEndsAt: subproject.planperiod_end ? new Date(subproject.planperiod_end) : null,
    // Zodra de status van een subproject verandert (bv. van "Op locatie" naar
    // "Retour verwerkt"), wordt het project bij de volgende sync automatisch
    // weer inactief gezet -- ook als het al eerder actief was.
    active: INCLUDED_STATUSES.includes(statusName ?? ""),
  };
}

export async function syncRentmanProjects() {
  const state = await prisma.syncState.findUnique({ where: { key: SYNC_STATE_KEY } });
  const subprojects = await fetchAllSubprojects({ sinceModified: state?.value });

  let highestModified = state?.value;

  for (const subproject of subprojects) {
    const mapped = mapToInternalProject(subproject);
    await prisma.project.upsert({
      where: { rentmanSubprojectId: mapped.rentmanSubprojectId },
      update: mapped,
      create: mapped,
    });

    if (subproject.modified && (!highestModified || subproject.modified > highestModified)) {
      highestModified = subproject.modified;
    }
  }

  if (highestModified) {
    await prisma.syncState.upsert({
      where: { key: SYNC_STATE_KEY },
      update: { value: highestModified },
      create: { key: SYNC_STATE_KEY, value: highestModified },
    });
  }

  return { count: subprojects.length, lastModified: highestModified ?? null };
}

export async function getRentmanSyncState() {
  return prisma.syncState.findUnique({ where: { key: SYNC_STATE_KEY } });
}
