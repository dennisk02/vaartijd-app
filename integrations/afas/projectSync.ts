import "server-only";
import { prisma } from "@/lib/prisma";
import { afasFetch, isAfasConfigured, AfasApiError } from "@/integrations/afas/client";

/// Connector-naam bevestigd door Willem van Melis/Royaal (2 sep 2026, zie
/// HANDOVER §10.8): "PtProjects" -- vul die letterlijk in als
/// AFAS_PROJECT_CONNECTOR zodra hij geautoriseerd is voor de Skrepr App
/// Connector (metainfo/update/PtProjects gaf op 2 sep 2026 nog een 500).
const AFAS_PROJECT_CONNECTOR = process.env.AFAS_PROJECT_CONNECTOR;

type ProjectForAfas = {
  projectId: string;
  rentmanProjectNumber: string | null;
  rentmanProjectName: string | null;
};

/// Administratie-routing, letterlijk overgenomen uit de al met de klant
/// afgesproken regel (§10.4/§10.2): naam begint met "EVENTO - " -> 21
/// (Evento), anders -> 02 (Events). Aanname dat dit 1-op-1 AFAS' gevraagde
/// "Projectgroep"-veld is (Willem noemde dat als minimaal verplicht veld,
/// zonder verdere specificatie welke waarden geldig zijn) -- niet apart
/// bevestigd, verifieer zodra de connector actief is.
function projectGroupFor(rentmanProjectName: string | null): string {
  return rentmanProjectName?.startsWith("EVENTO - ") ? "21" : "02";
}

/**
 * Bouwt de payload voor de AFAS PtProjects-UpdateConnector. Willem van Melis/
 * Royaal noemde 3 minimaal benodigde velden (2 sep 2026, geen exacte
 * AFAS-veldcodes): Projectomschrijving, Projectgroep, Projectnummer ("kan
 * ook autonummering gebruikt worden"). Onderstaande veldcodes (Ds/PrGr/PrId)
 * zijn een beste inschatting naar AFAS-conventie -- NIET bevestigd via
 * metainfo (die connector bestaat nog niet voor onze omgeving). Verifieer
 * dit zodra `metainfo/update/PtProjects` beschikbaar is, net zoals bij de
 * uren-connector is gedaan (§10.1).
 *
 * Open vraag voor de klant/Willem: zelf het Rentman-projectnummer
 * meesturen (voor traceerbaarheid/koppeling terug naar Rentman) of AFAS'
 * eigen autonummering laten gebruiken? Nu wordt het Rentman-nummer
 * meegestuurd -- pas aan zodra hierover een keuze is gemaakt.
 */
function mapProjectToAfas(project: ProjectForAfas, connector: string) {
  return {
    [connector]: {
      Element: {
        Fields: {
          Ds: project.rentmanProjectName, // Projectomschrijving
          PrGr: projectGroupFor(project.rentmanProjectName), // Projectgroep
          PrId: project.rentmanProjectNumber, // Projectnummer (of leeg laten voor autonummering)
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
      afasCreateError:
        "AFAS_PROJECT_CONNECTOR is nog niet ingesteld -- PtProjects is bevestigd als benodigde connector (zie HANDOVER §10.8), maar nog niet geautoriseerd voor onze AFAS-omgeving.",
    });
    return;
  }

  try {
    const payload = mapProjectToAfas({ projectId, ...link }, AFAS_PROJECT_CONNECTOR);
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
