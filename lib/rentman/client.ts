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
  // "number" zit op het bovenliggende Project, niet op het Subproject zelf --
  // vandaar expand=project hieronder (zelfde patroon als fetchAllSubprojects).
  project?: { number?: number | string } | null;
  status?: { name?: string } | null;
  planperiod_start?: string | null;
  created?: string | null;
  project_total_price?: number | string | null;
  already_invoiced?: number | string | null;
};

/**
 * Voor het financiële dashboard (§10.5): alle subprojecten met hun omzet/
 * facturatiecijfers, ongeacht status -- bewust geen incrementeel filter,
 * dit draait elke nacht als een verse, volledige berekening. Zie
 * lib/rentman/dashboardSync.ts.
 *
 * Beperkt tot `year` (aanmaakjaar) -- zonder deze filter haalt dit ALLE
 * subprojecten sinds het begin van het Rentman-account op (in de praktijk
 * duizenden, teruggaand tot 2023), wat het dashboard vervuilt met oude,
 * allang afgeronde projecten (en soms rare facturatiepercentages door latere
 * prijscorrecties op oude, al afgesloten projecten).
 */
export async function fetchAllSubprojectsFinancial(year: number) {
  return rentmanFetchAll<RentmanFinancialSubproject>("subprojects", {
    expand: "project,status",
    fields: "id,name,project,status,planperiod_start,created,project_total_price,already_invoiced",
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
