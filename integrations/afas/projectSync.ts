import "server-only";
import { prisma } from "@/lib/prisma";
import { afasFetch, isAfasConfigured, AfasApiError } from "@/integrations/afas/client";

/// Nog geen geautoriseerde AFAS-UpdateConnector voor projectaanmaak (zie
/// HANDOVER §10.4/§10.8) -- alleen de env-naam staat al vast, zodat Willem
/// straks enkel de connector zelf hoeft vrij te geven + de naam hier in te
/// vullen, zonder codewijziging.
const AFAS_PROJECT_CONNECTOR = process.env.AFAS_PROJECT_CONNECTOR;

type ProjectForAfas = {
  projectId: string;
  rentmanProjectNumber: string | null;
  rentmanProjectName: string | null;
};

/**
 * Bouwt de payload voor de (nog niet bestaande) AFAS-projectaanmaak-
 * connector. LET OP: dit is een beste-inschatting-structuur naar analogie
 * van de uren-connector (integrations/afas/hoursSync.ts) -- in tegenstelling
 * tot die connector is dit veldnamenschema NIET bevestigd via AFAS' eigen
 * metainfo-endpoint (die bestaat pas zodra de connector geautoriseerd is).
 * Verifieer/pas dit aan zodra `metainfo/update/<connector>` beschikbaar is.
 */
function mapProjectToAfas(project: ProjectForAfas) {
  return {
    [AFAS_PROJECT_CONNECTOR ?? "Project"]: {
      Element: {
        Fields: {
          // Aanname: projectomschrijving + extern kenmerk (Rentman-nummer)
          // -- veldnamen (Ds/BcCo/PrId of vergelijkbaar) nog te bevestigen.
          Ds: project.rentmanProjectName,
          ExternalId: project.rentmanProjectNumber,
        },
      },
    },
  };
}

async function updateStatus(
  projectId: string,
  data: { afasCreateStatus: "PENDING" | "SYNCED" | "ERROR"; afasCreateSyncedAt?: Date; afasCreateError?: string | null }
) {
  await prisma.projectRentmanLink.update({ where: { projectId }, data });
}

export async function sendProjectToAfas(projectId: string) {
  const link = await prisma.projectRentmanLink.findUnique({
    where: { projectId },
    select: { rentmanProjectNumber: true, rentmanProjectName: true },
  });
  if (!link) return;

  if (!isAfasConfigured() || !AFAS_PROJECT_CONNECTOR) {
    await updateStatus(projectId, {
      afasCreateStatus: "PENDING",
      afasCreateError: "AFAS_PROJECT_CONNECTOR is nog niet ingesteld -- wacht op een geautoriseerde connector (zie HANDOVER §10.8).",
    });
    return;
  }

  try {
    const payload = mapProjectToAfas({ projectId, ...link });
    await afasFetch(`connectors/${AFAS_PROJECT_CONNECTOR}`, { method: "POST", body: payload });
    await updateStatus(projectId, { afasCreateStatus: "SYNCED", afasCreateSyncedAt: new Date(), afasCreateError: null });
  } catch (error) {
    const message = error instanceof AfasApiError ? error.message : "Onbekende fout bij aanmaken project in AFAS.";
    await updateStatus(projectId, { afasCreateStatus: "ERROR", afasCreateError: message });
  }
}

/** Verzendt alle geselecteerde (afasCreateRequestedAt gezet, nog niet SYNCED) projecten. */
export async function sendSelectedProjectsToAfas() {
  const rows = await prisma.projectRentmanLink.findMany({
    where: { afasCreateRequestedAt: { not: null }, afasCreateStatus: { not: "SYNCED" } },
    select: { projectId: true },
  });
  for (const row of rows) {
    await sendProjectToAfas(row.projectId);
  }
  return rows.length;
}
