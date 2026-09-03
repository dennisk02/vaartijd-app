import "server-only";
import { prisma } from "@/lib/prisma";
import { afasFetch, isAfasConfigured, afasErrorMessage } from "@/integrations/afas/client";

/// Connector geautoriseerd door Willem van Melis/Royaal (2 sep 2026, zie
/// HANDOVER §10.8): **"PtProject"** (enkelvoud -- niet "PtProjects", zoals
/// eerder abusievelijk aangenomen op basis van Willems eigen tekst; de
/// juiste naam is bevestigd via metainfo, die dit keer wél 200 gaf). Vul die
/// letterlijk in als AFAS_PROJECT_CONNECTOR.
const AFAS_PROJECT_CONNECTOR = process.env.AFAS_PROJECT_CONNECTOR;

type ProjectForAfas = {
  projectId: string;
  rentmanProjectNumber: string | null;
  rentmanProjectName: string | null;
};

/// Administratie-routing, letterlijk overgenomen uit de al met de klant
/// afgesproken regel (§10.4/§10.2): naam begint met "EVENTO - " -> 21
/// (Evento), anders -> 02 (Events). Aanname dat dit 1-op-1 AFAS' verplichte
/// "Projectgroep"-veld (PrGp) is -- dat veld is in de metainfo een vrij
/// tekstveld (geen vaste waardenlijst), dus AFAS zelf legt niet vast welke
/// codes geldig zijn. Niet apart bevestigd, verifieer bij de eerste
/// testboeking.
function projectGroupFor(rentmanProjectName: string | null): string {
  return rentmanProjectName?.startsWith("EVENTO - ") ? "21" : "02";
}

/**
 * Bouwt de payload voor de AFAS PtProject-UpdateConnector. Veldcodes
 * bevestigd via `metainfo/update/PtProject` (2 sep 2026, zie HANDOVER
 * §10.8): `Ds` (Omschrijving, string 100), `PrGp` (Projectgroep, string 15,
 * **verplicht**), `PrId` (Project/projectnummer, string 15, niet verplicht
 * -- AFAS accepteert dit veld leeg en nummert dan zelf). Op uitdrukkelijk
 * verzoek van de klant (2 sep 2026) wordt het Rentman-projectnummer altijd
 * zelf meegestuurd (voor traceerbaarheid/koppeling terug naar Rentman) --
 * geen AFAS-autonummering.
 */
function mapProjectToAfas(project: ProjectForAfas, connector: string) {
  return {
    [connector]: {
      Element: {
        Fields: {
          Ds: project.rentmanProjectName,
          PrGp: projectGroupFor(project.rentmanProjectName),
          PrId: project.rentmanProjectNumber,
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
        "AFAS_PROJECT_CONNECTOR is nog niet ingesteld -- PtProject is geautoriseerd (zie HANDOVER §10.8), maar de env-variabele staat nog niet op productie/lokaal.",
    });
    return;
  }

  try {
    const payload = mapProjectToAfas({ projectId, ...link }, AFAS_PROJECT_CONNECTOR);
    await afasFetch(`connectors/${AFAS_PROJECT_CONNECTOR}`, { method: "POST", body: payload });
    await updateStatus(projectId, { afasCreateStatus: "SYNCED", afasCreateSyncedAt: new Date(), afasCreateError: null });
  } catch (error) {
    const message = afasErrorMessage(error, "Onbekende fout bij aanmaken project in AFAS.");
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
