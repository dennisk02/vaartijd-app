import "server-only";

export class ShiftbaseApiError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, options?: { status?: number; body?: unknown }) {
    super(message);
    this.name = "ShiftbaseApiError";
    this.status = options?.status;
    this.body = options?.body;
  }
}

function getShiftbaseConfig() {
  const apiKey = process.env.SHIFTBASE_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.SHIFTBASE_BASE_URL || "https://api.shiftbase.com/api";
  return { apiKey, baseUrl };
}

export function isShiftbaseConfigured() {
  return getShiftbaseConfig() !== null;
}

/**
 * Of de (schrijvende) urenexport mag draaien. Staat los van
 * `isShiftbaseConfigured()`: de API-sleutel kan prima aanwezig en geldig
 * zijn (leesverkeer werkt dan al) terwijl het `/timesheets`-endpoint en de
 * veldnamen in `integrations/shiftbase/hoursSync.ts` nog niet bevestigd zijn tegen de
 * echte Shiftbase-API. Zet `SHIFTBASE_HOURS_EXPORT_ENABLED=true` pas nadat
 * dat via de verkenner op /admin/shiftbase is geverifieerd.
 */
export function isShiftbaseHoursExportEnabled() {
  return process.env.SHIFTBASE_HOURS_EXPORT_ENABLED === "true";
}

/**
 * Doet een read-only GET-aanroep naar de Shiftbase REST API. `pathAndQuery`
 * is het pad + eventuele querystring zoals gedocumenteerd op
 * developer.shiftbase.com, bv. `/timesheets?min_date=2026-07-01&max_date=2026-07-07`.
 *
 * We laten het pad bewust vrij invulbaar (in plaats van vaste endpoints
 * hard te coderen), omdat nog niet vaststaat welke velden Shiftbase precies
 * teruggeeft en hoe die zich verhouden tot projecten in Vaartijd.
 */
export async function shiftbaseGet(pathAndQuery: string) {
  const config = getShiftbaseConfig();
  if (!config) {
    throw new ShiftbaseApiError("Shiftbase-koppeling is niet geconfigureerd (SHIFTBASE_API_KEY ontbreekt).");
  }

  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const url = `${config.baseUrl}${path}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      // Shiftbase verwacht dit letterlijk als "Authorization: API <key>" --
      // bevestigd tegen de echte API; een "Api-Key"-header (wat hier eerder
      // stond, ongeverifieerd) wordt genegeerd en geeft een 401.
      Authorization: `API ${config.apiKey}`,
      Accept: "application/json",
    },
  });

  const rawBody = await response.text();
  let parsedBody: unknown = rawBody;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Shiftbase geeft bij sommige fouten platte tekst/HTML terug.
  }

  if (!response.ok) {
    throw new ShiftbaseApiError(`Shiftbase-aanroep mislukt (HTTP ${response.status}).`, {
      status: response.status,
      body: parsedBody,
    });
  }

  return parsedBody;
}

/**
 * Schrijvende aanroep naar Shiftbase (bv. voor de urenexport). Gebruikt
 * dezelfde configuratie/authenticatie als `shiftbaseGet` -- pas dit samen met
 * `shiftbaseGet` aan als blijkt dat Shiftbase voor deze aanroepen een andere
 * authenticatiewijze verwacht.
 */
export async function shiftbasePost(pathAndQuery: string, body: unknown) {
  const config = getShiftbaseConfig();
  if (!config) {
    throw new ShiftbaseApiError("Shiftbase-koppeling is niet geconfigureerd (SHIFTBASE_API_KEY ontbreekt).");
  }

  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const url = `${config.baseUrl}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `API ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawBody = await response.text();
  let parsedBody: unknown = rawBody;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Shiftbase geeft bij sommige fouten platte tekst/HTML terug.
  }

  if (!response.ok) {
    throw new ShiftbaseApiError(`Shiftbase-aanroep mislukt (HTTP ${response.status}).`, {
      status: response.status,
      body: parsedBody,
    });
  }

  return parsedBody;
}
