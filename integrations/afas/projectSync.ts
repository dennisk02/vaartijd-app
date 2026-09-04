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
  rentmanBusinessUnit: string | null;
  rentmanStartsAt: Date | null;
  rentmanEndsAt: Date | null;
};

/// AFAS-Projectgroep per business unit -- bevestigd door de klant (2 sep
/// 2026, na een eerste testboeking die de eerdere 02/21-aanname afwees:
/// AFAS gaf "De ingevulde waarde bij 'Projectgroep' bestaat niet.").
/// `rentmanBusinessUnit` komt uit ProjectRentmanLink (§10.5/§10.8,
/// `businessUnitFor()` in integrations/rentman/client.ts) en is altijd één
/// van deze drie waarden. Onbekend/leeg (zou niet moeten voorkomen) valt
/// terug op "EV".
const PROJECT_GROUP_BY_BUSINESS_UNIT: Record<string, string> = {
  EVENTO: "EO",
  "M&R Kampen": "EV",
  "M&R Utrecht": "EVU",
};

function projectGroupFor(rentmanBusinessUnit: string | null): string {
  return (rentmanBusinessUnit && PROJECT_GROUP_BY_BUSINESS_UNIT[rentmanBusinessUnit]) || "EV";
}

/// AFAS-Administratie (UnFi) per business unit -- een ANDER veld dan
/// Projectgroep (PrGp) hierboven, bevestigd via screenshots van de klant uit
/// AFAS' eigen "Alle projecten"-overzicht (3 sep 2026): Evento-projecten
/// hebben Administratie 21, Events(-achtige)/M&R Kampen-projecten
/// Administratie 2 (let op: bare integer, niet "02"). Dit is toevallig de
/// oorspronkelijke 02/21-aanname die eerder verkeerd op Projectgroep werd
/// toegepast -- die hoorde dus bij dit veld. M&R Utrecht bevestigd door de
/// klant (3 sep 2026): ook 2, zelfde als M&R Kampen.
const ADMINISTRATIE_BY_BUSINESS_UNIT: Record<string, number> = {
  EVENTO: 21,
  "M&R Kampen": 2,
  "M&R Utrecht": 2,
};

function administratieFor(rentmanBusinessUnit: string | null): number | undefined {
  return rentmanBusinessUnit ? ADMINISTRATIE_BY_BUSINESS_UNIT[rentmanBusinessUnit] : undefined;
}

/// AFAS-Team (TeId) per business unit -- namen doorgegeven door de klant
/// (3 sep 2026): Evento-projecten krijgen "Evento Event Rentals",
/// Events-projecten (zowel M&R Kampen als M&R Utrecht) krijgen "Moods &
/// Roots Events B.V.". Vrij tekstveld in AFAS (geen waardenlijst in
/// metainfo), dus de schrijfwijze moet letterlijk overeenkomen met een
/// bestaand Team. **Getest (3 sep 2026): "Moods & Roots Events B.V." werd
/// afgewezen** ("De ingevulde waarde bij 'Team' bestaat niet.") -- de
/// M&R-kant klopt dus nog niet exact (spatie/leesteken/andere schrijfwijze?
/// niet gegokt, aan de klant gevraagd). "Evento Event Rentals" is nog niet
/// apart getest.
const TEAM_BY_BUSINESS_UNIT: Record<string, string> = {
  EVENTO: "Evento Event Rentals",
  "M&R Kampen": "Moods & Roots Events B.V.",
  "M&R Utrecht": "Moods & Roots Events B.V.",
};

function teamFor(rentmanBusinessUnit: string | null): string | undefined {
  return rentmanBusinessUnit ? TEAM_BY_BUSINESS_UNIT[rentmanBusinessUnit] : undefined;
}

/**
 * Bouwt de payload voor de AFAS PtProject-UpdateConnector. Veldcodes
 * bevestigd via `metainfo/update/PtProject` (2 sep 2026, zie HANDOVER
 * §10.8), aangevuld op basis van screenshots van een handmatig aangemaakt
 * project in AFAS' "Alle projecten"-overzicht (3 sep 2026):
 * - `Ds` (Omschrijving), `PrGp` (Projectgroep, **verplicht**), `PrId`
 *   (Project/projectnummer) -- al eerder bevestigd/getest.
 * - `UnFi` (Administratie), `TeId` (Team), `DaSt` (Begindatum), `DtGp`
 *   (Datum gereed planning) -- nieuw, zie hierboven/hieronder.
 * - `Ch`/`Inst`/`DeRe`/`InPr`/`RePr` (Doorbelasten/Termijnfacturen/Pakbonnen
 *   naar nacalculatie/twee factuurvoorstel-vlaggen) -- op alle geziene
 *   voorbeeldprojecten stonden deze uit; expliciet op `false` gezet i.p.v.
 *   op een aanname over AFAS' eigen default te vertrouwen.
 *
 * **Nog NIET gevuld, bewust:**
 * - `BcCo`/`DbId` (Organisatie/Persoon resp. Verkooprelatie/debiteur) --
 *   wacht op de debiteur-koppeling (§10.8, Rentman-debiteurnummers komen
 *   niet overeen met AFAS; vraag ligt bij Willem).
 * - `EmId`/`CdPl` (Projectleider) -- stond op de meeste voorbeeldrijen ook
 *   leeg, dus niet als verplicht beschouwd; zou eventueel uit Rentmans
 *   `project.account_manager` afgeleid kunnen worden, maar dat vereist weer
 *   een aparte Rentman-crew-naar-AFAS-medewerker-koppeling (niet aangevraagd).
 */
function mapProjectToAfas(project: ProjectForAfas, connector: string) {
  const administratie = administratieFor(project.rentmanBusinessUnit);
  const team = teamFor(project.rentmanBusinessUnit);
  return {
    [connector]: {
      Element: {
        Fields: {
          Ds: project.rentmanProjectName,
          PrGp: projectGroupFor(project.rentmanBusinessUnit),
          PrId: project.rentmanProjectNumber,
          ...(administratie !== undefined ? { UnFi: administratie } : {}),
          ...(team !== undefined ? { TeId: team } : {}),
          ...(project.rentmanStartsAt ? { DaSt: project.rentmanStartsAt.toISOString().slice(0, 10) } : {}),
          ...(project.rentmanEndsAt ? { DtGp: project.rentmanEndsAt.toISOString().slice(0, 10) } : {}),
          Ch: false,
          Inst: false,
          DeRe: false,
          InPr: false,
          RePr: false,
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
    select: {
      rentmanProjectNumber: true,
      rentmanProjectName: true,
      rentmanBusinessUnit: true,
      rentmanStartsAt: true,
      rentmanEndsAt: true,
    },
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
