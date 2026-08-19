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

type RentmanListResponse = {
  data: RentmanSubproject[];
  itemCount: number;
  limit: number;
  offset: number;
  // Niet altijd aanwezig in de praktijk (soms geheel afwezig i.p.v. null) --
  // gebruik daarom nooit als enige paginerings-signaal, zie onder.
  next_page_url?: string | null;
};

/**
 * Haalt alle subprojecten uit Rentman op (met paginering). Als `sinceModified`
 * is gegeven, worden alleen subprojecten opgehaald die sindsdien gewijzigd
 * zijn (incrementele sync) -- `modified` is geen "generated" veld in Rentman,
 * dus hier kan wel op gefilterd worden (in tegenstelling tot planperiod_*).
 */
export async function fetchAllSubprojects({ sinceModified }: { sinceModified?: string } = {}) {
  const token = process.env.RENTMAN_API_TOKEN;
  if (!token) {
    throw new RentmanApiError("Rentman-koppeling is niet geconfigureerd (RENTMAN_API_TOKEN ontbreekt).");
  }

  const results: RentmanSubproject[] = [];
  let offset = 0;
  const limit = 300;

  while (true) {
    const params = new URLSearchParams({
      expand: "project,status",
      fields: "id,name,project,status,planperiod_start,planperiod_end,modified",
      limit: String(limit),
      offset: String(offset),
    });

    if (sinceModified) {
      // Rentman verwacht dit als losse top-level querysleutel, niet als
      // JSON-gecodeerde `filter`-parameter (die geeft een 400 "Unknown
      // property 'filter'") -- bevestigd via een directe test tegen de
      // live API.
      params.set("modified[gte]", sinceModified);
    }

    const response = await fetch(`${RENTMAN_BASE}/subprojects?${params}`, {
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
      console.error("Rentman-aanroep mislukt:", {
        status: response.status,
        body: parsedBody,
        tokenLength: token.length,
        hadSinceModified: Boolean(sinceModified),
        sinceModified,
      });
      throw new RentmanApiError(`Rentman-aanroep mislukt (HTTP ${response.status}).`, {
        status: response.status,
        body: parsedBody,
      });
    }

    const json = parsedBody as RentmanListResponse;
    results.push(...json.data);

    // `next_page_url` bleek in de praktijk niet betrouwbaar aanwezig (soms
    // volledig afwezig i.p.v. null, ook als er meer pagina's zijn) -- de
    // enige robuuste stopconditie is dat een pagina minder items teruggeeft
    // dan de gevraagde limiet.
    if (json.data.length < limit) break;
    offset += limit;
  }

  return results;
}
