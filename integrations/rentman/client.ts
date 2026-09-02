import "server-only";

export class RentmanApiError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, options?: { status?: number; body?: unknown }) {
    super(message);
    this.name = "RentmanApiError";
    this.status = options?.status;
    this.body = options?.body;
  }
}

const RENTMAN_BASE = "https://api.rentman.net";

export function isRentmanConfigured() {
  return Boolean(process.env.RENTMAN_API_TOKEN);
}

export type RentmanSubproject = {
  id: number | string;
  name: string;
  project?: { name?: string; number?: number | string } | null;
  status?: { name?: string } | null;
  planperiod_start?: string | null;
  planperiod_end?: string | null;
  modified?: string | null;
};

type RentmanListResponse<T> = {
  data: T[];
  itemCount: number;
  limit: number;
  offset: number;
  // Niet altijd aanwezig in de praktijk (soms geheel afwezig i.p.v. null) --
  // gebruik daarom nooit als enige paginerings-signaal, zie onder.
  next_page_url?: string | null;
};

/**
 * Generieke, gepagineerde GET tegen de Rentman-API. `next_page_url` bleek in
 * de praktijk niet betrouwbaar aanwezig (soms volledig afwezig i.p.v. null,
 * ook als er meer pagina's zijn) -- de enige robuuste stopconditie is dat een
 * pagina minder items teruggeeft dan de gevraagde limiet.
 */
async function rentmanFetchAll<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const token = process.env.RENTMAN_API_TOKEN;
  if (!token) {
    throw new RentmanApiError("Rentman-koppeling is niet geconfigureerd (RENTMAN_API_TOKEN ontbreekt).");
  }

  const results: T[] = [];
  let offset = 0;
  const limit = 300;

  while (true) {
    const query = new URLSearchParams({ ...params, limit: String(limit), offset: String(offset) });

    const response = await fetch(`${RENTMAN_BASE}/${path}?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const rawBody = await response.text();
    let parsedBody: unknown = rawBody;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      // Rentman geeft bij fouten soms platte tekst terug.
    }

    if (!response.ok) {
      // Tijdelijk uitgebreide logging (geen tokenwaarde) om een omgevingsspecifiek
      // verschil tussen lokaal en productie te kunnen diagnosticeren.
      console.error("Rentman-aanroep mislukt:", { path, status: response.status, body: parsedBody, tokenLength: token.length });
      throw new RentmanApiError(`Rentman-aanroep mislukt (HTTP ${response.status}).`, {
        status: response.status,
        body: parsedBody,
      });
    }

    const json = parsedBody as RentmanListResponse<T>;
    results.push(...json.data);

    if (json.data.length < limit) break;
    offset += limit;
  }

  return results;
}

/**
 * Haalt alle subprojecten uit Rentman op (met paginering). Als `sinceModified`
 * is gegeven, worden alleen subprojecten opgehaald die sindsdien gewijzigd
 * zijn (incrementele sync) -- `modified` is geen "generated" veld in Rentman,
 * dus hier kan wel op gefilterd worden (in tegenstelling tot planperiod_*).
 */
export async function fetchAllSubprojects({ sinceModified }: { sinceModified?: string } = {}) {
  const params: Record<string, string> = {
    expand: "project,status",
    fields: "id,name,project,status,planperiod_start,planperiod_end,modified",
  };
  if (sinceModified) {
    // Rentman verwacht dit als losse top-level querysleutel, niet als
    // JSON-gecodeerde `filter`-parameter (die geeft een 400 "Unknown
    // property 'filter'") -- bevestigd via een directe test tegen de
    // live API.
    params["modified[gte]"] = sinceModified;
  }
  return rentmanFetchAll<RentmanSubproject>("subprojects", params);
}

export type RentmanFinancialSubproject = {
  id: number | string;
  name: string;
  // "number" en "project_type" zitten op het bovenliggende Project, niet op
  // het Subproject zelf -- vandaar expand=project.project_type hieronder
  // (project_type is nodig voor de "Categorie"-classificatie, §10.5).
  project?: { number?: number | string; project_type?: { name?: string } | null } | null;
  status?: { name?: string } | null;
  planperiod_start?: string | null;
  planperiod_end?: string | null;
  created?: string | null;
  project_total_price?: number | string | null;
  // Voor geannuleerde subprojecten zet Rentman `project_total_price` op 0 --
  // dit gegenereerde veld behoudt het offertebedrag van vóór de annulering
  // en is dus de juiste bron voor "gederfde omzet" (bevestigd via live data:
  // een geannuleerd subproject had project_total_price=0 maar
  // project_total_price_cancelled=356.615).
  project_total_price_cancelled?: number | string | null;
  already_invoiced?: number | string | null;
  // Magazijn/stocklocation-koppeling, bv. "/stocklocations/4" -- bepaalt de
  // business unit (M&R Kampen/M&R Utrecht) als de projectnaam niet met
  // "EVENTO" begint. Bevestigd via live Rentman-data (§10.5).
  asset_location_from?: string | null;
  // Contact-locatie van het subproject; alleen `visit_city`/`mailing_city`
  // worden gebruikt (voor de "Locatie"-kolom) -- de rest van dit (grote)
  // contact-object wordt genegeerd.
  location?: { visit_city?: string | null; mailing_city?: string | null } | null;
};

/**
 * Voor het financiële dashboard (§10.5): alle subprojecten met hun omzet/
 * facturatiecijfers, ongeacht status -- bewust geen incrementeel filter,
 * dit draait elke nacht als een verse, volledige berekening. Zie
 * integrations/rentman/dashboardSync.ts.
 *
 * Beperkt tot `year` (aanmaakjaar) -- zonder deze filter haalt dit ALLE
 * subprojecten sinds het begin van het Rentman-account op (in de praktijk
 * duizenden, teruggaand tot 2023), wat het dashboard vervuilt met oude,
 * allang afgeronde projecten (en soms rare facturatiepercentages door latere
 * prijscorrecties op oude, al afgesloten projecten).
 *
 * `expand=project.project_type,status,location` levert de volledige geneste
 * Project- resp. Contact-objecten op (Rentman filtert `fields=` niet door
 * naar geëxpandeerde relaties) -- merkbaar zwaardere respons dan voorheen,
 * maar bij ~800 subprojecten/jaar nog steeds ruim binnen de 5MB-limiet.
 */
export async function fetchAllSubprojectsFinancial(year: number) {
  return rentmanFetchAll<RentmanFinancialSubproject>("subprojects", {
    expand: "project.project_type,status,location",
    fields:
      "id,name,project,status,planperiod_start,planperiod_end,created,project_total_price,project_total_price_cancelled,already_invoiced,asset_location_from,location",
    "created[gte]": `${year}-01-01T00:00:00+00:00`,
    "created[lt]": `${year + 1}-01-01T00:00:00+00:00`,
  });
}

export type RentmanInvoiceForDashboard = {
  id: number | string;
  date?: string | null;
  price?: number | string | null;
};

/** Alle facturen (excl. BTW-bedrag `price`) van `year` voor het "Maandoverleg"-scherm. */
export async function fetchAllInvoicesForDashboard(year: number) {
  return rentmanFetchAll<RentmanInvoiceForDashboard>("invoices", {
    fields: "id,date,price",
    "date[gte]": `${year}-01-01T00:00:00+00:00`,
    "date[lt]": `${year + 1}-01-01T00:00:00+00:00`,
  });
}

export type RentmanInvoiceForExport = {
  id: number | string;
  date?: string | null;
  displayname?: string | null;
  price?: number | string | null;
  price_invat?: number | string | null;
  project?: { number?: number | string; name?: string } | null;
  customer?: { name?: string } | null;
};

/**
 * Facturen sinds `sinceIso` met project/klant erbij geëxpandeerd, voor het
 * "Verkoopfacturen naar AFAS"-overzicht (§18). `displayname` en `price_invat`
 * zijn "generated" velden in Rentman -- niet filterbaar/sorteerbaar, maar wel
 * gewoon opvraagbaar via `fields=`, bevestigd via een live testaanroep
 * (2 sep 2026).
 */
export async function fetchRecentInvoicesForExport(sinceIso: string) {
  return rentmanFetchAll<RentmanInvoiceForExport>("invoices", {
    expand: "project,customer",
    fields: "id,date,displayname,price,price_invat,project,customer",
    "date[gte]": sinceIso,
  });
}

export type RentmanInvoiceFile = {
  id: number | string;
  file_item?: number | string | null;
  file_itemtype?: string | null;
};

/**
 * Alle Factuur-gekoppelde files sinds `sinceIso`, voor het koppelen van een
 * PDF aan elke factuur uit fetchRecentInvoicesForExport (via `file_item` =
 * factuur-id). Platte querysleutels (`file_itemtype=Factuur`), geen
 * `filter[...]`-wrapper -- die laatste geeft een 400 "Wrong syntax in query"
 * (bevestigd via een live test, 2 sep 2026).
 */
export async function fetchAllInvoiceFilesSince(sinceIso: string) {
  return rentmanFetchAll<RentmanInvoiceFile>("files", {
    fields: "id,file_item,file_itemtype",
    file_itemtype: "Factuur",
    "created[gte]": sinceIso,
  });
}

/**
 * Tijdelijke, getekende download-URL (S3, ~10 uur geldig) voor één file-ID --
 * bevestigd te werken met het gewone RENTMAN_API_TOKEN, geen MCP/gebruikers-
 * login nodig (in tegenstelling tot een eerdere, onjuiste aanname in
 * HANDOVER §10.4, gecorrigeerd 2 sep 2026).
 */
export async function fetchInvoiceFileUrl(fileId: string): Promise<string | null> {
  const token = process.env.RENTMAN_API_TOKEN;
  if (!token) return null;

  const response = await fetch(`${RENTMAN_BASE}/files/${fileId}?fields=id,url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;

  const body = (await response.json()) as { data?: { url?: string } };
  return body.data?.url ?? null;
}

export type RentmanInvoiceLine = {
  id: number | string;
  ledgercode?: string | null;
  ledger?: { displayname?: string | null } | null;
  vatrate?: number | null;
  vatamount?: number | null;
  priceincl?: number | null;
};

/**
 * Factuurregels van één factuur -- LET OP: dit zijn (per Rentmans eigen
 * resource-omschrijving, bevestigd via een live testaanroep, 2 sep 2026)
 * **gegenereerde grootboek-/btw-samenvattingsregels** ("Omzet verhuurde
 * materialen"/8060, "Omzet transport"/8064, "Verzekering"/8068, ...), NIET
 * de product-/dienstregels die op de factuur-PDF staan (dat hangt af van het
 * gebruikte documentsjabloon en is niet via de API terug te halen). Voor de
 * AFAS-pakbon-koppeling (§10.8, FbDeliveryNote) is dat juist bruikbaar: elke
 * regel heeft al een grootboekcode + btw-tarief, precies wat een boeking
 * nodig heeft -- de productdetails blijven zichtbaar via de bijgevoegde PDF.
 * Bereikbaar via `/invoices/{id}/invoicelines`, bevestigd met het gewone
 * RENTMAN_API_TOKEN (geen aparte top-level resource nodig).
 */
export async function fetchInvoiceLines(invoiceId: string): Promise<RentmanInvoiceLine[]> {
  const token = process.env.RENTMAN_API_TOKEN;
  if (!token) return [];

  const response = await fetch(
    `${RENTMAN_BASE}/invoices/${invoiceId}/invoicelines?fields=id,ledgercode,vatrate,vatamount,priceincl&expand=ledger`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return [];

  const body = (await response.json()) as { data?: RentmanInvoiceLine[] };
  return body.data ?? [];
}
